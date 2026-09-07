import { ChatPlatformEnum } from "src/types/ChatPlatformEnum";
import { PlanEnum } from "../../types/PlanEnum";
import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1788818232260 implements MigrationInterface {
  name = 'NomeMigration1788818232260'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE plans
      SET display_features = '[{"label":"50 monitores","enabled":true},{"label":"Monitoramento a partir de 5min.","enabled":true},{"label":"Notificações no Slack","enabled":true},{"hint":"Com limite de 100 mensagens por mês","label":"Notificações no WhatsApp","enabled":false},{"label":"Notificações no Google Chat","enabled":true},{"label":"Notificações no Discord","enabled":true},{"label":"Notificações no Mattermost","enabled":true},{"label":"Notificações no E-mail","enabled":false},{"hint":"Compatível com Slack, Discord, Google Chat e Mattermost","label":"Mensagens personalizáveis","enabled":false},{"label":"Página de status pública","enabled":false},{"label":"30 dias de retenção de dados","enabled":true}]'::jsonb
      WHERE name = '${PlanEnum.ANDORINHA}'
    `);

    await queryRunner.query(`
      UPDATE plans
      SET display_features = '[{"label":"✨ 100 monitores","enabled":true},{"label":"✨ Monitoramento a partir de 60s","enabled":true},{"label":"Notificações no Slack","enabled":true},{"hint":"Com limite de 100 mensagens por mês","label":"Notificações no WhatsApp","enabled":false},{"label":"Notificações no Google Chat","enabled":true},{"label":"Notificações no Discord","enabled":true},{"label":"Notificações no Mattermost","enabled":true},{"label":"⭐ Notificações no E-mail","enabled":true},{"hint":"Compatível com Slack, Discord, Google Chat e Mattermost","label":"⭐ Mensagens personalizáveis","enabled":true},{"label":"⭐ Página de status pública","enabled":true},{"label":"✨ 90 dias de retenção de dados","enabled":true}]'::jsonb
      WHERE name = '${PlanEnum.CORUJA}'
    `);

    await queryRunner.query(`
      UPDATE plans
      SET display_features = '[{"label":"✨ 200 monitores","enabled":true},{"label":"✨ Monitoramento a partir de 60s","enabled":true},{"label":"Notificações no Slack","enabled":true},{"hint":"Com limite de 100 mensagens por mês","label":"⭐ Notificações no WhatsApp","enabled":true},{"label":"Notificações no Google Chat","enabled":true},{"label":"Notificações no Discord","enabled":true},{"label":"Notificações no Mattermost","enabled":true},{"label":"⭐ Notificações no E-mail","enabled":true},{"hint":"Compatível com Slack, Discord, Google Chat e Mattermost","label":"⭐ Mensagens personalizáveis","enabled":true},{"label":"⭐ Página de status pública","enabled":true},{"label":"✨ 180 dias de retenção de dados","enabled":true}]'::jsonb
      WHERE name = '${PlanEnum.AGUIA}'
    `);

    await queryRunner.query(`UPDATE "chat_platforms" SET INDEX = 1 WHERE NAME = '${ChatPlatformEnum.SLACK}'`);
    await queryRunner.query(`UPDATE "chat_platforms" SET INDEX = 2 WHERE NAME = '${ChatPlatformEnum.WHATSAPP}'`);
    await queryRunner.query(`UPDATE "chat_platforms" SET INDEX = 3 WHERE NAME = '${ChatPlatformEnum.GOOGLE_CHAT}'`);
    await queryRunner.query(`UPDATE "chat_platforms" SET INDEX = 4 WHERE NAME = '${ChatPlatformEnum.DISCORD}'`);
    await queryRunner.query(`UPDATE "chat_platforms" SET INDEX = 5 WHERE NAME = '${ChatPlatformEnum.MATTERMOST}'`);
    await queryRunner.query(`UPDATE "chat_platforms" SET INDEX = 6 WHERE NAME = '${ChatPlatformEnum.EMAIL}'`);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
