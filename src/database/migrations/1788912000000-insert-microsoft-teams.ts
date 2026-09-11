import { ChatPlatformEnum, ChatPlatformLabelEnum, ChatPlatformTypeEnum } from "src/types/ChatPlatformEnum";
import { PlanEnum } from "../../types/PlanEnum";
import { MigrationInterface, QueryRunner } from "typeorm";

export class InsertMicrosoftTeams1788912000000 implements MigrationInterface {
  name = 'InsertMicrosoftTeams1788912000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "chat_platforms" (name, description, "icon_url", "doc_url", type)
      VALUES ('${ChatPlatformEnum.MICROSOFT_TEAMS}', '${ChatPlatformLabelEnum.MICROSOFT_TEAMS}', 'https://systatus.live/logos/microsoft-teams.svg', 'https://learn.microsoft.com/pt-br/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook?tabs=dotnet', '${ChatPlatformTypeEnum.WEBHOOK}')
    `);

    await queryRunner.query(`UPDATE "chat_platforms" SET INDEX = 4 WHERE NAME = '${ChatPlatformEnum.MICROSOFT_TEAMS}'`);
    await queryRunner.query(`UPDATE "chat_platforms" SET INDEX = 5 WHERE NAME = '${ChatPlatformEnum.DISCORD}'`);
    await queryRunner.query(`UPDATE "chat_platforms" SET INDEX = 6 WHERE NAME = '${ChatPlatformEnum.MATTERMOST}'`);
    await queryRunner.query(`UPDATE "chat_platforms" SET INDEX = 7 WHERE NAME = '${ChatPlatformEnum.EMAIL}'`);

    await queryRunner.query(`
      UPDATE plans
      SET display_features = '[{"label":"50 monitores","enabled":true},{"label":"Monitoramento a partir de 5min.","enabled":true},{"label":"Notificações no Slack","enabled":true},{"hint":"Com limite de 100 mensagens por mês","label":"Notificações no WhatsApp","enabled":false},{"label":"Notificações no Google Chat","enabled":true},{"label":"Notificações no Microsoft Teams","enabled":false},{"label":"Notificações no Discord","enabled":true},{"label":"Notificações no Mattermost","enabled":true},{"label":"Notificações no E-mail","enabled":false},{"hint":"Compatível com Slack, Discord, Google Chat e Mattermost","label":"Mensagens personalizáveis","enabled":false},{"label":"Página de status pública","enabled":false},{"label":"30 dias de retenção de dados","enabled":true}]'::jsonb
      WHERE name = '${PlanEnum.ANDORINHA}'
    `);

    await queryRunner.query(`
      UPDATE plans
      SET display_features = '[{"label":"✨ 100 monitores","enabled":true},{"label":"✨ Monitoramento a partir de 60s","enabled":true},{"label":"Notificações no Slack","enabled":true},{"hint":"Com limite de 100 mensagens por mês","label":"Notificações no WhatsApp","enabled":false},{"label":"Notificações no Google Chat","enabled":true},{"label":"⭐ Notificações no Microsoft Teams","enabled":true},{"label":"Notificações no Discord","enabled":true},{"label":"Notificações no Mattermost","enabled":true},{"label":"⭐ Notificações no E-mail","enabled":true},{"hint":"Compatível com Slack, Discord, Google Chat e Mattermost","label":"⭐ Mensagens personalizáveis","enabled":true},{"label":"⭐ Página de status pública","enabled":true},{"label":"✨ 90 dias de retenção de dados","enabled":true}]'::jsonb
      WHERE name = '${PlanEnum.CORUJA}'
    `);

    await queryRunner.query(`
      UPDATE plans
      SET display_features = '[{"label":"✨ 200 monitores","enabled":true},{"label":"✨ Monitoramento a partir de 60s","enabled":true},{"label":"Notificações no Slack","enabled":true},{"hint":"Com limite de 100 mensagens por mês","label":"⭐ Notificações no WhatsApp","enabled":true},{"label":"Notificações no Google Chat","enabled":true},{"label":"⭐ Notificações no Microsoft Teams","enabled":true},{"label":"Notificações no Discord","enabled":true},{"label":"Notificações no Mattermost","enabled":true},{"label":"⭐ Notificações no E-mail","enabled":true},{"hint":"Compatível com Slack, Discord, Google Chat e Mattermost","label":"⭐ Mensagens personalizáveis","enabled":true},{"label":"⭐ Página de status pública","enabled":true},{"label":"✨ 180 dias de retenção de dados","enabled":true}]'::jsonb
      WHERE name = '${PlanEnum.AGUIA}'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
