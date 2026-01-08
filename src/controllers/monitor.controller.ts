import { BadRequestException, Body, ConflictException, Controller, Delete, Get, InternalServerErrorException, NotFoundException, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MonitorIntegrationEntity } from '../database/entities/MonitorIntegrationEntity';
import { DataSource, In, Not, Repository } from 'typeorm';
import { MonitorEntity } from '../database/entities/MonitorEntity';
import { AuthGuard } from '../guards/auth/auth.guard';
import removeAccents from '../utils/removeAccents';
import formatDate from '../utils/formatDate';
import formatSince from '../utils/formatSince';

@Controller({
  version: "1",
  path: "/monitors"
})
@UseGuards(AuthGuard)
export class MonitorController {
  @InjectRepository(MonitorEntity) private monitorRepository: Repository<MonitorEntity>
  @InjectRepository(MonitorIntegrationEntity) private monitorIntegrationRepository: Repository<MonitorIntegrationEntity>

  private querySize: number = parseInt(process.env.QUERY_SIZE as string);

  constructor(
    private dataSource: DataSource
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
        intervalId: body.intervalId,
        createdUserId: request["loggedUser"],
        updatedUserId: request["loggedUser"]
      });

      await queryRunner.manager.save(MonitorEntity, newMonitor);

      const newMonitorIntegrationList = body.integrationList.map((integrationId: string) => {
        return this.monitorIntegrationRepository.create({
          monitorId: newMonitor.id,
          integrationId: integrationId,
          createdUserId: request["loggedUser"],
          updatedUserId: request["loggedUser"]
        });
      });

      await queryRunner.manager.save(MonitorIntegrationEntity, newMonitorIntegrationList);
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
  async getMonitorList(@Request() request: Request, @Query("page") page: string, @Query("search") search: string) {
    if (page == null || isNaN(parseInt(page)) || parseInt(page) < 0) {
      throw new BadRequestException("Informe o parâmetro numérico 'page >= 0'");
    }

    if (search) {
      search = removeAccents(search);
    }

    const results = await Promise.all([
      this.dataSource.query(`
        select 
          (
            select t.status 
            from monitor_historical t 
            where t."monitorId" = mon.id 
            order by "createdAt" desc 
            limit 1
          ) as "lastStatus"
          , coalesce(((
            select coalesce(t."endedAt", t."createdAt") 
            from incidents t  
            where t."monitorId" = mon.id 
            order by t."createdAt" 
            desc limit 1
          )), mon."createdAt") as "lastIncident"
          , mon.*
          , (
            select array_agg(json_build_object('id', t."integrationId", 'name', int.name, 'chatPlatform', cha.description, 'chatPlatformIconUrl', cha."iconUrl")) 
            from monitor_integrations t 
            join integrations int on int.id = t."integrationId"
            join chat_platforms cha on cha.id = int."chatPlatformId" 
            where mon.id = t."monitorId"
          ) as "integrationList"
          , (
            with dates as (
              select generate_series(current_date - interval '29 days', current_date,	'1 day'::interval)::date AS date
            )
            select array_agg(json_build_object(
              'date', dat.date
              , 'totalOnline', (select count(1) from monitor_historical t where t."monitorId" = mon.id and t."createdAt"::date = dat.date and t.status like '2%')
              , 'totalOffline', (select count(1) from monitor_historical t where t."monitorId" = mon.id and t."createdAt"::date = dat.date and t.status not like '2%')
            )) 
            from dates dat
          ) as "historical"
          , ite.name as interval
          , ite.cron
        from monitors mon
        join intervals ite on ite.id = mon."intervalId"
        where mon."createdUserId" = '${request["loggedUser"]}'
        ${search ? `and (lower(trim(unaccent(mon.name))) like '%${search}%' or lower(trim(unaccent(mon.address))) like '%${search}%')` : ""}
        order by 1 desc, mon.active desc, mon."createdAt" desc -- show first: offline, active and most recent
        limit ${this.querySize} offset ${this.querySize * parseInt(page)}
      `),
      this.dataSource.query(`
        select count(1) as total
        from monitors mon
        join intervals ite on ite.id = mon."intervalId"
        where mon."createdUserId" = '${request["loggedUser"]}'
        ${search ? `and (lower(trim(unaccent(mon.name))) like '%${search}%' or lower(trim(unaccent(mon.address))) like '%${search}%')` : ""}
      `),
    ]);

    const list = results[0];

    // Monitor historical
    for (let row of list) {
      let totalPercentOnline = 0;

      for (let day of row.historical) {
        const total = day.totalOnline + day.totalOffline;
        day["percentOnline"] = total > 0 ? parseFloat(((day.totalOnline * 100) / total).toFixed(2)) : 0;
        day["percentOffline"] = total > 0 ? parseFloat(((day.totalOffline * 100) / total).toFixed(2)) : 0;

        const formattedDate = formatDate(day.date, "DD/MM/YYYY", "YYYY-MM-DD");

        if (total == 0) {
          day["note"] = `${formattedDate}: Sem monitoramento`;
        } else if (day.percentOnline == 100) {
          day["note"] = `${formattedDate}: 100% disponível`;
        } else if (day.percentOnline >= 50) {
          day["note"] = `${formattedDate}: Parcialmente disponível (${day.percentOnline}% disponível)`;
        } else {
          day["note"] = `${formattedDate}: Indisponibilidade crítica (${day.percentOnline}% disponível)`;
        }

        totalPercentOnline += day.percentOnline;
      }

      const totalDaysWithData = row.historical.filter(item => (item.percentOnline + item.percentOffline) > 0).length;
      row["percentOnline"] = totalDaysWithData ? parseFloat((totalPercentOnline / (totalDaysWithData)).toFixed(2)) : 0;

      if (row.lastIncident) {
        row.lastIncident = formatSince(row.lastIncident, "YYYY-MM-DD HH:mm:ssZ");
      }
    }

    return {
      data: list,
      pagination: {
        rows: this.querySize,
        total: parseInt(results[1][0].total)
      }
    }
  }

  @Get("/:id")
  async getMonitorById(@Request() request: Request, @Param("id") id: string) {
    const monitor = await this.monitorRepository.findOne({
      where: {
        createdUserId: request["loggedUser"],
        id: id
      },
      select: ["id", "name", "type", "intervalId", "createdAt", "updatedAt"]
    })

    if (!monitor) {
      throw new NotFoundException("Monitor não encontrado.");
    }

    return monitor
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
        active: body.active,
        intervalId: body.intervalId,
        updatedUserId: request["loggedUser"]
      });

      // Delete monitor x integrations removed by user
      await this.monitorIntegrationRepository.delete({
        monitorId: monitor.id,
        integrationId: Not(In(body.integrationList))
      })

      // Save monitor x integrations added by user
      const integrationListToSave = body.integrationList.map(integrationId => {
        return this.monitorIntegrationRepository.create({
          monitorId: monitor.id,
          integrationId: integrationId,
          createdUserId: request["loggedUser"],
          updatedUserId: request["loggedUser"]
        })
      })
      await queryRunner.manager.save(MonitorIntegrationEntity, integrationListToSave);

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
