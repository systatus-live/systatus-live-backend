import { Injectable } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { CronJob } from 'cron';
import { MonitorIntegrationEntity } from '../database/entities/MonitorIntegrationEntity';
import { MonitorTypeEnum } from '../enums/MonitorTypeEnum';
import { DataSource, Like, Not, Repository } from 'typeorm';
import axios from "axios";
import { getHttpStatusKey, HttpStatusCode, HttpStatusCodeLabel } from '../enums/HttpStatusCode';
import { MonitorHistoryEntity } from 'src/database/entities/MonitorHistoryEntity';
import { MonitorEntity } from 'src/database/entities/MonitorEntity';
import { IntegrationService } from './integration.service';
import { ChatPlatformEnum } from 'src/enums/ChatPlatformEnum';
import * as momentTz from "moment-timezone";
import getCurrentDate from 'src/utils/getCurrenDate';
import { MailService } from './mail.service';
import { readFileSync } from 'fs';
import { MonitorIncidentEntity } from 'src/database/entities/MonitorIncidentEntity';

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
    private dataSource: DataSource
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
        case MonitorTypeEnum.HTTP:
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
              } else if (error.code) {
                newStatus = error.code;
              }
            }
          }
          break;
        case MonitorTypeEnum.PING:
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
        monitorIncident = await this.monitorIncidentRepository.save({
          id: monitorIncident?.id,
          monitorId: monitor.id,
          active: notifyType == "FAILURE" ? true : false
        })
      }

      const savedMonitorHistory = await this.monitorHistoryRepository.save({
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
          let description = `🟢 ${monitor.name} (${monitor.address}) ficou disponível. Status: ${HttpStatusCodeLabel[getHttpStatusKey(newStatus)]} (${newStatus}).`;

          if (notifyType == "FAILURE") {
            title = `🔴 ${monitor.name} ficou indisponível`;
            description = `🔴 ${monitor.name} (${monitor.address}) ficou indisponível. Status: ${HttpStatusCodeLabel[getHttpStatusKey(newStatus)]} (${newStatus}).`;
          }

          if (notifyType == "OK") {
            const lastOnlineMonitorHistory = await this.monitorHistoryRepository.findOne({
              where: {
                monitorId: monitor.id,
                status: Like("2%"),
                id: Not(savedMonitorHistory.id)
              },
              order: {
                createdAt: "DESC"
              }
            });

            if (lastOnlineMonitorHistory) {
              const now = momentTz().tz("America/Sao_Paulo");
              const lastOnlineDate = momentTz(lastOnlineMonitorHistory!.createdAt).tz("America/Sao_Paulo");

              const duration = momentTz.duration(now.diff(lastOnlineDate));
              const hours = duration.hours();
              const minutes = duration.minutes();
              if (hours > 0) {
                description += ` Indisponibilidade estimada: ${hours}h e ${minutes}min.`;
              } else {
                description += ` Indisponibilidade estimada: ${minutes}min.`;
              }
            }
          }

          const footer = `Systatus.Live - ${getCurrentDate("DD/MM/YYYY HH:mm:ss")}`;

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
        }
      }
    }
  }
}
