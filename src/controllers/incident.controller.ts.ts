import { BadRequestException, Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthGuard } from '../guards/auth/auth.guard';
import removeAccents from '../utils/removeAccents';
import formatSince from '../utils/formatSince';
import momentTz from "moment-timezone";

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
          , inc."createdAt" 
          , inc."endedAt"
          , (
            select t.status 
            from monitor_historical t 
            where t."monitorId" = mon.id 
            and t."incidentId" = inc.id
            and t.status not like '2%'
            order by "createdAt" desc 
            limit 1
          ) as "lastError"
        from incidents inc
        join monitors mon on mon.id = inc."monitorId" 
        where "createdUserId" = '${request["loggedUser"]}'
        ${search ? `and (lower(trim(unaccent(mon.name))) like '%${search}%' or lower(trim(unaccent(mon.address))) like '%${search}%')` : ""}
        order by inc."endedAt" desc
        limit ${this.querySize} offset ${this.querySize * parseInt(page)}
      `),
      this.dataSource.query(`
        select count(1) as total
        from incidents inc
        join monitors mon on mon.id = inc."monitorId" 
        where mon."createdUserId" = '${request["loggedUser"]}'
        ${search ? `and (lower(trim(unaccent(mon.name))) like '%${search}%' or lower(trim(unaccent(mon.address))) like '%${search}%')` : ""}
      `),
    ]);

    const list = results[0];
    for (let row of list) {
      if (row.endedAt) {
        row["duration"] = formatSince(row.createdAt, "YYYY-MM-DD HH:mm:ssZ", momentTz(row.endedAt, "YYYY-MM-DD HH:mm:ssZ"))
      } else {
        row["duration"] = formatSince(row.createdAt, "YYYY-MM-DD HH:mm:ssZ")
      }
    }

    return {
      data: results[0],
      pagination: {
        rows: this.querySize,
        total: parseInt(results[1][0].total)
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
        left join incidents mi on (mi."createdAt"::timestamptz)::date = d.day and mi."monitorId" in (select t.id from monitors t where t."createdUserId" = '${request["loggedUser"]}')
        group by d.day
        order by d.day asc
      `);
  
      return {
        data: monthIncidentList,
      }
    }
}
