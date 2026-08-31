import { BadRequestException, Controller, Get, NotFoundException, Param, Query, Request, UseGuards } from '@nestjs/common';
import { DataSource, IsNull, Repository } from 'typeorm';
import { AuthGuard } from '../middlewares/auth.guard';
import removeAccents from '../utils/removeAccents';
import calcDuration from '../utils/calcDuration';
import { IncidentEntity } from 'src/database/entities/IncidentEntity';
import { InjectRepository } from '@nestjs/typeorm';

@Controller({
  version: "1",
  path: "/incidents"
})
@UseGuards(AuthGuard)
export class IncidentController {
  private querySize: number = parseInt(process.env.QUERY_SIZE as string);

  constructor(
    private dataSource: DataSource,
    @InjectRepository(IncidentEntity) private incidentRepository: Repository<IncidentEntity>
  ) { }

  @Get("/")
  async getIncidentList(@Request() request: Request, @Query("page") page: string, @Query("search") search: string) {
    if (page == null || isNaN(parseInt(page)) || parseInt(page) < 0) {
      throw new BadRequestException("Informe o parâmetro numérico 'page >= 0'");
    }

    if (search) {
      search = removeAccents(search).toLowerCase();
    }

    const [list, totalNotResolved] = await Promise.all([
      this.dataSource.query(`
        select
          inc.id
          , mon.name
          , mon.address
          , inc.created_at
          , inc.ended_at
          , (select t.status from monitor_historical t where t.monitor_id = mon.id and t.incident_id = inc.id and t.status not like '2%' order by created_at asc limit 1) as "firstError"
          , (select t.status from monitor_historical t where t.monitor_id = mon.id and t.incident_id = inc.id order by created_at desc limit 1) as "status"
          , count(*) over() as total
        from incidents inc
        join monitors mon on mon.id = inc.monitor_id
        where created_user_id = '${request["loggedUser"]}'
        and ($1::text is null or lower(trim(unaccent(mon.name))) like $1 or lower(trim(unaccent(mon.address))) like $1)
        order by inc.ended_at desc
        limit ${this.querySize} offset ${this.querySize * parseInt(page)}
      `, [search ? `%${search}%` : null]),
      this.incidentRepository.count({
        relations: {
          monitor: true
        },
        where: {
          ended_at: IsNull(),
          monitor: {
            created_user_id: request["loggedUser"]
          }
        },
      })
    ]);

    for (let row of list) {
      row["duration"] = calcDuration(row.created_at, row.ended_at);
    }

    return {
      data: list,
      pagination: {
        rows: this.querySize,
        total: parseInt(list[0]?.total ?? 0)
      },
      extras: {
        totalNotResolved: totalNotResolved
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
    const incident = await this.incidentRepository.findOne({
      relations: {
        monitor: true
      },
      where: {
        monitor: {
          created_user_id: request["loggedUser"],
        },
        id: id
      },
      select: {
        id: true,
        active: true,
        created_at: true,
        ended_at: true,
        monitor: {
          id: true,
          name: true,
          type: true,
          address: true
        }
      },
    }).catch(_ => {
      throw new NotFoundException("Incidente não encontrado.");
    })

    if (!incident) {
      throw new NotFoundException("Incidente não encontrado.");
    }

    incident["duration"] = calcDuration(incident.created_at, incident.ended_at);

    const [extraRow] = await this.dataSource.query(`
      select
        (select t.status from monitor_historical t where t.incident_id = $1 and t.status not like '2%' order by t.created_at asc limit 1) as "firstError",
        (select t.status from monitor_historical t where t.incident_id = $1 order by t.created_at desc limit 1) as "status",
        (select t.request_headers from monitor_historical t where t.incident_id = $1 and t.request_headers is not null order by t.created_at desc limit 1) as "lastRequestHeaders",
        (select t.response_headers from monitor_historical t where t.incident_id = $1 and t.response_headers is not null order by t.created_at desc limit 1) as "lastResponseHeaders"
    `, [incident.id]);

    incident["firstError"] = extraRow.firstError;
    incident["status"] = extraRow.status;
    incident["lastRequestHeaders"] = extraRow.lastRequestHeaders;
    incident["lastResponseHeaders"] = extraRow.lastResponseHeaders;

    return incident
  }

  @Get("/:id/historical")
  async getIncidentHistoricalById(@Request() request: Request, @Param("id") id: string, @Query("page") page: string) {
    const incident = await this.incidentRepository.findOne({
      where: {
        monitor: {
          created_user_id: request["loggedUser"],
        },
        id: id
      }
    }).catch(_ => {
      throw new NotFoundException("Incidente não encontrado.");
    })

    if (!incident) {
      throw new NotFoundException("Incidente não encontrado.");
    }

    if (page == null || isNaN(parseInt(page)) || parseInt(page) < 0) {
      throw new BadRequestException("Informe o parâmetro numérico 'page >= 0'");
    }

    const historical = await this.dataSource.query(`
      select
        his.id
        , his.status
        , round(his.total_ms::numeric, 2) as total_ms
        , his.created_at
        , count(*) over() as total
      from monitor_historical his
      where his.incident_id = $1
      order by his.created_at desc
      limit ${this.querySize} offset ${this.querySize * parseInt(page)}
    `, [incident.id]);

    return {
      data: historical,
      pagination: {
        rows: this.querySize,
        total: parseInt(historical[0]?.total ?? 0)
      }
    }
  }
}
