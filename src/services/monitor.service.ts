import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import axios from "axios";
import { existsSync, readFileSync } from 'fs';
import { Agent } from 'https';
import ping from "ping";
import formatDate from 'src/utils/formatDate';
import { rootCertificates } from 'tls';
import { DataSource, In, Repository } from 'typeorm';
import { IncidentEntity } from '../database/entities/IncidentEntity';
import { IntegrationTemplateEntity } from '../database/entities/IntegrationTemplateEntity';
import { MonitorHistoryEntity } from '../database/entities/MonitorHistoryEntity';
import { MonitorIntegrationEntity } from '../database/entities/MonitorIntegrationEntity';
import { ChatPlatformEnum, ChatPlatformTypeEnum } from '../types/ChatPlatformEnum';
import { CronIntervalEnum } from '../types/CronIntervalEnum';
import { getHttpStatusKey, HttpStatusCode, HttpStatusCodeLabel } from '../types/HttpStatusCode';
import { MonitorTypeEnum } from '../types/MonitorTypeEnum';
import formatSince from '../utils/formatSince';
import getCurrentDate from '../utils/getCurrenDate';
import { IntegrationService } from './integration.service';

@Injectable()
export class MonitorService {
  private readonly logger = new Logger(MonitorService.name);

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

  private async checkMonitors(cron: CronIntervalEnum) {
    const monitorList = await this.dataSource.query(`
      select mon.*
      from monitors mon
      join intervals val on val.id = mon.interval_id
      where mon.active = true
      and val.cron = '${cron}'
      order by mon.created_at asc
    `);

    this.logger.log(`${cron} started for ${monitorList.length} monitors.`);

    for await (let monitor of monitorList) {
      this.logger.log(`Checking ${monitor.name} (${monitor.id})`);
      try {

        let newStatus: string = HttpStatusCode.UNKNOWN.toString();
        let durationMs: number | null = null;
        let requestHeaders: any = null;
        let responseHeaders: any = null;

        const startTime = Date.now();

        switch (monitor.type) {
          case MonitorTypeEnum.HTTP:
            requestHeaders = {
              "Cache-Control": "no-cache",
              "Connection": "close",
              "Referer": monitor.address,
              "User-Agent": "Systatus.live (https://systatus.live)",
              "Accept": null,
              "accept-encoding": null,
              "host": null
            }

            try {
              const httpResponse = await axios.head(monitor.address, {
                timeout: 10000,
                headers: requestHeaders,
                httpsAgent: this.buildHttpsAgent(),
              });

              newStatus = httpResponse.status.toString();
              responseHeaders = httpResponse.headers;
            } catch (error) {
              if (axios.isAxiosError(error)) {
                if (error.response) {
                  newStatus = error.response.status.toString();
                } else if (["ERR_BAD_RESPONSE", "EPROTO", "UNABLE_TO_VERIFY_LEAF_SIGNATURE"].includes(error.code ?? "")) {
                  newStatus = HttpStatusCode.BAD_GATEWAY.toString();
                } else if (["ECONNABORTED", "ETIMEDOUT"].includes(error.code ?? "")) {
                  newStatus = HttpStatusCode.REQUEST_TIMEOUT.toString();
                } else if (["ECONNREFUSED", "ENOTFOUND"].includes(error.code ?? "")) {
                  newStatus = HttpStatusCode.SERVICE_UNAVAILABLE.toString();
                } else if (error.code == "ERR_BAD_REQUEST") {
                  newStatus = HttpStatusCode.BAD_REQUEST.toString();
                } else if (error.code) {
                  newStatus = error.code;
                }
              } else if (error.code == "ERR_INVALID_URL") {
                newStatus = HttpStatusCode.NOT_FOUND.toString();
              }

              responseHeaders = error?.response?.headers ?? null;
            } finally {
              durationMs = Date.now() - startTime;
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

              if (pingResponse.time != "unknown") {
                durationMs = pingResponse.time;
              }
            } catch (error) {
              newStatus = HttpStatusCode.UNKNOWN.toString();
            } finally {
              if (durationMs === null) {
                durationMs = Date.now() - startTime;
              }
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

          monitorIncident = await this.monitorIncidentRepository.save(payload);
          if (monitorIncident?.id) {
            monitorIncident = await this.monitorIncidentRepository.findOne({
              where: {
                id: monitorIncident.id
              }
            });
          }
        }

        await this.monitorHistoryRepository.save({
          monitor_id: monitor.id,
          incident_id: monitorIncident?.id,
          status: newStatus,
          duration: durationMs,
          request_headers: requestHeaders ? JSON.parse(JSON.stringify(requestHeaders, (_, v) => v ?? undefined)) : null,
          response_headers: responseHeaders ? JSON.parse(JSON.stringify(responseHeaders)) : null
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
                  await this.integrationService.sendMonitorEmail(integration.address, title, notifyType === "OK", monitor.name, monitor.address, newStatus, durationMs, monitorIncident?.created_at ?? null);
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

  public buildHttpsAgent() {
    const caPath = process.env.NODE_EXTRA_CA_CERTS;
    const ca = (caPath && existsSync(caPath)) ? [...rootCertificates, readFileSync(caPath, "utf8")] : [...rootCertificates];
    return new Agent({
      ca: ca,
      rejectUnauthorized: false
    });
  }
}
