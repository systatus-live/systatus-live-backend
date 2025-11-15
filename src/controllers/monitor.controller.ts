import { BadRequestException, Body, ConflictException, Controller, Delete, Get, InternalServerErrorException, NotFoundException, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MonitorEntity } from '../database/entities/MonitorEntity';
import removeAccents from '../utils/removeAccents';
import { DataSource, Not, Repository } from 'typeorm';
import { MonitorHistoryEntity } from '../database/entities/MonitorHistoryEntity';
import { AuthGuard } from '../guards/auth/auth.guard';
import { CronService } from '../services/cron.service';
import { MonitorTypeEnum } from '../enums/MonitorTypeEnum';
import axios from "axios";
import { HttpStatusCode } from '../enums/HttpStatusCode';
import { IntegrationService } from 'src/services/integration.service';

@Controller({
  version: "1",
  path: "/monitors"
})
@UseGuards(AuthGuard)
export class MonitorController {
  @InjectRepository(MonitorEntity) private monitorRepository: Repository<MonitorEntity>
  @InjectRepository(MonitorHistoryEntity) private monitorHistoryRepository: Repository<MonitorHistoryEntity>

  private querySize: number = parseInt(process.env.QUERY_SIZE as string);

  constructor(
    private cronService: CronService,
    private dataSource: DataSource,
    private integrationService: IntegrationService
  ) { }

  @Post("/")
  async createMonitor(@Request() request: Request, @Body() body: any) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const newMonitor = this.monitorRepository.create({
        name: body.name,
        type: body.type,
        address: body.address,
        active: body.active,
        cron: "*/5 * * * *",
        createdUserId: request["loggedUser"],
        updatedUserId: request["loggedUser"]
      });

      await queryRunner.manager.save(MonitorEntity, newMonitor);

      this.cronService.schedule(newMonitor.id, newMonitor.cron, async (_) => {
        console.log(`Executing monitor check for monitor ID: ${newMonitor.id}`);

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
        let notifyType: "ONLINE" | "OFFLINE" | null = null;

        switch (newMonitor.type) {
          case MonitorTypeEnum.HTTP:
            try {
              const response = await axios.get(newMonitor.address, {
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
            // TODO
            break;
          default:
          // TODO
        }

        newMonitorHistory.status = newStatus;
        await this.monitorHistoryRepository.save(newMonitorHistory);

        console.log(`Monitor ID: ${newMonitor.id} checked. Status: ${newStatus}. NotifyType: ${notifyType}`);
        if (notifyType) {
          const title = `Monitor '${newMonitor.name}' está ${notifyType == "ONLINE" ? "ONLINE" : "OFFLINE"}`;
          const msg = "...";
          const footer = "Systatus.Live (https://systatus.live)"
          await this.integrationService.sendDiscordWebhook("https://discord.com/api/webhooks/1426565409255198732/9sD2RiGE-onXyxBa4KOzFEh0iiD7Ak9vofaRCjnXnokaLogHU-Y78n05LkGSRQ3gkhCp", title, msg, footer);
        }

        if (notifyType) {
          // TODO: Notify user about the status change
        }
      })

      await queryRunner.commitTransaction();

      return {
        message: "Monitor criado com sucesso."
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException("Falha ao criar o monitor.");
    } finally {
      await queryRunner.release();
    }
  }

  @Get("/")
  async getMonitorList(@Request() request: Request, @Query("page") page: number, @Query("search") search: string) {
    if (page == null || isNaN(page) || page < 0) {
      throw new BadRequestException("Informe o parâmetro numérico 'page >= 0'");
    }

    if (search) {
      search = removeAccents(search);
    }

    const results = await Promise.all([
      this.dataSource.query(`
        select mon.*
        from monitors mon
        where mon."createdUserId" = '${request["loggedUser"]}'
        ${search ? `and (lower(trim(unaccent(mon.name))) like '%${search}%' or lower(trim(unaccent(mon.type))) like '%${search}%')` : ""}
        order by mon."createdAt" desc  
        limit ${this.querySize} offset ${this.querySize * page}
      `),
      this.dataSource.query(`
        select count(1) as total
        from monitors mon
        where mon."createdUserId" = '${request["loggedUser"]}'
        ${search ? `and (lower(trim(unaccent(mon.name))) like '%${search}%' or lower(trim(unaccent(mon.type))) like '%${search}%')` : ""}
      `),
    ]);

    return {
      data: results[0],
      total: results[1][0].total
    }
  }

  @Put("/:id")
  async updateMonitor(@Request() request: Request, @Body() body: any, @Param("id") id: string) {
    const monitor = await this.monitorRepository.findOne({
      where: {
        createdUserId: request["loggedUser"],
        id: id
      },
      select: ["id"]
    })

    if (!monitor) {
      throw new NotFoundException("Integração não encontrada.");
    }

    const monitorWithSameAddress = await this.monitorRepository.findOne({
      where: {
        createdUserId: request["loggedUser"],
        address: body.address,
        id: Not(monitor.id)
      },
      select: ["id", "name"]
    })

    if (monitorWithSameAddress) {
      throw new ConflictException(`Já existe um monitor '${monitorWithSameAddress.name}' com este endereço.`)
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.update(MonitorEntity, {
        id: monitor.id
      }, {
        name: body.name,
        address: body.address,
        type: body.type,
        updatedUserId: request["loggedUser"]
      });
      await queryRunner.commitTransaction();

      return {
        message: "Monitor atualizado com sucesso."
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException("Falha ao atualizar o monitor.");
    } finally {
      await queryRunner.release();
    }
  }

  @Delete("/:id")
  async deleteMonitorById(@Request() request: Request, @Param("id") id: string) {
    const monitor = await this.monitorRepository.findOne({
      where: {
        createdUserId: request["loggedUser"],
        id: id
      },
      select: ["id"]
    })

    if (!monitor) {
      throw new NotFoundException("Monitor não encontrado.");
    }

    await this.monitorRepository.delete({
      id: monitor.id
    })

    return {
      message: "Monitor excluído com sucesso."
    }
  }
}
