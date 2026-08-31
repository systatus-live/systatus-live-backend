import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { existsSync, readFileSync } from 'fs';
import * as path from 'path';
import ping from "ping";
import * as tls from 'tls';
import { Worker } from 'worker_threads';
import formatDate from 'src/utils/formatDate';
import { DataSource, In, Repository } from 'typeorm';
import { IncidentEntity } from '../database/entities/IncidentEntity';
import { IntegrationTemplateEntity } from '../database/entities/IntegrationTemplateEntity';
import { MonitorHistoryEntity } from '../database/entities/MonitorHistoryEntity';
import { MonitorIntegrationEntity } from '../database/entities/MonitorIntegrationEntity';
import { ChatPlatformEnum, ChatPlatformTypeEnum } from '../types/ChatPlatformEnum';
import { CronIntervalEnum } from '../types/CronIntervalEnum';
import { getHttpStatusKey, HttpStatusCode, HttpStatusCodeLabel } from '../types/HttpStatusCode';
import { MonitorTypeEnum } from '../types/MonitorTypeEnum';
import { PlanEnum } from '../types/PlanEnum';
import { SubscriptionStatusEnum } from '../types/SubscriptionStatusEnum';
import formatSince from '../utils/formatSince';
import getCurrentDate from '../utils/getCurrenDate';
import { IntegrationService } from './integration.service';

@Injectable()
export class MonitorService {
  private readonly logger = new Logger(MonitorService.name);
  private readonly runningIntervals = new Set<CronIntervalEnum>();
  private readonly tlsCa: string[];

  @InjectRepository(MonitorIntegrationEntity) private monitorIntegrationRepository: Repository<MonitorIntegrationEntity>
  @InjectRepository(MonitorHistoryEntity) private monitorHistoryRepository: Repository<MonitorHistoryEntity>
  @InjectRepository(IncidentEntity) private monitorIncidentRepository: Repository<IncidentEntity>
  @InjectRepository(IntegrationTemplateEntity) private integrationTemplateRepository: Repository<IntegrationTemplateEntity>

  constructor(
    private integrationService: IntegrationService,
    private dataSource: DataSource
  ) {
    const caPath = process.env.NODE_EXTRA_CA_CERTS;
    this.tlsCa = (caPath && existsSync(caPath)) ? [...tls.rootCertificates, readFileSync(caPath, "utf8")] : [...tls.rootCertificates];
  }

  @Cron(CronIntervalEnum.EVERY_1_MINUTE, {
    name: `monitor-1-minutes`,
    timeZone: "America/Sao_Paulo"
  })
  schedule1MinutesMonitor() {
    this.checkMonitors(CronIntervalEnum.EVERY_1_MINUTE);
  }

  @Cron(CronIntervalEnum.EVERY_5_MINUTES, {
    name: `monitor-5-minutes`,
    timeZone: "America/Sao_Paulo"
  })
  schedule5MinutesMonitor() {
    this.checkMonitors(CronIntervalEnum.EVERY_5_MINUTES);
  }

  @Cron(CronIntervalEnum.EVERY_30_MINUTES, {
    name: `monitor-30-minutes`,
    timeZone: "America/Sao_Paulo"
  })
  schedule30MinutesMonitor() {
    this.checkMonitors(CronIntervalEnum.EVERY_30_MINUTES);
  }

  @Cron(CronIntervalEnum.EVERY_1_HOUR, {
    name: `monitor-1-hour`,
    timeZone: "America/Sao_Paulo"
  })
  schedule1HourMonitor() {
    this.checkMonitors(CronIntervalEnum.EVERY_1_HOUR);
  }

  @Cron(CronIntervalEnum.EVERY_12_HOURS, {
    name: `monitor-12-hours`,
    timeZone: "America/Sao_Paulo"
  })
  schedule12HoursMonitor() {
    this.checkMonitors(CronIntervalEnum.EVERY_12_HOURS);
  }

  @Cron(CronIntervalEnum.EVERY_24_HOURS, {
    name: `monitor-24-hours`,
    timeZone: "America/Sao_Paulo"
  })
  schedule24HoursMonitor() {
    this.checkMonitors(CronIntervalEnum.EVERY_24_HOURS);
  }

  @Cron(CronIntervalEnum.EVERY_24_HOURS, {
    name: `rotate-monitor-history`,
    timeZone: "America/Sao_Paulo"
  })
  async scheduleRotateMonitorHistory() {
    try {
      this.logger.log(`Iniciando rotação do histórico de monitores.`);

      await this.dataSource.transaction(async (manager) => {
        await manager.query(`
          create temp table monitor_historical_keep on commit drop as
            with current_subscription as (
              select distinct on (user_id) user_id, plan_id
              from subscriptions
              order by user_id, created_at desc
            )
            select mh.*
            from monitor_historical mh
            join monitors mon on mon.id = mh.monitor_id
            join current_subscription cs on cs.user_id = mon.created_user_id
            join plans p on p.id = cs.plan_id
            where
              (p.name = '${PlanEnum.ANDORINHA}' and mh.created_at >= now() - interval '30 days')
              or (p.name = '${PlanEnum.CORUJA}' and mh.created_at >= now() - interval '90 days')
              or (p.name = '${PlanEnum.AGUIA}' and mh.created_at >= now() - interval '180 days')
        `);

        await manager.query(`truncate table monitor_historical`);

        await manager.query(`insert into monitor_historical select * from monitor_historical_keep`);
      });

      this.logger.log(`Rotação do histórico de monitores concluída.`);
    } catch (error) {
      this.logger.error(`Erro ao rotar histórico de monitores: ${error.message}`);
    }
  }

  private async checkMonitors(cron: CronIntervalEnum) {
    if (this.runningIntervals.has(cron)) {
      this.logger.warn(`${cron} skipped - previous execution still running`);
      return;
    }

    this.runningIntervals.add(cron);

    try {
      const monitorList = await this.dataSource.query(`
        select mon.*
        from monitors mon
        join intervals val on val.id = mon.interval_id
        where mon.active = true
        and val.cron = '${cron}'
        order by mon.created_at asc
      `);

      this.logger.log(`${cron} started for ${monitorList.length} monitors.`);

      const concurrency = 10;
      for (let i = 0; i < monitorList.length; i += concurrency) {
        const chunk = monitorList.slice(i, i + concurrency);
        await Promise.all(chunk.map(monitor => this.processMonitor(monitor)));
      }
    } finally {
      this.runningIntervals.delete(cron);
    }
  }

  private runHttpWorker(address: string, requestHeaders: Record<string, string>): Promise<any> {
    return new Promise((resolve, reject) => {
      const isCompiledJs = __filename.endsWith(".js");
      const workerPath = path.join(
        __dirname,
        `../workers/http-monitor.worker${isCompiledJs ? ".js" : ".ts"}`
      );
      const workerOptions: any = {
        workerData: {
          address: address,
          tlsCa: this.tlsCa,
          requestHeaders: requestHeaders
        }
      };
      if (!isCompiledJs) {
        workerOptions.execArgv = ["-r", "ts-node/register"];
      }
      const worker = new Worker(workerPath, workerOptions);
      worker.once("message", (result) => {
        resolve(result);
      });
      worker.once("error", (err) => {
        reject(err);
      });
      worker.once("exit", (code) => {
        if (code !== 0) {
          reject(new Error(`Worker exited with code ${code}`));
        }
      });
    });
  }

  private async processMonitor(monitor: any) {
    this.logger.log(`Checking ${monitor.name} (${monitor.id})`);

    try {
      let newStatus: string = HttpStatusCode.UNKNOWN.toString();
      let totalMs: number | null = null;
      let requestHeaders: any = null;
      let responseHeaders: any = null;
      let dnsMs: number | null = null;
      let tcpMs: number | null = null;
      let tlsMs: number | null = null;
      let ttfbMs: number | null = null;
      let pingPacketLoss: number | null = null;
      let pingAvgMs: number | null = null;
      let pingMinMs: number | null = null;
      let pingMaxMs: number | null = null;

      switch (monitor.type) {
        case MonitorTypeEnum.HTTP:
          requestHeaders = {
            "Cache-Control": "no-cache",
            "Connection": "close",
            "Referer": monitor.address,
            "User-Agent": "Systatus.live (https://systatus.live)"
          };

          try {
            new URL(monitor.address);
          } catch {
            newStatus = HttpStatusCode.UNKNOWN.toString();
            break;
          }

          try {
            const result = await this.runHttpWorker(monitor.address, requestHeaders);

            if (result.error) {
              const code: string = result.code;
              if (["ENOTFOUND", "EAI_AGAIN"].includes(code)) {
                newStatus = HttpStatusCode.NOT_FOUND.toString();
              } else if (code === "ECONNREFUSED") {
                newStatus = HttpStatusCode.SERVICE_UNAVAILABLE.toString();
              } else if (["UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT", "ETIMEDOUT"].includes(code)) {
                newStatus = HttpStatusCode.REQUEST_TIMEOUT.toString();
              } else if (code.startsWith("ERR_TLS") || code.startsWith("CERT_") || ["DEPTH_ZERO_SELF_SIGNED_CERT", "UNABLE_TO_VERIFY_LEAF_SIGNATURE"].includes(code)) {
                newStatus = HttpStatusCode.BAD_GATEWAY.toString();
              } else {
                newStatus = HttpStatusCode.UNKNOWN.toString();
              }
              responseHeaders = null;
            } else {
              newStatus = result.statusCode;
              dnsMs = result.dnsMs;
              tcpMs = result.tcpMs;
              tlsMs = result.tlsMs;
              ttfbMs = result.ttfbMs;
              totalMs = result.totalMs;
              responseHeaders = result.responseHeaders;
            }
          } catch {
            newStatus = HttpStatusCode.UNKNOWN.toString();
            responseHeaders = null;
          }
          break;
        case MonitorTypeEnum.PING:
          try {
            const pingResponse = await ping.promise.probe(monitor.address, {
              timeout: 10
            });

            if (pingResponse.alive) {
              newStatus = HttpStatusCode.OK.toString();
            } else if (pingResponse.output.includes("Destination Host Unreachable")) {
              newStatus = HttpStatusCode.SERVICE_UNAVAILABLE.toString();
            } else if (parseFloat(pingResponse.packetLoss) == 100) {
              newStatus = HttpStatusCode.REQUEST_TIMEOUT.toString()
            } else if (pingResponse.output.includes("Name or service not known")) {
              newStatus = HttpStatusCode.NOT_FOUND.toString()
            }

            pingPacketLoss = parseFloat(parseFloat(pingResponse.packetLoss).toFixed(2));
            pingAvgMs = pingResponse.avg != "unknown" ? parseFloat(parseFloat(pingResponse.avg).toFixed(2)) : null;
            pingMinMs = pingResponse.min != "unknown" ? parseFloat(parseFloat(pingResponse.min).toFixed(2)) : null;
            pingMaxMs = pingResponse.max != "unknown" ? parseFloat(parseFloat(pingResponse.max).toFixed(2)) : null;
            totalMs = pingAvgMs;
          } catch (error) {
            newStatus = HttpStatusCode.UNKNOWN.toString();
          }
          break;
        default:
          break;
      }

      let [monitorIncident, monitorHistory] = await Promise.all([
        this.monitorIncidentRepository.findOne({
          where: {
            monitor_id: monitor.id,
            active: true
          },
        }),
        this.monitorHistoryRepository.findOne({
          where: {
            monitor_id: monitor.id
          },
          order: {
            created_at: "DESC"
          }
        })
      ]);

      let notifyType: "OK" | "FAILURE" | null = null;

      if (monitorHistory) { // has previous check
        if (monitorHistory.status.startsWith("2") && !newStatus.startsWith("2")) { // went down
          notifyType = "FAILURE";
        } else if (!monitorHistory.status.startsWith("2") && newStatus.startsWith("2")) { // went up
          notifyType = "OK";
        }
      } else if (!monitorHistory && !newStatus.startsWith("2")) { // first check and is down
        notifyType = "FAILURE";
      }

      // Incident + history salvos atomicamente para evitar estado inconsistente
      await this.dataSource.transaction(async (manager) => {
        if (notifyType) {
          const incidentIsActive = notifyType == "FAILURE";

          const payload: Partial<IncidentEntity> = {
            id: monitorIncident?.id,
            monitor_id: monitor.id,
            active: incidentIsActive
          }

          if (!incidentIsActive) {
            payload.ended_at = formatDate(getCurrentDate(), "YYYY-MM-DD HH:mm:ssZZ");
          }

          monitorIncident = await manager.save(IncidentEntity, payload);
          if (monitorIncident?.id) {
            monitorIncident = await manager.findOne(IncidentEntity, {
              where: {
                id: monitorIncident.id
              }
            });
          }
        }

        await manager.save(MonitorHistoryEntity, {
          monitor_id: monitor.id,
          incident_id: monitorIncident?.id,
          status: newStatus,
          total_ms: totalMs,
          request_headers: requestHeaders ? JSON.parse(JSON.stringify(requestHeaders)) : null,
          response_headers: responseHeaders ? JSON.parse(JSON.stringify(responseHeaders)) : null,
          dns_ms: dnsMs,
          tcp_ms: tcpMs,
          tls_ms: tlsMs,
          ttfb_ms: ttfbMs,
          ping_packet_loss: pingPacketLoss,
          ping_avg_ms: pingAvgMs,
          ping_min_ms: pingMinMs,
          ping_max_ms: pingMaxMs
        });
      });

      if (notifyType) {
        const integrationList = await this.monitorIntegrationRepository.find({
          where: {
            monitor_id: monitor.id
          },
          relations: ["integration", "integration.chatPlatform"]
        });

        const allTemplates = integrationList.length > 0
          ? await this.integrationTemplateRepository.find({
            where: {
              integration_id: In(integrationList.map(m => m.integration.id))
            },
            select: ["integration_id", "down_template", "up_template"]
          })
          : [];


        const templateVars: Record<string, string> = {
          monitor: monitor.name,
          address: monitor.address,
          status_code: newStatus,
          status_description: HttpStatusCodeLabel[getHttpStatusKey(newStatus)] ?? newStatus,
          downtime: notifyType === "OK" && monitorIncident ? formatSince(monitorIncident.created_at, "YYYY-MM-DD HH:mm:ssZ") : "",
          datetime: formatDate(getCurrentDate(), "DD/MM/YYYY HH:mm:ss")
        };

        for await (let { integration } of integrationList) {
          let title = `🟢 ${monitor.name} ficou disponível`;
          let description = `🟢 ${monitor.name} (${monitor.address}) ficou disponível.`;

          if (notifyType == "FAILURE") {
            title = `🔴 ${monitor.name} ficou indisponível`;
            description = `🔴 ${monitor.name} (${monitor.address}) ficou indisponível: ${HttpStatusCodeLabel[getHttpStatusKey(newStatus)]}.`;
          }

          if (notifyType == "OK" && monitorIncident) {
            description += ` Downtime: ${formatSince(monitorIncident.created_at, "YYYY-MM-DD HH:mm:ssZ")}.`;
          }

          if (integration.chatPlatform.type === ChatPlatformTypeEnum.WEBHOOK) {
            const template = allTemplates.find(t => t.integration_id === integration.id);
            const templateField = notifyType === "FAILURE" ? "down_template" : "up_template";

            if (template?.[templateField]) {
              description = this.integrationService.renderTemplate(template[templateField]!, templateVars);
            }
          }

          const footer = `Systatus.Live - ${formatDate(getCurrentDate(), "DD/MM/YYYY HH:mm:ss")}`;

          try {
            switch (integration.chatPlatform.name) {
              case ChatPlatformEnum.DISCORD:
                await this.integrationService.sendDiscordWebhook(integration.address, "", description, footer, notifyType == "OK" ? "#7CB342" : "#F44336");
                break;
              case ChatPlatformEnum.GOOGLE_CHAT:
                if (monitor.address.startsWith("http")) {
                  description = description.replace(monitor.address, `<a href="${monitor.address}">${monitor.address}</a>`);
                }
                await this.integrationService.sendGoogleChatWebhook(integration.address, "", description, footer);
                break;
              case ChatPlatformEnum.SLACK:
                await this.integrationService.sendSlackWebhook(integration.address, "", description, footer, notifyType == "OK" ? "#7CB342" : "#F44336");
                break;
              case ChatPlatformEnum.WHATSAPP:
                if (notifyType == "OK") {
                  await this.integrationService.sendWhatsApp("systatus_monitor_up", integration.address, `${monitor.name} (${monitor.address})`, `${HttpStatusCodeLabel[getHttpStatusKey(newStatus)]}`, formatSince(monitorIncident!.created_at, "YYYY-MM-DD HH:mm:ssZ"));
                } else {
                  await this.integrationService.sendWhatsApp("systatus_monitor_down", integration.address, `${monitor.name} (${monitor.address})`, `${HttpStatusCodeLabel[getHttpStatusKey(newStatus)]}`, "");
                }
                break;
              case ChatPlatformEnum.EMAIL:
                await this.integrationService.sendMonitorEmail(integration.address, title, notifyType === "OK", monitor.name, monitor.address, newStatus, totalMs, monitorIncident?.created_at ?? null);
                break;
              default:
                break;
            }
          } catch (error) {
            this.logger.error(`Error sending notification for monitor ID: ${monitor.id} via integration ID: ${integration.id}: ${error.message}`);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Global error ${error.message}`);
    }
  }

}
