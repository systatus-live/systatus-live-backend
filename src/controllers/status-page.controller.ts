import { Body, ConflictException, Controller, Get, NotFoundException, Param, Post, Put, Request, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { StatusPageEntity } from '../database/entities/StatusPageEntity';
import { StatusPageMonitorEntity } from '../database/entities/StatusPageMonitorEntity';
import { AuthGuard } from '../middlewares/auth.guard';
import { AuthService } from '../services/auth.service';
import { PermissionEnum } from '../types/PermissionEnum';
import formatDate from '../utils/formatDate';
import formatSince from '../utils/formatSince';
import normalizeSlug from '../utils/normalizeSlug';
import { PlanEntity } from 'src/database/entities/PlanEntity';
import { SubscriptionEntity } from 'src/database/entities/SubscriptionEntity';
import { SubscriptionStatusEnum } from 'src/types/SubscriptionStatusEnum';

@Controller({
  version: "1",
  path: "/status-page"
})
export class StatusPageController {
  @InjectRepository(StatusPageEntity) private statusPageRepository: Repository<StatusPageEntity>;
  @InjectRepository(StatusPageMonitorEntity) private statusPageMonitorRepository: Repository<StatusPageMonitorEntity>;
  @InjectRepository(PlanEntity) private planRepository: Repository<PlanEntity>;
  @InjectRepository(SubscriptionEntity) private subscriptionRepository: Repository<SubscriptionEntity>;

  constructor(
    private dataSource: DataSource,
    private authService: AuthService
  ) { }

  @Get("/public/:slug")
  async getPublicStatusPage(@Param("slug") slug: string) {
    const statusPage = await this.statusPageRepository.findOne({
      where: {
        slug,
        active: true
      },
      relations: ["user"]
    });

    if (!statusPage) {
      throw new NotFoundException("Página de status não encontrada.");
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: {
        user_id: statusPage.user_id,
        status: In([SubscriptionStatusEnum.ACTIVE, SubscriptionStatusEnum.UPGRADED])
      },
      relations: ["plan"],
      order: {
        created_at: "DESC"
      }
    })

    if (!await this.authService.hasPermission(subscription?.plan_id!, PermissionEnum.STATUS_PAGE)) {
      throw new NotFoundException("Página de status não encontrada.");
    }

    const monitors = await this.dataSource.query(`
      with dates as (
        select generate_series(
          (current_timestamp at time zone 'America/Sao_Paulo')::date - interval '29 days',
          (current_timestamp at time zone 'America/Sao_Paulo')::date,
          '1 day'::interval
        )::date as date
      ),
      hist_agg as (
        select
          monitor_id,
          (created_at at time zone 'America/Sao_Paulo')::date as check_date,
          count(case when status like '2%' then 1 end) as total_online,
          count(case when status not like '2%' then 1 end) as total_offline
        from monitor_historical
        where created_at >= (current_timestamp at time zone 'America/Sao_Paulo')::date - interval '29 days'
        group by monitor_id, (created_at at time zone 'America/Sao_Paulo')::date
      ),
      last_check as (
        select distinct on (monitor_id)
          monitor_id, created_at, status, duration
        from monitor_historical
        order by monitor_id, created_at desc
      )
      select
        mon.id
        , mon.name
        , mon.type
        , mon.address
        , ite.name as interval
        , lc.status as "lastStatus"
        , lc.duration as "lastDuration"
        , coalesce((select coalesce(t.ended_at, t.created_at) from incidents t where t.monitor_id = mon.id order by t.created_at desc limit 1), mon.created_at) as "lastIncident"
        , (
            select array_agg(json_build_object(
              'date', d.date
              , 'totalOnline', coalesce(h.total_online, 0)
              , 'totalOffline', coalesce(h.total_offline, 0)
            ) order by d.date)
            from dates d
            left join hist_agg h on h.monitor_id = mon.id and h.check_date = d.date
          ) as "historical"
      from monitors mon
      join intervals ite on ite.id = mon.interval_id
      join status_page_monitors spm on spm.monitor_id = mon.id and spm.status_page_id = '${statusPage.id}'
      left join last_check lc on lc.monitor_id = mon.id
      where mon.active = true
      order by (case when lc.status is null then 1 when lc.status not like '2%%' then 0 else -1 end) desc, mon.created_at desc
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
      owner: statusPage.user.name,
      monitors: monitors
    };
  }

  @Get("/")
  @UseGuards(AuthGuard)
  async getStatusPage(@Request() request: Request) {
    await this.authService.assertPermission(request["loggedPlan"], PermissionEnum.STATUS_PAGE, "Seu plano não inclui página de status pública. Considere fazer upgrade.");

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
    await this.authService.assertPermission(request["loggedPlan"], PermissionEnum.STATUS_PAGE, "Seu plano não inclui página de status pública. Considere fazer upgrade.");

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
    await this.authService.assertPermission(request["loggedPlan"], PermissionEnum.STATUS_PAGE, "Seu plano não inclui página de status pública. Considere fazer upgrade.");

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
