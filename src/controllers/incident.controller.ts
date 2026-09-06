import { BadRequestException, Controller, Get, NotFoundException, Param, Query, Request, UseGuards } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthGuard } from '../middlewares/auth.guard';
import removeAccents from '../utils/removeAccents';
import calcDuration from '../utils/calcDuration';
import { MonitorHistoryStatusEnum } from '../types/MonitorHistoryStatusEnum';

@Controller({
  version: "1",
  path: "/incidents"
})
@UseGuards(AuthGuard)
export class IncidentController {
  private querySize: number = parseInt(process.env.QUERY_SIZE as string);

  constructor(
    private dataSource: DataSource,
  ) { }

  @Get("/")
  async getIncidentList(@Request() request: Request, @Query("page") page: string, @Query("search") search: string) {
    if (page == null || isNaN(parseInt(page)) || parseInt(page) < 0) {
      throw new BadRequestException("Informe o parâmetro numérico 'page >= 0'");
    }

    if (search) {
      search = removeAccents(search).toLowerCase();
    }

    const [list, [{ total }], [{ total: totalNotResolved }]] = await Promise.all([
      this.dataSource.query(`
        select
          inc.id
          , mon.name
          , mon.address
          , inc.created_at
          , inc.ended_at
          , first_err.http_status as "firstHttpError"
          , last_status.http_status as "lastHttpStatus"
        from incidents inc
        join monitors mon on mon.id = inc.monitor_id
        left join lateral (
          select http_status from monitor_historical
          where monitor_id = mon.id and incident_id = inc.id and status = '${MonitorHistoryStatusEnum.ERROR}'
          order by created_at asc limit 1
        ) first_err on true
        left join lateral (
          select http_status from monitor_historical
          where monitor_id = mon.id and incident_id = inc.id
          order by created_at desc limit 1
        ) last_status on true
        where mon.created_user_id = '${request["loggedUser"]}'
        and ($1::text is null or lower(trim(unaccent(mon.name))) like $1 or lower(trim(unaccent(mon.address))) like $1)
        order by inc.ended_at desc
        limit ${this.querySize} offset ${this.querySize * parseInt(page)}
      `, [search ? `%${search}%` : null]),
      this.dataSource.query(`
        select count(*) as total
        from incidents inc
        join monitors mon on mon.id = inc.monitor_id
        where mon.created_user_id = '${request["loggedUser"]}'
        and ($1::text is null or lower(trim(unaccent(mon.name))) like $1 or lower(trim(unaccent(mon.address))) like $1)
      `, [search ? `%${search}%` : null]),
      this.dataSource.query(`
        select count(*) as total
        from incidents inc
        join monitors mon on mon.id = inc.monitor_id
        where mon.created_user_id = '${request["loggedUser"]}'
        and inc.ended_at is null
      `),
    ]);

    for (let row of list) {
      row["duration"] = calcDuration(row.created_at, row.ended_at);
    }

    return {
      data: list,
      pagination: {
        rows: this.querySize,
        total: parseInt(total ?? 0)
      },
      extras: {
        totalNotResolved: parseInt(totalNotResolved ?? 0)
      }
    }
  }

  @Get("/historical")
  async getHistorical(@Request() request: Request) {
    const monthIncidentList = await this.dataSource.query(`
      with days as (
        select generate_series(current_date - interval '30 days', current_date, interval '1 day')::date as day
      )
      select to_char(d.day, 'dd/mm') as date, count(mi.id) as total
      from days d
      left join incidents mi on (mi.created_at::timestamptz)::date = d.day and mi.monitor_id in (select t.id from monitors t where t.created_user_id = '${request["loggedUser"]}')
      group by d.day
      order by d.day asc
    `);

    return {
      data: monthIncidentList,
    }
  }

  @Get("/:id")
  async getIncidentById(@Request() request: Request, @Param("id") id: string) {
    const [row] = await this.dataSource.query(`
      select
        inc.id
        , inc.active
        , inc.created_at
        , inc.ended_at
        , mon.id as monitor_id
        , mon.name as monitor_name
        , mon.type as monitor_type
        , mon.address as monitor_address
        , first_err.http_status as "firstHttpError"
        , last_status.http_status as "lastHttpStatus"
        , last_req.request_headers as "lastRequestHeaders"
        , last_res.response_headers as "lastResponseHeaders"
      from incidents inc
      join monitors mon on mon.id = inc.monitor_id
      left join lateral (
        select http_status from monitor_historical
        where incident_id = inc.id and status = '${MonitorHistoryStatusEnum.ERROR}'
        order by created_at asc limit 1
      ) first_err on true
      left join lateral (
        select http_status from monitor_historical
        where incident_id = inc.id
        order by created_at desc limit 1
      ) last_status on true
      left join lateral (
        select request_headers from monitor_historical
        where incident_id = inc.id and request_headers is not null
        order by created_at desc limit 1
      ) last_req on true
      left join lateral (
        select response_headers from monitor_historical
        where incident_id = inc.id and response_headers is not null
        order by created_at desc limit 1
      ) last_res on true
      where inc.id = $1
      and mon.created_user_id = $2
    `, [id, request["loggedUser"]]);

    if (!row) {
      throw new NotFoundException("Incidente não encontrado.");
    }

    return {
      id: row.id,
      active: row.active,
      created_at: row.created_at,
      ended_at: row.ended_at,
      duration: calcDuration(row.created_at, row.ended_at),
      monitor: {
        id: row.monitor_id,
        name: row.monitor_name,
        type: row.monitor_type,
        address: row.monitor_address,
      },
      firstHttpError: row.firstHttpError,
      lastHttpStatus: row.lastHttpStatus,
      lastRequestHeaders: row.lastRequestHeaders,
      lastResponseHeaders: row.lastResponseHeaders,
    };
  }

  @Get("/:id/historical")
  async getIncidentHistoricalById(@Request() request: Request, @Param("id") id: string, @Query("page") page: string) {
    if (page == null || isNaN(parseInt(page)) || parseInt(page) < 0) {
      throw new BadRequestException("Informe o parâmetro numérico 'page >= 0'");
    }

    const [historicalList, [{ total }]] = await Promise.all([
      this.dataSource.query(`
        select
          his.id
          , his.http_status
          , his.status
          , round(his.total_ms::numeric, 2) as total_ms
          , his.created_at
        from monitor_historical his
        join incidents inc on inc.id = his.incident_id
        join monitors mon on mon.id = inc.monitor_id
        where his.incident_id = $1
        and mon.created_user_id = $2
        order by his.created_at desc
        limit ${this.querySize} offset ${this.querySize * parseInt(page)}
      `, [id, request["loggedUser"]]),
      this.dataSource.query(`
        select count(*) as total
        from monitor_historical his
        join incidents inc on inc.id = his.incident_id
        join monitors mon on mon.id = inc.monitor_id
        where his.incident_id = $1
        and mon.created_user_id = $2
      `, [id, request["loggedUser"]]),
    ]);

    if (parseInt(total) === 0) {
      throw new NotFoundException("Incidente não encontrado.");
    }

    return {
      data: historicalList,
      pagination: {
        rows: this.querySize,
        total: parseInt(total ?? 0)
      }
    }
  }
}
