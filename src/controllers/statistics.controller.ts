import { Body, Controller, Get, Request, UseGuards } from "@nestjs/common";
import { DataSource } from "typeorm";
import { AuthGuard } from "../guards/auth/auth.guard";

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
        , (select t.status from monitor_historical t where t."monitorId" = mon.id and t."incidentId" = inc.id and t.status not like '2%' order by "createdAt" desc limit 1)
      from monitor_incidents inc
      join monitors mon on mon.id = inc."monitorId" 
      where "createdUserId" = '${request["loggedUser"]}'
      and inc.active = true
      and mon.active = true
      order by inc."createdAt" desc
      limit 5
    `);

    const lastIncidentList = await this.dataSource.query(`
      select 
        mon.name
        , mon.address
        , inc."createdAt" 
        , (select t.status from monitor_historical t where t."monitorId" = mon.id and t."incidentId" = inc.id and t.status not like '2%' order by "createdAt" desc limit 1)
      from monitor_incidents inc
      join monitors mon on mon.id = inc."monitorId"
      where "createdUserId" = '${request["loggedUser"]}'
      and inc."createdAt" >= current_date at time zone 'UTC' - interval '7 days'
      and mon.active = true
      and inc.active = false
      order by inc."createdAt" desc
      limit 5
    `);

    return {
      totals: totals,
      currentIncidentList: currentIncidentList,
      lastIncidentList: lastIncidentList
    }
  }
}