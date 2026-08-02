import { BadRequestException, Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';
import { AuthGuard } from '../middlewares/auth.guard';
import removeAccents from '../utils/removeAccents';
import formatSince from '../utils/formatSince';
import momentTz from "moment-timezone";
import { IncidentEntity } from 'src/database/entities/IncidentEntity';

@Controller({
  version: "1",
  path: "/incidents"
})
@UseGuards(AuthGuard)
export class IncidentController {
  private querySize: number = parseInt(process.env.QUERY_SIZE as string);

  constructor(
    private dataSource: DataSource
  ) { }

  @Get("/")
  async getIncidentList(@Request() request: Request, @Query("page") page: string, @Query("search") search: string) {
    if (page == null || isNaN(parseInt(page)) || parseInt(page) < 0) {
      throw new BadRequestException("Informe o parâmetro numérico 'page >= 0'");
    }

    if (search) {
      search = removeAccents(search);
    }

    const results = await Promise.all([
      this.dataSource.query(`
        select
          inc.id
          , mon.name
          , mon.address
          , inc.created_at
          , inc.ended_at
          , (
            select t.status
            from monitor_historical t
            where t.monitor_id = mon.id
            and t.incident_id = inc.id
            and t.status not like '2%'
            order by created_at desc
            limit 1
          ) as "lastError"
        from incidents inc
        join monitors mon on mon.id = inc.monitor_id
        where created_user_id = '${request["loggedUser"]}'
        and ($1::text is null or lower(trim(unaccent(mon.name))) like $1 or lower(trim(unaccent(mon.address))) like $1)
        order by inc.ended_at desc
        limit ${this.querySize} offset ${this.querySize * parseInt(page)}
      `, [search ? `%${search}%` : null]),
      this.dataSource.query(`
        select count(1) as total
        from incidents inc
        join monitors mon on mon.id = inc.monitor_id
        where mon.created_user_id = '${request["loggedUser"]}'
        and ($1::text is null or lower(trim(unaccent(mon.name))) like $1 or lower(trim(unaccent(mon.address))) like $1)
      `, [search ? `%${search}%` : null]),
    ]);

    const list = results[0];
    for (let row of list) {
      if (row.ended_at) {
        row["duration"] = formatSince(row.created_at, "YYYY-MM-DD HH:mm:ssZ", momentTz(row.ended_at, "YYYY-MM-DD HH:mm:ssZ"))
      } else {
        row["duration"] = formatSince(row.created_at, "YYYY-MM-DD HH:mm:ssZ")
      }
    }

    const totalNotResolved = await this.dataSource.getRepository(IncidentEntity).count({
      where: {
        ended_at: IsNull()
      }
    })

    return {
      data: results[0],
      pagination: {
        rows: this.querySize,
        total: parseInt(results[1][0].total)
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
}
