import { BadRequestException, Body, ConflictException, Controller, Delete, Get, InternalServerErrorException, NotFoundException, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Not, Repository } from 'typeorm';
import { MonitorEntity } from '../database/entities/MonitorEntity';
import { MonitorIntegrationEntity } from '../database/entities/MonitorIntegrationEntity';
import { AuthGuard } from '../middlewares/auth.guard';
import { PlanService } from '../services/plan.service';
import { MonitorHistoryStatusEnum } from '../types/MonitorHistoryStatusEnum';
import { MonitorTypeEnum } from '../types/MonitorTypeEnum';
import formatDate from '../utils/formatDate';
import formatSince from '../utils/formatSince';
import removeAccents from '../utils/removeAccents';
import calcDuration from '../utils/calcDuration';

@Controller({
  version: "1",
  path: "/monitors"
})
@UseGuards(AuthGuard)
export class MonitorController {
  private querySize: number = parseInt(process.env.QUERY_SIZE as string);

  constructor(
    private dataSource: DataSource,
    private planService: PlanService,
    @InjectRepository(MonitorEntity) private monitorRepository: Repository<MonitorEntity>,
    @InjectRepository(MonitorIntegrationEntity) private monitorIntegrationRepository: Repository<MonitorIntegrationEntity>
  ) { }

  private calcHistoricalDays(historical: any[]): number {
    let totalPercentOnline = 0;

    for (const day of historical) {
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

    const totalDaysWithData = historical.filter(item => (item.percentOnline + item.percentOffline) > 0).length;
    return totalDaysWithData ? parseFloat((totalPercentOnline / totalDaysWithData).toFixed(2)) : 0;
  }

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

    const [list, [extrasRow], [{ total }]] = await Promise.all([
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
            mh.monitor_id,
            (mh.created_at at time zone 'America/Sao_Paulo')::date as check_date,
            count(case when mh.status = '${MonitorHistoryStatusEnum.SUCCESS}' then 1 end) as total_online,
            count(case when mh.status = '${MonitorHistoryStatusEnum.ERROR}' then 1 end) as total_offline
          from monitor_historical mh
          join monitors m on m.id = mh.monitor_id and m.created_user_id = '${request["loggedUser"]}'
          where mh.created_at >= (current_timestamp at time zone 'America/Sao_Paulo')::date - interval '29 days'
          group by mh.monitor_id, (mh.created_at at time zone 'America/Sao_Paulo')::date
        ),
        last_check as (
          select lc.monitor_id, lc.created_at, lc.status, lc.http_status, lc.total_ms
          from monitors m
          join lateral (
            select mh.monitor_id, mh.created_at, mh.status, mh.http_status, mh.total_ms
            from monitor_historical mh
            where mh.monitor_id = m.id
            order by mh.created_at desc
            limit 1
          ) lc on true
          where m.created_user_id = '${request["loggedUser"]}'
        ),
        monitor_history_json as materialized (
          select
            mon.id as monitor_id,
            array_agg(json_build_object(
              'date', d.date
              , 'totalOnline', coalesce(ha.total_online, 0)
              , 'totalOffline', coalesce(ha.total_offline, 0)
            ) order by d.date) as historical
          from monitors mon
          cross join dates d
          left join hist_agg ha on ha.monitor_id = mon.id and ha.check_date = d.date
          where mon.created_user_id = '${request["loggedUser"]}'
          group by mon.id
        ),
        last_incident as (
          select distinct on (inc.monitor_id) inc.monitor_id, coalesce(inc.ended_at, inc.created_at) as last_incident_at
          from incidents inc
          join monitors m on m.id = inc.monitor_id and m.created_user_id = '${request["loggedUser"]}'
          order by inc.monitor_id, inc.created_at desc
        )
        select
          mon.id
          , mon.name
          , mon.type
          , mon.address
          , mon.active
          , mhj.historical
          , ite.name as interval
          , to_char(lc.created_at at time zone 'America/Sao_Paulo', 'dd/mm/yyyy hh24:mi') as "lastCheck"
          , lc.http_status as "lastHttpStatus"
          , lc.status as "lastStatus"
          , round(lc.total_ms::numeric, 2) as "lastDuration"
          , coalesce(li.last_incident_at, mon.created_at) as "lastIncident"
        from monitors mon
        join intervals ite on ite.id = mon.interval_id
        left join last_check lc on lc.monitor_id = mon.id
        left join monitor_history_json mhj on mhj.monitor_id = mon.id
        left join last_incident li on li.monitor_id = mon.id
        where mon.created_user_id = '${request["loggedUser"]}'
        and ($1::text is null or lower(trim(unaccent(mon.name))) like $1 or lower(trim(unaccent(mon.address))) like $1)
        order by mon.active desc, (case when lc.status is null then 1 when lc.status = '${MonitorHistoryStatusEnum.ERROR}' then 0 else -1 end) desc, mon.created_at desc
        limit ${this.querySize} offset ${this.querySize * parseInt(page)}
      `, [search ? `%${search}%` : null]),
      this.dataSource.query(`
        with last_check as (
          select lc.monitor_id, lc.status
          from monitors m
          join lateral (
            select mh.monitor_id, mh.status
            from monitor_historical mh
            where mh.monitor_id = m.id
            order by mh.created_at desc
            limit 1
          ) lc on true
          where m.created_user_id = '${request["loggedUser"]}'
        )
        select
          count(case when mon.active = true and lc.status = '${MonitorHistoryStatusEnum.SUCCESS}' then 1 end) as "totalUp",
          count(case when mon.active = true and lc.status = '${MonitorHistoryStatusEnum.ERROR}' then 1 end) as "totalDown",
          count(case when mon.active = false then 1 end) as "totalPaused",
          count(case when mon.active = true then 1 end) as "totalMonitoring",
          count(1) as "totalMonitors"
        from monitors mon
        left join last_check lc on lc.monitor_id = mon.id
        where mon.created_user_id = '${request["loggedUser"]}'
      `),
      this.dataSource.query(`
        select count(*) as total
        from monitors mon
        where mon.created_user_id = '${request["loggedUser"]}'
        and ($1::text is null or lower(trim(unaccent(mon.name))) like $1 or lower(trim(unaccent(mon.address))) like $1)
      `, [search ? `%${search}%` : null]),
    ]);

    for (let row of list) {
      row["percentOnline"] = this.calcHistoricalDays(row.historical);

      if (row.lastIncident) {
        row.lastIncident = formatSince(row.lastIncident, "YYYY-MM-DD HH:mm:ssZ");
      }
    }

    return {
      data: list,
      pagination: {
        rows: this.querySize,
        total: parseInt(total ?? 0)
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
      where min.monitor_id = $1
    `, [monitor.id]);

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
    }).catch(_ => {
      throw new NotFoundException("Monitor não encontrado.");
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
      if (body.integrationList.length === 0) {
        await queryRunner.manager.delete(MonitorIntegrationEntity, {
          monitor_id: monitor.id
        });
      } else {
        await queryRunner.manager.delete(MonitorIntegrationEntity, {
          monitor_id: monitor.id,
          integration_id: Not(In(body.integrationList))
        });
      }

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
    }).catch(_ => {
      throw new NotFoundException("Monitor não encontrado.");
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
      select: ["id", "type"]
    }).catch(_ => {
      throw new NotFoundException("Monitor não encontrado.");
    })

    if (!monitor) {
      throw new NotFoundException("Monitor não encontrado.");
    }

    const isPing = monitor.type === MonitorTypeEnum.PING;

    const [lastCheckRows, historicalDaysRows, avgMetricsRows, recentIncidentsRows, responseTime24hRows] = await Promise.all([
      // lastCheckRows
      isPing
        ? this.dataSource.query(`
            select
              round(his.ping_packet_loss::numeric, 2) as "lastPacketLoss"
              , round(his.ping_avg_ms::numeric, 2) as "lastAvgMs"
              , round(his.ping_min_ms::numeric, 2) as "lastMinMs"
              , round(his.ping_max_ms::numeric, 2) as "lastMaxMs"
              , his.http_status as "lastHttpStatus"
              , his.status as "lastStatus"
              , to_char(his.created_at at time zone 'America/Sao_Paulo', 'dd/mm/yyyy hh24:mi') as "lastCheckedAt"
            from monitor_historical his
            where his.monitor_id = $1
            order by his.created_at desc
            limit 1
          `, [monitor.id])
        : this.dataSource.query(`
            select
              round(his.dns_ms::numeric, 2) as "lastDns"
              , round(his.tcp_ms::numeric, 2) as "lastTcp"
              , round(his.tls_ms::numeric, 2) as "lastTls"
              , round(his.ttfb_ms::numeric, 2) as "lastTtfb"
              , round(his.total_ms::numeric, 2) as "lastDuration"
              , his.http_status as "lastHttpStatus"
              , his.status as "lastStatus"
              , to_char(his.created_at at time zone 'America/Sao_Paulo', 'dd/mm/yyyy hh24:mi') as "lastCheckedAt"
            from monitor_historical his
            where his.monitor_id = $1
            order by his.created_at desc
            limit 1
          `, [monitor.id]),
      // historicalDaysRows
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
            count(case when status = '${MonitorHistoryStatusEnum.SUCCESS}' then 1 end) as total_online,
            count(case when status = '${MonitorHistoryStatusEnum.ERROR}' then 1 end) as total_offline
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
      // avgMetricsRows
      isPing
        ? this.dataSource.query(`
            select
              round(avg(ping_avg_ms)::numeric, 2) as "avgMs"
              , round(avg(ping_min_ms)::numeric, 2) as "avgMinMs"
              , round(avg(ping_max_ms)::numeric, 2) as "avgMaxMs"
              , round(avg(ping_packet_loss)::numeric, 2) as "avgPacketLoss"
            from monitor_historical
            where monitor_id = $1
            and created_at >= now() - interval '7 days'
            and ping_avg_ms is not null
          `, [monitor.id])
        : this.dataSource.query(`
            select
              round(avg(dns_ms)::numeric, 2) as "avgDns"
              , round(avg(tcp_ms)::numeric, 2) as "avgTcp"
              , round(avg(tls_ms)::numeric, 2) as "avgTls"
              , round(avg(ttfb_ms)::numeric, 2) as "avgTtfb"
              , round(avg(total_ms)::numeric, 2) as "avgTotal"
            from monitor_historical
            where monitor_id = $1
            and created_at >= now() - interval '7 days'
            and total_ms is not null
          `, [monitor.id]),
      // recentIncidentsRows
      this.dataSource.query(`
        select
          inc.id
          , inc.active
          , inc.created_at
          , inc.ended_at
          , first_status.http_status as "firstError"
        from incidents inc
        left join lateral (
          select his.http_status
          from monitor_historical his
          where his.monitor_id = $1
            and his.incident_id = inc.id
          order by his.created_at asc
          limit 1
        ) first_status on true
        where inc.monitor_id = $1
        order by inc.created_at desc
        limit 5
      `, [monitor.id]),
      // responseTime24hRows
      isPing
        ? this.dataSource.query(`
            with hours as (
              select generate_series(
                date_trunc('hour', now() - interval '23 hours'),
                date_trunc('hour', now()),
                '1 hour'::interval
              ) as hour
            )
            select
              to_char(h.hour at time zone 'America/Sao_Paulo', 'HH24:MI') as label
              , coalesce(round(avg(his.ping_avg_ms)::numeric, 2), 0) as "avgTotal"
            from hours h
            left join monitor_historical his on
              his.monitor_id = $1
              and date_trunc('hour', his.created_at) = h.hour
              and his.ping_avg_ms is not null
            group by h.hour
            order by h.hour
          `, [monitor.id])
        : this.dataSource.query(`
            with hours as (
              select generate_series(
                date_trunc('hour', now() - interval '23 hours'),
                date_trunc('hour', now()),
                '1 hour'::interval
              ) as hour
            )
            select
              to_char(h.hour at time zone 'America/Sao_Paulo', 'HH24:MI') as label
              , coalesce(round(avg(his.total_ms)::numeric, 2), 0) as "avgTotal"
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
    const percentOnline = this.calcHistoricalDays(historicalDays);

    for (const incident of recentIncidentsRows) {
      incident['duration'] = calcDuration(incident.created_at, incident.ended_at);
    }

    return {
      lastCheck: lastCheckRows[0] ?? null,
      historicalDays: historicalDays,
      percentOnline: percentOnline,
      avgMetrics: avgMetricsRows[0] ?? null,
      recentIncidents: recentIncidentsRows,
      responseTime24h: responseTime24hRows
    }
  }
}
