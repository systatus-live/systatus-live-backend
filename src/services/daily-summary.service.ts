import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { CronIntervalEnum } from '../types/CronIntervalEnum';
import formatDate from '../utils/formatDate';
import getCurrentDate from '../utils/getCurrenDate';
import { IntegrationService } from './integration.service';

@Injectable()
export class DailySummaryService {
  private readonly logger = new Logger(DailySummaryService.name);

  constructor(
    private integrationService: IntegrationService,
    private dataSource: DataSource
  ) { }

  @Cron(CronIntervalEnum.EVERY_24_HOURS, {
    name: "daily-discord-summary",
    timeZone: "America/Sao_Paulo"
  })
  async scheduleDailySummary() {
    const webhook = process.env.DISCORD_WEBHOOK?.trim();
    if (!webhook) return;

    try {
      const [totals] = await this.dataSource.query(`
        select
          (select count(*) from users) as users,
          (select count(*) from monitors) as monitors,
          (select count(*) from integrations) as integrations,
          array(
            select usr.name || ' (' || usr.email || ') - ' || coalesce('plano ' || pln.name, 'sem plano')
            from users usr
            left join lateral (
              select plan_id
              from subscriptions
              where user_id = usr.id
              order by created_at desc, id desc
              limit 1
            ) sub on true
            left join plans pln on pln.id = sub.plan_id
            order by lower(usr.name), usr.id
          ) as user_details
      `);

      const descriptions: string[] = [];
      let description = [
        `**Total de usuários:** ${totals.users}`,
        `**Total de monitores:** ${totals.monitors}`,
        `**Total de integrações:** ${totals.integrations}`,
        "",
        "**Usuários:**"
      ].join("\n");

      for (const user of totals.user_details as string[]) {
        const line = `• ${user.replace(/\s+/g, " ").replace(/([\\`*_~|])/g, "\\$1")}`;
        if (description.length + line.length + 1 > 4096) {
          descriptions.push(description);
          description = "**Usuários (continuação):**";
        }
        description += `\n${line}`;
      }

      if (!totals.user_details.length) description += "\nNenhum usuário cadastrado.";
      descriptions.push(description);

      const footer = `Systatus - ${formatDate(getCurrentDate(), "DD/MM/YYYY HH:mm:ss")}`;
      for (const description of descriptions) {
        await this.integrationService.sendDiscordWebhook(
          webhook,
          "Resumo diário do Systatus",
          description,
          footer,
          "#7CB342"
        );
      }

      this.logger.log("Resumo diário enviado ao Discord.");
    } catch (error: any) {
      this.logger.error(`Erro ao enviar resumo diário ao Discord: ${error.message}`);
    }
  }
}
