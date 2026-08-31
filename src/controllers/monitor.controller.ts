import { BadRequestException, Body, ConflictException, Controller, Delete, Get, InternalServerErrorException, NotFoundException, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Not, Repository } from 'typeorm';
import { MonitorEntity } from '../database/entities/MonitorEntity';
import { MonitorIntegrationEntity } from '../database/entities/MonitorIntegrationEntity';
import { AuthGuard } from '../middlewares/auth.guard';
import { PlanService } from '../services/plan.service';
import momentTz from 'moment-timezone';
import formatDate from '../utils/formatDate';
import formatSince from '../utils/formatSince';
import removeAccents from '../utils/removeAccents';

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
    private dataSource: DataSource,
    private planService: PlanService
  ) { }

  @Post("/")
  async createMonitor(@Request() request: Request, @Body() body: any) {
    await this.planService.assertMonitorLimit(request["loggedPlan"], request["loggedUser"]);
    await this.planService.assertIntervalAllowed(request["loggedPlan"], body.intervalId);

    const monitorWithSameAddress = await this.monitorRepository.findOne({
      where: {
        created_user_id: request["loggedUser"],
        address: body.address
      },
      select: ["id", "name"]
    })

    if (monitorWithSameAddress) {
      throw new ConflictException(`Já existe um monitor '${monitorWithSameAddress.name}' com este endereço.`)
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const newMonitor = this.monitorRepository.create({
        name: body.name,
        type: body.type,
        address: body.address,
        active: body.active,
        interval_id: body.intervalId,
        created_user_id: request["loggedUser"],
        updated_user_id: request["loggedUser"]
      });

      await queryRunner.manager.save(MonitorEntity, newMonitor);

      const newMonitorIntegrationList = body.integrationList.map((integrationId: string) => {
        return this.monitorIntegrationRepository.create({
          monitor_id: newMonitor.id,
          integration_id: integrationId,
          created_user_id: request["loggedUser"],
          updated_user_id: request["loggedUser"]
        });
      });

      await queryRunner.manager.save(MonitorIntegrationEntity, newMonitorIntegrationList);
      await queryRunner.commitTransaction();

      return {
        message: "Monitor criado com sucesso.",
        data: {
          id: newMonitor.id
        }
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
      search = removeAccents(search).toLowerCase();
    }

    const results = await Promise.all([
      this.dataSource.query(`
        with dates as (
          select generate_series(
            (current_timestamp at time zone 'America/Sao_Paulo')::date - interval '29 days',
            (current_timestamp at time zone 'America/Sao_Paulo')::date,
            '1 day'::interval
          )::date as date
        ),
        hist_agg as (
          select
            monitor_id,
            (created_at at time zone 'America/Sao_Paulo')::date as check_date,
            count(case when status like '2%' then 1 end) as total_online,
            count(case when status not like '2%' then 1 end) as total_offline
          from monitor_historical
          where created_at >= (current_timestamp at time zone 'America/Sao_Paulo')::date - interval '29 days'
          group by monitor_id, (created_at at time zone 'America/Sao_Paulo')::date
        ),
        last_check as (
          select distinct on (monitor_id) monitor_id, created_at, status, total_ms
          from monitor_historical
          order by monitor_id, created_at desc
        )
        select
          mon.id
          , mon.name
          , mon.type
          , mon.address
          , mon.active
          , (
              select array_agg(json_build_object(
                'date', d.date
                , 'totalOnline', coalesce(h.total_online, 0)
                , 'totalOffline', coalesce(h.total_offline, 0)
              ) order by d.date)
              from dates d
              left join hist_agg h on h.monitor_id = mon.id and h.check_date = d.date
            ) as "historical"
          , ite.name as interval
          , to_char(lc.created_at at time zone 'America/Sao_Paulo', 'dd/mm/yyyy hh24:mi') as "lastCheck"
          , lc.status as "lastStatus"
          , lc.total_ms as "lastDuration"
          , coalesce((select coalesce(t.ended_at, t.created_at) from incidents t where t.monitor_id = mon.id order by t.created_at desc limit 1), mon.created_at) as "lastIncident"
          , count(*) over() as total
        from monitors mon
        join intervals ite on ite.id = mon.interval_id
        left join last_check lc on lc.monitor_id = mon.id
        where mon.created_user_id = '${request["loggedUser"]}'
        and ($1::text is null or lower(trim(unaccent(mon.name))) like $1 or lower(trim(unaccent(mon.address))) like $1)
        order by mon.active desc, (case when lc.status is null then 1 when lc.status not like '2%%' then 0 else -1 end) desc, mon.created_at desc
        limit ${this.querySize} offset ${this.querySize * parseInt(page)}
      `, [search ? `%${search}%` : null]),
      this.dataSource.query(`
        with last_check as (
          select distinct on (monitor_id) monitor_id, status
          from monitor_historical
          order by monitor_id, created_at desc
        )
        select
          count(case when mon.active = true and lc.status like '2%' then 1 end) as "totalUp",
          count(case when mon.active = true and lc.status not like '2%' and lc.status is not null then 1 end) as "totalDown",
          count(case when mon.active = false then 1 end) as "totalPaused",
          count(case when mon.active = true then 1 end) as "totalMonitoring",
          count(1) as "totalMonitors"
        from monitors mon
        left join last_check lc on lc.monitor_id = mon.id
        where mon.created_user_id = '${request["loggedUser"]}'
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

    const extrasRow = results[1][0];

    return {
      data: list,
      pagination: {
        rows: this.querySize,
        total: parseInt(list[0]?.total ?? 0)
      },
      extras: {
        totalUp: parseInt(extrasRow.totalUp) || 0,
        totalDown: parseInt(extrasRow.totalDown) || 0,
        totalPaused: parseInt(extrasRow.totalPaused) || 0,
        totalMonitoring: parseInt(extrasRow.totalMonitoring) || 0,
        totalMonitors: parseInt(extrasRow.totalMonitors) || 0,
      }
    }
  }

  @Get("/:id")
  async getMonitorById(@Request() request: Request, @Param("id") id: string) {
    const monitor = await this.monitorRepository.findOne({
      where: {
        created_user_id: request["loggedUser"],
        id: id
      },
      select: ["id", "name", "type", "interval_id", "address", "active", "created_at", "updated_at"]
    }).catch(_ => {
      throw new NotFoundException("Monitor não encontrado.");
    })

    if (!monitor) {
      throw new NotFoundException("Monitor não encontrado.");
    }

    monitor["integrationList"] = await this.dataSource.query(`
      select int.id, int.name, cha.description as "chatPlatform", cha.icon_url as "chatPlatformIconUrl"
      from monitor_integrations min
      join integrations int on int.id = min.integration_id
      join chat_platforms cha on cha.id = int.chat_platform_id
      where min.monitor_id = '${monitor.id}'
    `);

    return monitor
  }

  @Put("/:id")
  async updateMonitor(@Request() request: Request, @Body() body: any, @Param("id") id: string) {
    const monitor = await this.monitorRepository.findOne({
      where: {
        created_user_id: request["loggedUser"],
        id: id
      },
      select: ["id"]
    })

    if (!monitor) {
      throw new NotFoundException("Monitor não encontrado.");
    }

    await this.planService.assertIntervalAllowed(request["loggedPlan"], body.intervalId);

    const monitorWithSameAddress = await this.monitorRepository.findOne({
      where: {
        created_user_id: request["loggedUser"],
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
        interval_id: body.intervalId,
        updated_user_id: request["loggedUser"]
      });

      // Delete monitor x integrations removed by user
      await this.monitorIntegrationRepository.delete({
        monitor_id: monitor.id,
        integration_id: Not(In(body.integrationList))
      })

      // Save monitor x integrations added by user
      const integrationListToSave = body.integrationList.map(integrationId => {
        return this.monitorIntegrationRepository.create({
          monitor_id: monitor.id,
          integration_id: integrationId,
          created_user_id: request["loggedUser"],
          updated_user_id: request["loggedUser"]
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
        created_user_id: request["loggedUser"],
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

  @Get("/:id/historical")
  async getMonitorHistoricalById(@Request() request: Request, @Param("id") id: string) {
    const monitor = await this.monitorRepository.findOne({
      where: {
        created_user_id: request["loggedUser"],
        id: id
      },
      select: ["id"]
    })

    if (!monitor) {
      throw new NotFoundException("Monitor não encontrado.");
    }

    const [lastCheckRows, historicalDaysRows, avgMetricsRows, recentIncidentsRows, responseTime24hRows] = await Promise.all([
      this.dataSource.query(`
        select
          his.dns_ms as "lastDns"
          , his.tcp_ms as "lastTcp"
          , his.tls_ms as "lastTls"
          , his.ttfb_ms as "lastTtfb"
          , his.total_ms as "lastDuration"
          , his.status as "lastStatus"
          , to_char(his.created_at at time zone 'America/Sao_Paulo', 'dd/mm/yyyy hh24:mi') as "lastCheckedAt"
        from monitor_historical his
        where his.monitor_id = $1
        order by his.created_at desc
        limit 1
      `, [monitor.id]),
      this.dataSource.query(`
        with dates as (
          select generate_series(
            (current_timestamp at time zone 'America/Sao_Paulo')::date - interval '29 days',
            (current_timestamp at time zone 'America/Sao_Paulo')::date,
            '1 day'::interval
          )::date as date
        ),
        hist_agg as (
          select
            (created_at at time zone 'America/Sao_Paulo')::date as check_date,
            count(case when status like '2%' then 1 end) as total_online,
            count(case when status not like '2%' then 1 end) as total_offline
          from monitor_historical
          where monitor_id = $1
          and created_at >= (current_timestamp at time zone 'America/Sao_Paulo')::date - interval '29 days'
          group by (created_at at time zone 'America/Sao_Paulo')::date
        )
        select array_agg(json_build_object(
          'date', d.date,
          'totalOnline', coalesce(h.total_online, 0),
          'totalOffline', coalesce(h.total_offline, 0)
        ) order by d.date) as historical
        from dates d
        left join hist_agg h on h.check_date = d.date
      `, [monitor.id]),
      this.dataSource.query(`
        select
          round(avg(dns_ms))::int as "avgDns"
          , round(avg(tcp_ms))::int as "avgTcp"
          , round(avg(tls_ms))::int as "avgTls"
          , round(avg(ttfb_ms))::int as "avgTtfb"
          , round(avg(total_ms))::int as "avgTotal"
        from monitor_historical
        where monitor_id = $1
        and created_at >= now() - interval '30 days'
        and total_ms is not null
      `, [monitor.id]),
      this.dataSource.query(`
        select
          inc.id
          , inc.active
          , inc.created_at
          , inc.ended_at
          , (
              select his.status
              from monitor_historical his
              where his.incident_id = inc.id
              order by his.created_at asc
              limit 1
            ) as "firstError"
        from incidents inc
        where inc.monitor_id = $1
        order by inc.created_at desc
        limit 5
      `, [monitor.id]),
      this.dataSource.query(`
        with hours as (
          select generate_series(
            date_trunc('hour', now() - interval '23 hours'),
            date_trunc('hour', now()),
            '1 hour'::interval
          ) as hour
        )
        select
          to_char(h.hour at time zone 'America/Sao_Paulo', 'HH24:MI') as label
          , coalesce(round(avg(his.total_ms))::int, 0) as "avgTotal"
        from hours h
        left join monitor_historical his on
          his.monitor_id = $1
          and date_trunc('hour', his.created_at) = h.hour
          and his.total_ms is not null
        group by h.hour
        order by h.hour
      `, [monitor.id])
    ]);

    const historicalDays: any[] = historicalDaysRows[0]?.historical ?? [];
    let totalPercentOnline = 0;

    for (const day of historicalDays) {
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

    const totalDaysWithData = historicalDays.filter(item => (item.percentOnline + item.percentOffline) > 0).length;
    const percentOnline = totalDaysWithData ? parseFloat((totalPercentOnline / totalDaysWithData).toFixed(2)) : 0;

    for (const incident of recentIncidentsRows) {
      if (incident.ended_at) {
        incident['duration'] = formatSince(incident.created_at, 'YYYY-MM-DD HH:mm:ssZ', momentTz(incident.ended_at, 'YYYY-MM-DD HH:mm:ssZ'));
      } else {
        incident['duration'] = formatSince(incident.created_at, 'YYYY-MM-DD HH:mm:ssZ');
      }
    }

    return {
      lastCheck: lastCheckRows[0] ?? null,
      historicalDays,
      percentOnline,
      avgMetrics: avgMetricsRows[0] ?? null,
      recentIncidents: recentIncidentsRows,
      responseTime24h: responseTime24hRows
    }
  }
}
