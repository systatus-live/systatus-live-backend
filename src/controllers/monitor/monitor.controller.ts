import { Body, Controller, InternalServerErrorException, Post, UseGuards, Request } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MonitorEntity } from 'src/database/entities/MonitorEntity';
import { CronService } from 'src/services/cron.service';
import { DataSource, Repository } from 'typeorm';
import { I18n, I18nContext } from 'nestjs-i18n';
import { AuthGuard } from 'src/guards/auth/auth.guard';
import axios from "axios";
import { MonitorTypeEnum } from 'src/enums/MonitorTypeEnum';
import { MonitorHistoryEntity } from 'src/database/entities/MonitorHistoryEntity';
import { HttpStatusCode } from 'src/enums/HttpStatusCode';

@Controller({
  version: "1",
  path: "/monitors"
})
@UseGuards(AuthGuard)
export class MonitorController {
  @InjectRepository(MonitorEntity) private monitorRepository: Repository<MonitorEntity>
  @InjectRepository(MonitorHistoryEntity) private monitorHistoryRepository: Repository<MonitorHistoryEntity>

  constructor(
    private cronService: CronService,
    private dataSource: DataSource
  ) { }

  @Post("/")
  async createMonitor(@Request() request: Request, @Body() body: any, @I18n() i18n: I18nContext) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const newMonitor = this.monitorRepository.create({
        title: body.title,
        type: body.type,
        uri: body.uri,
        active: body.active,
        cron: "* * * * *",
        createdUserId: request["loggedUser"],
        updatedUserId: request["loggedUser"]
      });

      await queryRunner.manager.save(MonitorEntity, newMonitor);
      await queryRunner.commitTransaction();

      this.cronService.schedule(newMonitor.id, newMonitor.cron, async (_) => {
        const lastMonitorHistory = await this.monitorHistoryRepository.findOne({
          where: {
            monitorId: newMonitor.id
          },
          order: {
            createdAt: "DESC"
          },
        })

        let newMonitorHistory = this.monitorHistoryRepository.create({
          monitorId: newMonitor.id
        });

        let newStatus = "UNKNOWN";

        switch (newMonitor.type) {
          case MonitorTypeEnum.HTTP:
            try {
              const response = await axios.get(newMonitor.uri, {
                timeout: 30000, // 30 seconds in milliseconds
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
                }
              }
            } finally {
              if (lastMonitorHistory) {
                if (lastMonitorHistory.status.startsWith("2") && !newStatus.startsWith("2")) {
                  console.log("status changed from UP to DOWN"); // TODO
                } else if (!lastMonitorHistory.status.startsWith("2") && newStatus.startsWith("2")) {
                  console.log("status changed from DOWN to UP"); // TODO
                }
              }
            }
            break;
          case MonitorTypeEnum.PING:
            // TODO
            break;
          default:
          // TODO
        }

        newMonitorHistory.status = newStatus;
        await this.monitorHistoryRepository.save(newMonitorHistory);
      })

      return {
        message: i18n.translate("messages.monitorController.monitorCreateSuccess")
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(i18n.translate("messages.monitorController.monitorCreateError"));
    } finally {
      await queryRunner.release();
    }
  }
}
