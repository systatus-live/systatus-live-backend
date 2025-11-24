import { Injectable } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { CronJob } from 'cron';
import { MonitorIntegrationEntity } from '../database/entities/MonitorIntegrationEntity';
import { MonitorTypeEnum } from '../enums/MonitorTypeEnum';
import { Like, Not, Repository } from 'typeorm';
import axios from "axios";
import { HttpStatusCode } from '../enums/HttpStatusCode';
import { MonitorHistoryEntity } from 'src/database/entities/MonitorHistoryEntity';
import { MonitorEntity } from 'src/database/entities/MonitorEntity';
import { IntegrationService } from './integration.service';
import { ChatPlatformEnum } from 'src/enums/ChatPlatformEnum';
import * as momentTz from "moment-timezone";
import getCurrentDate from 'src/utils/getCurrenDate';
import { MailService } from './mail.service';
import { readFileSync } from 'fs';

@Injectable()
export class CronService {
  @InjectRepository(MonitorEntity) private monitorRepository: Repository<MonitorEntity>
  @InjectRepository(MonitorIntegrationEntity) private monitorIntegrationRepository: Repository<MonitorIntegrationEntity>
  @InjectRepository(MonitorHistoryEntity) private monitorHistoryRepository: Repository<MonitorHistoryEntity>

  constructor(
    private schedulerRegistry: SchedulerRegistry,
    private integrationService: IntegrationService,
    private mailService: MailService
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
      let notifyType: "OK" | "NOK" | null = null;

      const lastMonitorHistory = await this.monitorHistoryRepository.findOne({
        where: {
          monitorId: monitor.id
        },
        order: {
          createdAt: "DESC"
        },
      })

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
          } finally {
            if (lastMonitorHistory) {
              if (lastMonitorHistory.status.startsWith("2") && !newStatus.startsWith("2")) {
                notifyType = "NOK";
              } else if (!lastMonitorHistory.status.startsWith("2") && newStatus.startsWith("2")) {
                notifyType = "OK";
              }
            }
          }
          break;
        case MonitorTypeEnum.PING:
          break;
        default:
          break;
      }

      const savedMonitorHistory = await this.monitorHistoryRepository.save({
        monitorId: monitor.id,
        status: newStatus
      } as MonitorHistoryEntity);

      if (notifyType) {
        const integrationList = await this.monitorIntegrationRepository.find({
          where: {
            monitorId: monitor.id
          },
          relations: ["integration", "integration.chatPlatform"]
        });

        for await (let { integration } of integrationList) {
          const title = `${notifyType == "OK" ? "🟢" : "🔴"} ${monitor.name} ficou ${notifyType == "OK" ? "DISPONÍVEL" : "INDISPONÍVEL"}`;
          let description = `${notifyType == "OK" ? "🟢" : "🔴"} ${monitor.name} (${monitor.address}) ficou ${notifyType == "OK" ? "DISPONÍVEL" : "INDISPONÍVEL"}. Status: ${newStatus}.`;

          if (notifyType == "OK") {
            const lastOnlineMonitorHistory = await this.monitorHistoryRepository.findOne({
              where: {
                id: Not(savedMonitorHistory.id),
                monitorId: monitor.id,
                status: Like("2%"),
              },
              order: {
                createdAt: "DESC"
              },
              select: ["createdAt"]
            })

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
