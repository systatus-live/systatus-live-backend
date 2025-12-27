import { Injectable } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import axios from "axios";
import { CronJob } from 'cron';
import { readFileSync } from 'fs';
import { MonitorEntity } from '../database/entities/MonitorEntity';
import { MonitorHistoryEntity } from '../database/entities/MonitorHistoryEntity';
import { MonitorIncidentEntity } from '../database/entities/MonitorIncidentEntity';
import { ChatPlatformEnum } from '../enums/ChatPlatformEnum';
import formatSince from '../utils/formatSince';
import getCurrentDate from '../utils/getCurrenDate';
import { Repository } from 'typeorm';
import { MonitorIntegrationEntity } from '../database/entities/MonitorIntegrationEntity';
import { getHttpStatusKey, HttpStatusCode, HttpStatusCodeLabel } from '../enums/HttpStatusCode';
import { MonitorTypeEnum } from '../enums/MonitorTypeEnum';
import { IntegrationService } from './integration.service';
import { MailService } from './mail.service';
import ping from "ping";

@Injectable()
export class CronService {
  @InjectRepository(MonitorEntity) private monitorRepository: Repository<MonitorEntity>
  @InjectRepository(MonitorIntegrationEntity) private monitorIntegrationRepository: Repository<MonitorIntegrationEntity>
  @InjectRepository(MonitorHistoryEntity) private monitorHistoryRepository: Repository<MonitorHistoryEntity>
  @InjectRepository(MonitorIncidentEntity) private monitorIncidentRepository: Repository<MonitorIncidentEntity>

  constructor(
    private schedulerRegistry: SchedulerRegistry,
    private integrationService: IntegrationService,
    private mailService: MailService,
  ) { }

  public schedule(id: string, interval: string, callback: (params?: any) => void | Promise<void>) {
    const job = new CronJob(interval, callback);
    this.schedulerRegistry.addCronJob(id, job);
  }

  @Cron("*/5 * * * *", {
    name: "notifications",
    timeZone: "America/Sao_Paulo",
  })
  async triggerNotifications() {
    const monitorList = await this.monitorRepository.find({
      order: {
        createdAt: "ASC"
      },
      where: {
        active: true
      }
    })

    for await (let monitor of monitorList) {
      console.log(`Executing check for monitor ID: ${monitor.id}`);

      let newStatus = "UNKNOWN";

      switch (monitor.type) {
        case MonitorTypeEnum.GET:
          try {
            const response = await axios.get(monitor.address, {
              timeout: 10000
            });
            newStatus = response.status.toString();
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
                newStatus == HttpStatusCode.GATEWAY_TIMEOUT.toString()
              } else if (error.code) {
                newStatus = error.code;
              }
            }

            if (error.code == "ERR_INVALID_URL") {
              newStatus = HttpStatusCode.NOT_FOUND.toString();
            }
          }
          break;
        case MonitorTypeEnum.PING:
          try {
            const response = await ping.promise.probe(monitor.address, {
              timeout: 10
            });
            if (response.alive) {
              newStatus = HttpStatusCode.OK.toString();
            } else if (response.output.includes("Destination Host Unreachable")) {
              newStatus = HttpStatusCode.SERVICE_UNAVAILABLE.toString();
            } else if (parseFloat(response.packetLoss) == 100) {
              newStatus = HttpStatusCode.REQUEST_TIMEOUT.toString()
            }
          } catch (error) {
            newStatus = "0";
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

        const payload: Partial<MonitorIncidentEntity> = {
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
        status: newStatus
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
          let description = `🟢 ${monitor.name} (${monitor.address}) ficou disponível..`;

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
                await this.integrationService.sendGoogleChatWebhook(integration.address, "", description.replace(monitor.address, `<a href="${monitor.address}">${monitor.address}</a>`), footer);
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
