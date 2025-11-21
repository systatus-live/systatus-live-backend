import { Injectable } from '@nestjs/common';
import { Cron, SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { CronJob } from 'cron';
import { MonitorIntegrationEntity } from '../database/entities/MonitorIntegrationEntity';
import { MonitorTypeEnum } from '../enums/MonitorTypeEnum';
import { Repository } from 'typeorm';
import axios from "axios";
import { HttpStatusCode } from '../enums/HttpStatusCode';
import { MonitorHistoryEntity } from 'src/database/entities/MonitorHistoryEntity';
import { MonitorEntity } from 'src/database/entities/MonitorEntity';
import { IntegrationService } from './integration.service';
import { ChatPlatformEnum } from 'src/enums/ChatPlatformEnum';

@Injectable()
export class CronService {
  @InjectRepository(MonitorEntity) private monitorRepository: Repository<MonitorEntity>
  @InjectRepository(MonitorIntegrationEntity) private monitorIntegrationRepository: Repository<MonitorIntegrationEntity>
  @InjectRepository(MonitorHistoryEntity) private monitorHistoryRepository: Repository<MonitorHistoryEntity>

  constructor(
    private schedulerRegistry: SchedulerRegistry,
    private integrationService: IntegrationService
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
      let notifyType: "ONLINE" | "OFFLINE" | null = null;

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
                notifyType = "OFFLINE";
              } else if (!lastMonitorHistory.status.startsWith("2") && newStatus.startsWith("2")) {
                notifyType = "ONLINE";
              }
            }
          }
          break;
        case MonitorTypeEnum.PING:
          break;
        default:
          break;
      }

      await this.monitorHistoryRepository.save({
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
          const title = "";
          const description = `${monitor.name} (${monitor.address}) ficou ${notifyType == "ONLINE" ? "ONLINE" : "OFFLINE"}. Status: ${newStatus}`
          const footer = "Systatus.Live";

          switch (integration.chatPlatform.name) {
            case ChatPlatformEnum.DISCORD:
              await this.integrationService.sendDiscordWebhook(integration.url, title, description, footer);
              break;
            case ChatPlatformEnum.GOOGLE_CHAT:
              await this.integrationService.sendGoogleChatWebhook(integration.url, title, description.replace(monitor.address, `<a href="${monitor.address}">${monitor.address}</a>`), footer);
              break;
            case ChatPlatformEnum.SLACK:
              await this.integrationService.sendSlackWebhook(integration.url, title, description, footer);
              break;
            default:
              break;
          }
        }
      }
    }
  }
}
