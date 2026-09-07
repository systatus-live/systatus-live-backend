import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { execFile } from 'child_process';
import { promisify } from 'util';
import ping from "ping";
import formatDate from 'src/utils/formatDate';
import { DataSource, In, Repository } from 'typeorm';
import { IncidentEntity } from '../database/entities/IncidentEntity';
import { IntegrationTemplateEntity } from '../database/entities/IntegrationTemplateEntity';
import { MonitorHistoryEntity } from '../database/entities/MonitorHistoryEntity';
import { MonitorIntegrationEntity } from '../database/entities/MonitorIntegrationEntity';
import { ChatPlatformEnum, ChatPlatformTypeEnum } from '../types/ChatPlatformEnum';
import { CronIntervalEnum } from '../types/CronIntervalEnum';
import { getHttpStatusKey, HttpStatusCode, HttpStatusCodeLabel } from '../types/HttpStatusCode';
import { MonitorHistoryStatusEnum } from '../types/MonitorHistoryStatusEnum';
import { MonitorTypeEnum } from '../types/MonitorTypeEnum';
import { PlanEnum } from '../types/PlanEnum';
import formatSince from '../utils/formatSince';
import getCurrentDate from '../utils/getCurrenDate';
import { IntegrationService } from './integration.service';

const execFileAsync = promisify(execFile);

@Injectable()
export class MonitorService {
  private readonly logger = new Logger(MonitorService.name);
  private readonly runningIntervals = new Set<CronIntervalEnum>();

  @InjectRepository(MonitorIntegrationEntity) private monitorIntegrationRepository: Repository<MonitorIntegrationEntity>
  @InjectRepository(MonitorHistoryEntity) private monitorHistoryRepository: Repository<MonitorHistoryEntity>
  @InjectRepository(IncidentEntity) private monitorIncidentRepository: Repository<IncidentEntity>
  @InjectRepository(IntegrationTemplateEntity) private integrationTemplateRepository: Repository<IntegrationTemplateEntity>

  constructor(
    private integrationService: IntegrationService,
    private dataSource: DataSource
  ) { }

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

  private async processMonitor(monitor: any) {
    this.logger.log(`Checking ${monitor.name} (${monitor.id})`);

    try {
      let newHttpStatus: string = HttpStatusCode.UNKNOWN.toString();
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
        case MonitorTypeEnum.HTTP: {
          const toMs = (seconds: number): number => parseFloat((seconds * 1000).toFixed(2));

          requestHeaders = {
            "Cache-Control": "no-cache",
            "Connection": "close",
            "Referer": monitor.address,
            "User-Agent": "Systatus (https://systatus.live)"
          };

          try {
            const curlArgs = [
              "-X", "HEAD",
              "-I",
              "-s",
              "--max-time", "10",
              "--insecure",
              "-L",
              "--max-redirs", "3",
              ...Object.entries(requestHeaders).flatMap(([key, value]) => ["-H", `${key}: ${value}`]),
              "-w", `\n---CURL-METRICS---\n{"status":"%{http_code}","dns":%{time_namelookup},"tcp":%{time_connect},"tls":%{time_appconnect},"ttfb":%{time_starttransfer},"total":%{time_total}}`,
              monitor.address
            ];

            const { stdout } = await execFileAsync("curl", curlArgs);
            const separatorIndex = stdout.indexOf("\n---CURL-METRICS---\n");

            if (separatorIndex == -1) {
              newHttpStatus = HttpStatusCode.UNKNOWN.toString();
            } else {
              const headersRaw = stdout.slice(0, separatorIndex);
              const metricsRaw = stdout.slice(separatorIndex + "\n---CURL-METRICS---\n".length).trim();
              const metrics = JSON.parse(metricsRaw);

              newHttpStatus = metrics.status.toString();
              dnsMs = toMs(metrics.dns);
              tcpMs = toMs(metrics.tcp - metrics.dns);
              tlsMs = toMs(Math.max(0, metrics.tls > 0 ? metrics.tls - metrics.tcp : 0));
              ttfbMs = toMs(metrics.ttfb - (metrics.tls || metrics.tcp));
              totalMs = toMs(metrics.total);

              const headerLines = headersRaw.split(/\r?\n/).filter(Boolean);
              const lastStatusLine = headerLines.reduce(
                (last, line, i) => line.toUpperCase().startsWith("HTTP/") ? i : last, 0
              );
              const parsedHeaders: Record<string, string> = {};
              for (const line of headerLines.slice(lastStatusLine + 1)) {
                const colonIdx = line.indexOf(":");
                if (colonIdx > 0) {
                  const key = line.slice(0, colonIdx).trim().toLowerCase();
                  const val = line.slice(colonIdx + 1).trim();
                  parsedHeaders[key] = val;
                }
              }
              responseHeaders = Object.keys(parsedHeaders).length > 0 ? parsedHeaders : null;
            }
          } catch (error: any) {
            const exitCode: number = error.code ?? -1;
            if (exitCode == 6) {
              newHttpStatus = HttpStatusCode.NOT_FOUND.toString();
            } else if (exitCode == 7) {
              newHttpStatus = HttpStatusCode.SERVICE_UNAVAILABLE.toString();
            } else if (exitCode == 28) {
              newHttpStatus = HttpStatusCode.REQUEST_TIMEOUT.toString();
            } else if (exitCode == 35) {
              newHttpStatus = HttpStatusCode.SSL_HANDSHAKE_FAILED.toString();
            } else if ([51, 60].includes(exitCode)) {
              newHttpStatus = HttpStatusCode.INVALID_SSL_CERTIFICATE.toString();
            } else {
              newHttpStatus = HttpStatusCode.UNKNOWN.toString();
            }
            responseHeaders = null;

            const partialStdout: string = error.stdout ?? "";
            const partialSepIdx = partialStdout.indexOf("\n---CURL-METRICS---\n");

            if (partialSepIdx != -1) {
              try {
                const partialMetrics = JSON.parse(partialStdout.slice(partialSepIdx + "\n---CURL-METRICS---\n".length).trim());
                dnsMs = partialMetrics.dns > 0 ? toMs(partialMetrics.dns) : null;
                tcpMs = partialMetrics.tcp > 0 ? toMs(partialMetrics.tcp - partialMetrics.dns) : (partialMetrics.dns > 0 && partialMetrics.total > 0 ? toMs(partialMetrics.total - partialMetrics.dns) : null);
                tlsMs = partialMetrics.tls > 0 ? toMs(partialMetrics.tls - partialMetrics.tcp) : null;
                ttfbMs = partialMetrics.ttfb > 0 ? toMs(partialMetrics.ttfb - (partialMetrics.tls || partialMetrics.tcp)) : null;
                totalMs = partialMetrics.total > 0 ? toMs(partialMetrics.total) : null;
              } catch (error) {
                console.log(error);
              }
            }
          }
          break;
        }
        case MonitorTypeEnum.PING:
          try {
            const pingResponse = await ping.promise.probe(monitor.address, {
              timeout: 10
            });

            if (pingResponse.alive) {
              newHttpStatus = HttpStatusCode.OK.toString();
            } else if (pingResponse.output.includes("Destination Host Unreachable")) {
              newHttpStatus = HttpStatusCode.SERVICE_UNAVAILABLE.toString();
            } else if (parseFloat(pingResponse.packetLoss) == 100) {
              newHttpStatus = HttpStatusCode.REQUEST_TIMEOUT.toString()
            } else if (pingResponse.output.includes("Name or service not known")) {
              newHttpStatus = HttpStatusCode.NOT_FOUND.toString()
            }

            pingPacketLoss = parseFloat(parseFloat(pingResponse.packetLoss).toFixed(2));
            pingAvgMs = pingResponse.avg != "unknown" ? parseFloat(parseFloat(pingResponse.avg).toFixed(2)) : null;
            pingMinMs = pingResponse.min != "unknown" ? parseFloat(parseFloat(pingResponse.min).toFixed(2)) : null;
            pingMaxMs = pingResponse.max != "unknown" ? parseFloat(parseFloat(pingResponse.max).toFixed(2)) : null;
            totalMs = pingAvgMs;
          } catch (error) {
            newHttpStatus = HttpStatusCode.UNKNOWN.toString();
          }
          break;
        default:
          break;
      }

      const newStatus: MonitorHistoryStatusEnum = newHttpStatus.startsWith("2") ? MonitorHistoryStatusEnum.SUCCESS : MonitorHistoryStatusEnum.ERROR;

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
        if (monitorHistory.status == MonitorHistoryStatusEnum.SUCCESS && newStatus == MonitorHistoryStatusEnum.ERROR) { // went down
          notifyType = "FAILURE";
        } else if (monitorHistory.status == MonitorHistoryStatusEnum.ERROR && newStatus == MonitorHistoryStatusEnum.SUCCESS) { // went up
          notifyType = "OK";
        }
      } else if (!monitorHistory && newStatus == MonitorHistoryStatusEnum.ERROR) { // first check and is down
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
          http_status: newHttpStatus,
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
        this.processNotifications(monitor, notifyType, monitorIncident!, newHttpStatus, totalMs).catch((error) => {
          this.logger.error(`Error in processNotifications for monitor ID: ${monitor.id}: ${error.message}`);
        });
      }
    } catch (error) {
      this.logger.error(`Global error ${error.message}`);
    }
  }

  private async processNotifications(monitor: any, notifyType: "OK" | "FAILURE", monitorIncident: IncidentEntity, newHttpStatus: string, totalMs: number | null) {
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
      status_code: newHttpStatus,
      status_description: HttpStatusCodeLabel[getHttpStatusKey(newHttpStatus)] ?? newHttpStatus,
      downtime: notifyType == "OK" && monitorIncident ? formatSince(monitorIncident.created_at, "YYYY-MM-DD HH:mm:ssZ") : "",
      datetime: formatDate(getCurrentDate(), "DD/MM/YYYY HH:mm:ss")
    };

    for await (let { integration } of integrationList) {
      let title = `${monitor.name} ficou disponível`;
      let description = `${monitor.name} (${monitor.address}) ficou disponível.`;

      if (notifyType == "FAILURE") {
        title = `${monitor.name} ficou indisponível`;
        description = `${monitor.name} (${monitor.address}) ficou indisponível: ${HttpStatusCodeLabel[getHttpStatusKey(newHttpStatus)]}.`;
      }

      if (notifyType == "OK" && monitorIncident) {
        description += ` Downtime: ${formatSince(monitorIncident.created_at, "YYYY-MM-DD HH:mm:ssZ")}.`;
      }

      if (integration.chatPlatform.type == ChatPlatformTypeEnum.WEBHOOK) {
        const template = allTemplates.find(t => t.integration_id == integration.id);
        const templateField = notifyType == "FAILURE" ? "down_template" : "up_template";

        if (template?.[templateField]) {
          description = this.integrationService.renderTemplate(template[templateField]!, templateVars);
        }
      }

      const viewUrl = `${process.env.WEB_URL}/panel/monitoring/incidents/view/${monitorIncident.id}`
      const footer = `Systatus - ${formatDate(getCurrentDate(), "DD/MM/YYYY HH:mm:ss")}`;

      try {
        switch (integration.chatPlatform.name) {
          case ChatPlatformEnum.DISCORD:
            await this.integrationService.sendDiscordWebhook(integration.address, "", `${description}\n[Ver incidente](${viewUrl})`, footer, notifyType == "OK" ? "#7CB342" : "#F44336");
            break;
          case ChatPlatformEnum.GOOGLE_CHAT:
            if (monitor.address.startsWith("http")) {
              description = description.replace(monitor.address, `<a href="${monitor.address}">${monitor.address}</a>`);
            }
            await this.integrationService.sendGoogleChatWebhook(integration.address, "", `${description}<br><a href="${viewUrl}">Ver incidente</a>`, footer);
            break;
          case ChatPlatformEnum.SLACK:
            await this.integrationService.sendSlackWebhook(integration.address, "", `${description}\n<${viewUrl}|Ver incidente>`, footer, notifyType == "OK" ? "#7CB342" : "#F44336");
            break;
          case ChatPlatformEnum.MATTERMOST:
            await this.integrationService.sendMattermostWebhook(integration.address, "", `${description}\n[Ver incidente](${viewUrl})`, footer, notifyType == "OK" ? "#7CB342" : "#F44336");
            break;
          case ChatPlatformEnum.WHATSAPP:
            if (notifyType == "OK") {
              await this.integrationService.sendWhatsApp("systatus_monitor_up", integration.address, `${monitor.name} (${monitor.address})`, `${HttpStatusCodeLabel[getHttpStatusKey(newHttpStatus)]}`, formatSince(monitorIncident!.created_at, "YYYY-MM-DD HH:mm:ssZ"), monitorIncident.id);
            } else {
              await this.integrationService.sendWhatsApp("systatus_monitor_down", integration.address, `${monitor.name} (${monitor.address})`, `${HttpStatusCodeLabel[getHttpStatusKey(newHttpStatus)]}`, "", monitorIncident.id);
            }
            break;
          case ChatPlatformEnum.EMAIL:
            await this.integrationService.sendMonitorEmail(integration.address, title, notifyType == "OK", monitor.name, monitor.address, newHttpStatus, totalMs, monitorIncident?.created_at ?? null, viewUrl);
            break;
          default:
            break;
        }
      } catch (error) {
        this.logger.error(`Error sending notification for monitor ID: ${monitor.id} via integration ID: ${integration.id}: ${error.message}`);
      }
    }
  }

}
