import { Controller, Get, Request, UseGuards } from "@nestjs/common";
import { DataSource } from "typeorm";
import { AuthGuard } from "../guards/auth/auth.guard";
import formatSince from "../utils/formatSince";

@Controller({
  version: "1",
  path: "/statistics"
})
@UseGuards(AuthGuard)
export class StatisticsController {
  constructor(
    private dataSource: DataSource
  ) { }

  @Get("/panels")
  async getPanelStatistics(@Request() request: Request) {
    const activeIncidentList = await this.dataSource.query(`
      select 
        mon.name
        , mon.address
        , inc."createdAt" 
        , (select t.status from monitor_historical t where t."monitorId" = mon.id and t."incidentId" = inc.id and t.status not like '2%' order by "createdAt" desc limit 1) as "lastStatus"
      from monitor_incidents inc
      join monitors mon on mon.id = inc."monitorId" 
      where "createdUserId" = '${request["loggedUser"]}'
      and inc.active = true
      and mon.active = true
      order by inc."createdAt" asc
    `);

    activeIncidentList.forEach(row => {
      row.duration = formatSince(row.createdAt, "YYYY-MM-DD HH:mm:ssZ");
    })

    const monthIncidentList = await this.dataSource.query(`
      with days as (
        select generate_series(current_date - interval '30 days', current_date, interval '1 day')::date as day
      )
      select to_char(d.day, 'dd/mm') as date, count(mi.id) as total
      from days d
      left join monitor_incidents mi on (mi."createdAt"::timestamptz)::date = d.day and mi."monitorId" in (select t.id from monitors t where t."createdUserId" = '${request["loggedUser"]}')
      group by d.day
      order by d.day asc
    `);

    const total = await this.dataSource.query(`
      select t.*
      from (
        select 1 as index, 'Monitores' as label, (select count(1) from monitors where "createdUserId" = '${request["loggedUser"]}') as value
        union
        select 2 as index, 'Integrações' as label, (select count(1) from integrations where "createdUserId" = '${request["loggedUser"]}') as value
      ) t
      order by t.index asc
    `);

    return {
      activeIncidentList: activeIncidentList,
      monthIncidentList: monthIncidentList,
      total: total
    }
  }
}