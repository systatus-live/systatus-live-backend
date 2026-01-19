import { Injectable } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import axios from "axios";
import { CronJob } from 'cron';
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



@Injectable()
export class CronService {
  @InjectRepository(MonitorIntegrationEntity) private monitorIntegrationRepository: Repository<MonitorIntegrationEntity>
  @InjectRepository(MonitorHistoryEntity) private monitorHistoryRepository: Repository<MonitorHistoryEntity>
  @InjectRepository(IncidentEntity) private monitorIncidentRepository: Repository<IncidentEntity>

  constructor(
    private schedulerRegistry: SchedulerRegistry,
    private integrationService: IntegrationService,
    private mailService: MailService,
    private dataSource: DataSource
  ) { }

  public schedule(id: string, interval: string, callback: (params?: any) => void | Promise<void>) {
    const job = new CronJob(interval, callback);
    this.schedulerRegistry.addCronJob(id, job);
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
      join intervals val on val.id = mon."intervalId"  
      where mon.active = true
      and val.cron = '${cron}'
      order by mon."createdAt" asc
    `);

    console.log(`[Monitor] ${cron} started for ${monitorList.length} monitors.`);

    for await (let monitor of monitorList) {
      let newStatus: string = HttpStatusCode.UNKNOWN.toString();
      let durationMs: number | null = null;

      const axiosInstance = axios.create()

      axiosInstance.interceptors.request.use((config) => {
        config.headers["request-startTime"] = new Date().getTime();
        return config;
      })

      axiosInstance.interceptors.response.use((response) => {
        const currentTime = new Date().getTime()
        const startTime = response.config.headers["request-startTime"];
        response.headers["request-duration"] = currentTime - startTime;
        return response;
      })

      switch (monitor.type) {
        case MonitorTypeEnum.GET:
          try {
            const httpResponse = await axiosInstance.get(monitor.address, {
              timeout: 10000
            });

            newStatus = httpResponse.status.toString();
            durationMs = httpResponse.headers["request-duration"];
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
                newStatus == HttpStatusCode.GATEWAY_TIMEOUT.toString();
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

            if (error.response) {
              durationMs = error.response.headers["request-duration"];
            }
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
          }
          break;
        default:
          break;
      }

      let [monitorIncident, monitorHistory] = await Promise.all([
        this.monitorIncidentRepository.findOne({
          where: {
            monitorId: monitor.id,
            active: true
          },
        }),
        this.monitorHistoryRepository.findOne({
          where: {
            monitorId: monitor.id
          },
          order: {
            createdAt: "DESC"
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
          monitorId: monitor.id,
          active: incidentIsActive
        }

        if (!incidentIsActive) {
          payload.endedAt = getCurrentDate("YYYY-MM-DD HH:mm:ssZZ");
        }

        monitorIncident = await this.monitorIncidentRepository.save(payload);
      }

      await this.monitorHistoryRepository.save({
        monitorId: monitor.id,
        incidentId: monitorIncident?.id,
        status: newStatus,
        duration: durationMs
      });

      if (notifyType) {
        const integrationList = await this.monitorIntegrationRepository.find({
          where: {
            monitorId: monitor.id
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

          if (notifyType == "OK") {
            const monitorIncident = await this.monitorIncidentRepository.findOne({
              where: {
                monitorId: monitor.id,
                active: false
              },
              order: {
                createdAt: "DESC"
              }
            });

            if (monitorIncident) {
              description += ` Downtime: ${formatSince(monitorIncident.createdAt, "YYYY-MM-DD HH:mm:ssZ")}.`;
            }
          }

          const footer = `Systatus.Live - ${getCurrentDate("DD/MM/YYYY HH:mm:ss")}`;

          try {
            switch (integration.chatPlatform.name) {
              case ChatPlatformEnum.DISCORD:
                await this.integrationService.sendDiscordWebhook(integration.address, "", description, footer);
                break;
              case ChatPlatformEnum.GOOGLE_CHAT:
                if (monitor.address.startsWith("http")) {
                  description = description.replace(monitor.address, `<a href="${monitor.address}">${monitor.address}</a>`);
                }
                await this.integrationService.sendGoogleChatWebhook(integration.address, "", description, footer);
                break;
              case ChatPlatformEnum.SLACK:
                await this.integrationService.sendSlackWebhook(integration.address, "", description, footer);
                break;
              case ChatPlatformEnum.EMAIL:
                const emailBody = readFileSync(`${__dirname}/../assets/mail/Monitor.html`, "utf-8").replace(/{{MESSAGE}}/g, description).replace("🟢 ", "").replace("🔴 ", "");
                await this.mailService.sendMail("Systatus.Live <system@systatus.live>", integration.address, title, emailBody);
                break;
              default:
                break;
            }
          } catch (error) {
            console.log(`Error sending notification for monitor ID: ${monitor.id} via integration ID: ${integration.id}: ${error.message}`);
          }
        }
      }
    }
  }
}
