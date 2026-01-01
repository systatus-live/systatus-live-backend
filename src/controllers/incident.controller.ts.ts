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
  async getIncidentList(@Request() request: Request, @Query("page") page: number, @Query("search") search: string) {
    if (page == null || isNaN(page) || page < 0) {
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
          , (select t.status from monitor_historical t where t."monitorId" = mon.id and t."incidentId" = inc.id order by "createdAt" desc limit 1) as "lastStatus"
        from incidents inc
        join monitors mon on mon.id = inc."monitorId" 
        where "createdUserId" = '${request["loggedUser"]}'
        ${search ? `and lower(trim(unaccent(mon.name))) like '%${search}%'` : ""}
        order by 6 desc, inc."createdAt" desc
        limit ${this.querySize} offset ${this.querySize * page}
      `),
      this.dataSource.query(`
        select count(1) as total
        from incidents inc
        join monitors mon on mon.id = inc."monitorId" 
        where mon."createdUserId" = '${request["loggedUser"]}'
        ${search ? `and lower(trim(unaccent(mon.name))) like '%${search}%'` : ""}
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
      total: results[1][0].total
    }
  }
}
