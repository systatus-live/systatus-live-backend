import { Body, ConflictException, Controller, Get, NotFoundException, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { StatusPageEntity } from '../database/entities/StatusPageEntity';
import { StatusPageMonitorEntity } from '../database/entities/StatusPageMonitorEntity';
import { AuthGuard } from '../middlewares/auth.guard';
import { PlanService } from '../services/plan.service';
import formatDate from '../utils/formatDate';
import formatSince from '../utils/formatSince';
import normalizeSlug from '../utils/normalizeSlug';

@Controller({
  version: "1",
  path: "/status-page"
})
export class StatusPageController {
  @InjectRepository(StatusPageEntity) private statusPageRepository: Repository<StatusPageEntity>;
  @InjectRepository(StatusPageMonitorEntity) private statusPageMonitorRepository: Repository<StatusPageMonitorEntity>;

  constructor(
    private dataSource: DataSource,
    private planService: PlanService
  ) { }

  @Get("/public/:slug")
  async getPublicStatusPage(@Param("slug") slug: string) {
    const statusPage = await this.statusPageRepository.findOne({
      where: {
        slug,
        active: true
      }
    });

    if (!statusPage) {
      throw new NotFoundException("Página de status não encontrada.");
    }

    const monitors = await this.dataSource.query(`
      select
        mon.id
        , mon.name
        , mon.type
        , mon.address
        , ite.name as interval
        , his.status as "lastStatus"
        , his.duration as "lastDuration"
        , coalesce((select coalesce(t.ended_at, t.created_at) from incidents t where t.monitor_id = mon.id order by t.created_at desc limit 1), mon.created_at) as "lastIncident"
        , (
            with dates as (
              select generate_series(current_date - interval '29 days', current_date, '1 day'::interval)::date AS date
            )
            select array_agg(json_build_object(
              'date', dat.date
              , 'totalOnline', (select count(1) from monitor_historical t where t.monitor_id = mon.id and t.created_at::date = dat.date and t.status like '2%')
              , 'totalOffline', (select count(1) from monitor_historical t where t.monitor_id = mon.id and t.created_at::date = dat.date and t.status not like '2%')
            ))
            from dates dat
          ) as "historical"
      from monitors mon
      join intervals ite on ite.id = mon.interval_id
      join status_page_monitors spm on spm.monitor_id = mon.id and spm.status_page_id = '${statusPage.id}'
      left join monitor_historical his on his.monitor_id = mon.id and his.created_at = (select max(t.created_at) from monitor_historical t where t.monitor_id = mon.id)
      where mon.active = true
      order by (case when status is null then 1 when status not like '2%%' then 0 else -1 end) desc, mon.created_at desc
    `);

    for (let row of monitors) {
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

    return {
      title: statusPage.title,
      monitors
    };
  }

  @Get("/")
  @UseGuards(AuthGuard)
  async getStatusPage(@Request() request: Request) {
    const statusPage = await this.statusPageRepository.findOne({
      where: {
        user_id: request["loggedUser"]
      }
    });

    if (!statusPage) {
      return null;
    }

    const monitorRows = await this.statusPageMonitorRepository.find({
      where: {
        status_page_id: statusPage.id
      }
    });

    return {
      ...statusPage,
      monitorIdList: monitorRows.map(row => row.monitor_id)
    };
  }

  @Post("/")
  @UseGuards(AuthGuard)
  async createStatusPage(@Request() request: Request, @Body() body: any) {
    await this.planService.assertStatusPageAllowed(request["loggedPlan"]);

    const existing = await this.statusPageRepository.findOne({
      where: {
        user_id: request["loggedUser"]
      }
    });

    if (existing) {
      throw new ConflictException("Você já possui uma página de status.");
    }

    const slug = normalizeSlug(body.slug ?? "");

    const slugInUse = await this.statusPageRepository.findOne({
      where: {
        slug
      }
    });

    if (slugInUse) {
      throw new ConflictException("Este slug já está em uso. Escolha outro.");
    }

    const newStatusPage = this.statusPageRepository.create({
      user_id: request["loggedUser"],
      slug,
      title: body.title,
      active: body.active ?? true
    });

    await this.statusPageRepository.save(newStatusPage);

    const monitorIdList: string[] = body.monitorIdList ?? [];
    for (const monitorId of monitorIdList) {
      await this.statusPageMonitorRepository.save({
        status_page_id: newStatusPage.id,
        monitor_id: monitorId
      });
    }

    return {
      message: "Página de status criada com sucesso.",
      data: {
        id: newStatusPage.id
      }
    };
  }

  @Put("/")
  @UseGuards(AuthGuard)
  async updateStatusPage(@Request() request: Request, @Body() body: any) {
    await this.planService.assertStatusPageAllowed(request["loggedPlan"]);

    const statusPage = await this.statusPageRepository.findOne({
      where: {
        user_id: request["loggedUser"]
      }
    });

    if (!statusPage) {
      throw new NotFoundException("Página de status não encontrada.");
    }

    const slug = body.slug ? normalizeSlug(body.slug) : statusPage.slug;

    if (slug !== statusPage.slug) {
      const slugInUse = await this.statusPageRepository.findOne({
        where: {
          slug
        }
      });

      if (slugInUse) {
        throw new ConflictException("Este slug já está em uso. Escolha outro.");
      }
    }

    await this.statusPageRepository.update({
      id: statusPage.id
    }, {
      slug,
      title: body.title ?? statusPage.title,
      active: body.active ?? statusPage.active
    });

    await this.statusPageMonitorRepository.delete({
      status_page_id: statusPage.id
    });

    const monitorIdList: string[] = body.monitorIdList ?? [];
    for (const monitorId of monitorIdList) {
      await this.statusPageMonitorRepository.save({
        status_page_id: statusPage.id,
        monitor_id: monitorId
      });
    }

    return {
      message: "Página de status atualizada com sucesso."
    };
  }
}
