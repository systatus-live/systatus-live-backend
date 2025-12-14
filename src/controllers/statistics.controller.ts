import { Controller, Get, Request, UseGuards } from "@nestjs/common";
import { DataSource } from "typeorm";
import { AuthGuard } from "../guards/auth/auth.guard";
import formatSince from "src/utils/formatSince";
import * as momentTz from "moment-timezone";

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
    const [totals] = await this.dataSource.query(`
      select 
        (select count(1) from monitors where "createdUserId" = '${request["loggedUser"]}') as "monitors"
	    , (select count(1) from integrations where "createdUserId" = '${request["loggedUser"]}') as "integrations"
    `);

    const currentIncidentList = await this.dataSource.query(`
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
      order by inc."createdAt" desc
    `);

    currentIncidentList.forEach(row => {
      row.duration = formatSince(row.createdAt, "YYYY-MM-DD HH:mm:ssZ");
    })

    const lastIncidentList = await this.dataSource.query(`
      select 
        mon.name
        , mon.address
        , inc."createdAt" 
        , inc."endedAt" 
      from monitor_incidents inc
      join monitors mon on mon.id = inc."monitorId"
      where "createdUserId" = '${request["loggedUser"]}'
      and mon.active = true
      order by inc."createdAt" desc
    `);

    lastIncidentList.forEach(row => {
      row.duration = formatSince(row.createdAt, "YYYY-MM-DD HH:mm:ssZ", momentTz(row.endedAt, "YYYY-MM-DD HH:mm:ssZ"));
    })

    return {
      totals: totals,
      currentIncidentList: currentIncidentList,
      lastIncidentList: lastIncidentList
    }
  }
}