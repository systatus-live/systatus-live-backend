import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import axios from "axios";
import { readFileSync } from 'fs';
import ping from "ping";
import { DataSource, Repository } from 'typeorm';
import { IncidentEntity } from '../database/entities/IncidentEntity';
import { MonitorHistoryEntity } from '../database/entities/MonitorHistoryEntity';
import { MonitorIntegrationEntity } from '../database/entities/MonitorIntegrationEntity';
import { ChatPlatformEnum } from '../types/ChatPlatformEnum';
import { CronIntervalEnum } from '../types/CronIntervalEnum';
import { getHttpStatusKey, HttpStatusCode, HttpStatusCodeLabel } from '../types/HttpStatusCode';
import { MonitorTypeEnum } from '../types/MonitorTypeEnum';
import formatSince from '../utils/formatSince';
import getCurrentDate from '../utils/getCurrenDate';
import { IntegrationService } from './integration.service';
import { MailService } from './mail.service';
import formatDate from 'src/utils/formatDate';

@Injectable()
export class MonitorService {
  private readonly logger = new Logger(MonitorService.name);

  @InjectRepository(MonitorIntegrationEntity) private monitorIntegrationRepository: Repository<MonitorIntegrationEntity>
  @InjectRepository(MonitorHistoryEntity) private monitorHistoryRepository: Repository<MonitorHistoryEntity>
  @InjectRepository(IncidentEntity) private monitorIncidentRepository: Repository<IncidentEntity>

  constructor(
    private integrationService: IntegrationService,
    private mailService: MailService,
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

      let newStatus: string = HttpStatusCode.UNKNOWN.toString();
      let durationMs: number | null = null;
      let requestHeaders: any = null;
      let responseHeaders: any = null;

      const startTime = Date.now();

      switch (monitor.type) {
        case MonitorTypeEnum.HTTP:
          try {
            const httpResponse = await axios.head(monitor.address, {
              timeout: 10000,
              headers: {
                "Cache-Control": "no-cache",
                "Connection": "close",
                "Referer": monitor.address,
                "User-Agent": "Systatus.live (https://systatus.live)",
                "Accept": null,
                "accept-encoding": null,
                "host": null
              }
            });

            newStatus = httpResponse.status.toString();
            requestHeaders = httpResponse.config.headers;
            responseHeaders = httpResponse.headers;
          } catch (error) {
            if (axios.isAxiosError(error)) {
              if (error.response) {
                newStatus = error.response.status.toString();
              } else if (error.code == "ECONNABORTED") {
                newStatus = HttpStatusCode.REQUEST_TIMEOUT.toString();
              } else if (error.code == "ECONNREFUSED") {
                newStatus = HttpStatusCode.SERVICE_UNAVAILABLE.toString();
              } else if (error.code == "ERR_BAD_RESPONSE") {
                newStatus = HttpStatusCode.BAD_GATEWAY.toString();
              } else if (error.code == "ENOTFOUND") {
                newStatus = HttpStatusCode.NOT_FOUND.toString();
              } else if (error.code == "ETIMEDOUT") {
                newStatus = HttpStatusCode.GATEWAY_TIMEOUT.toString();
              } else if (error.code == "EPROTO") {
                newStatus = HttpStatusCode.BAD_GATEWAY.toString();
              } else if (error.code == "ERR_BAD_REQUEST") {
                newStatus = HttpStatusCode.BAD_REQUEST.toString();
              } else if (error.code) {
                newStatus = error.code;
              }
            }

            if (error.code == "ERR_INVALID_URL") {
              newStatus = HttpStatusCode.NOT_FOUND.toString();
            }

            requestHeaders = (error.response ?? error).config.headers;
            responseHeaders = error.response ? error.response.headers : null;
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
        request_headers: requestHeaders ? JSON.parse(JSON.stringify(requestHeaders)) : null,
        response_headers: responseHeaders ? JSON.parse(JSON.stringify(responseHeaders)) : null
      });

      if (notifyType) {
        const integrationList = await this.monitorIntegrationRepository.find({
          where: {
            monitor_id: monitor.id
          },
          relations: ["integration", "integration.chatPlatform"]
        });

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
                const isUp = notifyType === "OK";
                const eventAt = formatDate(getCurrentDate(), "DD/MM/YYYY HH:mm:ss");
                const responseTimeLabel = durationMs != null ? `${durationMs}ms` : "—";

                let detailsRows = "";
                let alertNote = "";

                if (isUp) {
                  const downtimeDuration = monitorIncident?.created_at ? formatSince(monitorIncident.created_at, "YYYY-MM-DD HH:mm:ssZ") : "—";
                  const incidentStartedAt = monitorIncident?.created_at ? formatDate(monitorIncident.created_at, "DD/MM/YYYY HH:mm:ss") : "—";

                  detailsRows = this.buildEmailRow("Dura&ccedil;&atilde;o", downtimeDuration, "#f9fafb")
                    + this.buildEmailRow("Lat&ecirc;ncia", responseTimeLabel, "#10b981")
                    + this.buildEmailRow("Incidente iniciado em", incidentStartedAt, "#f9fafb")
                    + this.buildEmailRow("Resolvido em", eventAt, "#10b981");
                } else {
                  const statusLabel = HttpStatusCodeLabel[getHttpStatusKey(newStatus)] ?? newStatus;

                  detailsRows = this.buildEmailRow("C&oacute;digo de erro", newStatus, "#ef4444")
                    + this.buildEmailRow("Descri&ccedil;&atilde;o", statusLabel, "#f9fafb")
                    + this.buildEmailRow("Detectado em", eventAt, "#f9fafb");

                  alertNote = `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-top:20px;">
                    <tr>
                      <td bgcolor="#1c0a0a" style="background-color:#1c0a0a;padding:14px 16px;border:1px solid #3d1515;">
                        <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#fca5a5;line-height:1.6;">
                          <strong>A&ccedil;&atilde;o necess&aacute;ria:</strong> Verifique o servi&ccedil;o imediatamente. Voc&ecirc; receber&aacute; uma nova notifica&ccedil;&atilde;o quando o monitor for restaurado.
                        </p>
                      </td>
                    </tr>
                  </table>`;
                }

                const emailBody = readFileSync(`${__dirname}/../assets/mail/Monitor.html`, "utf-8")
                  .replace(/{{STATUS_BG}}/g, isUp ? "#052e1c" : "#2d0e0e")
                  .replace(/{{STATUS_BORDER_COLOR}}/g, isUp ? "#10b981" : "#ef4444")
                  .replace(/{{STATUS_TEXT_COLOR}}/g, isUp ? "#10b981" : "#ef4444")
                  .replace(/{{STATUS_LABEL}}/g, isUp ? "&#10003;&nbsp;&nbsp;SERVI&#199;O OPERACIONAL" : "&#9888;&nbsp;&nbsp;SERVI&#199;O INDISPON&#205;VEL")
                  .replace(/{{EMAIL_INTRO}}/g, isUp ? "O monitor abaixo retornou ao estado operacional e est&#225; respondendo normalmente." : "Um dos seus monitores detectou uma falha e est&#225; indispon&#237;vel. Verifique o painel imediatamente.")
                  .replace(/{{MONITOR_NAME}}/g, monitor.name)
                  .replace(/{{MONITOR_URL}}/g, monitor.address)
                  .replace(/{{DETAILS_ROWS}}/g, detailsRows)
                  .replace(/{{ALERT_NOTE}}/g, alertNote)
                  .replace(/{{CTA_BG}}/g, isUp ? "#10b981" : "#ef4444")
                  .replace(/{{CTA_TEXT}}/g, isUp ? "Ver no Dashboard" : "Analisar Incidente no Painel")
                  .replace(/{{ACTION_URL}}/g, `${process.env.WEB_URL}/panel/monitors`);

                await this.mailService.sendMail("Systatus.Live <systatus@artcode.dev>", integration.address, title, emailBody);
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
  }

  private buildEmailRow(label: string, value: string, valueColor: string): string {
    return `<tr>
      <td width="42%" bgcolor="#0d1520" style="background-color:#0d1520;padding:13px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#9ca3af;border-top:1px solid #1f2937;border-right:1px solid #1f2937;white-space:nowrap;">${label}</td>
      <td bgcolor="#111827" style="background-color:#111827;padding:13px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;font-weight:600;color:${valueColor};border-top:1px solid #1f2937;word-break:break-all;">${value}</td>
    </tr>`;
  }
}
