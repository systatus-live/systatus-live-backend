import { PlanEnum } from "../../types/PlanEnum";
import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1788803176832 implements MigrationInterface {
  name = 'NomeMigration1788803176832'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE plans
      SET display_features = '[{"label":"50 monitores","enabled":true},{"label":"Monitoramento a partir de 5min.","enabled":true},{"label":"Notificações no Slack","enabled":true},{"hint":null,"label":"Notificações no WhatsApp","enabled":false},{"label":"Notificações no Discord","enabled":true},{"label":"Notificações no Google Chat","enabled":true},{"label":"Notificações no Mattermost","enabled":true},{"label":"Notificações no E-mail","enabled":false},{"label":"Mensagens personalizáveis","enabled":false},{"label":"Página de status pública","enabled":false},{"label":"30 dias de retenção de dados","enabled":true}]'::jsonb
      WHERE name = '${PlanEnum.ANDORINHA}'
    `);

    await queryRunner.query(`
      UPDATE plans
      SET display_features = '[{"label":"✨ 100 monitores","enabled":true},{"label":"✨ Monitoramento a partir de 60s","enabled":true},{"label":"Notificações no Slack","enabled":true},{"hint":null,"label":"Notificações no WhatsApp","enabled":false},{"label":"Notificações no Discord","enabled":true},{"label":"Notificações no Google Chat","enabled":true},{"label":"Notificações no Mattermost","enabled":true},{"label":"⭐ Notificações no E-mail","enabled":true},{"label":"⭐ Mensagens personalizáveis","enabled":true},{"label":"⭐ Página de status pública","enabled":true},{"label":"✨ 90 dias de retenção de dados","enabled":true}]'::jsonb
      WHERE name = '${PlanEnum.CORUJA}'
    `);

    await queryRunner.query(`
      UPDATE plans
      SET display_features = '[{"label":"✨ 200 monitores","enabled":true},{"label":"✨ Monitoramento a partir de 60s","enabled":true},{"label":"Notificações no Slack","enabled":true},{"hint":"Com limite de 100 mensagens por mês","label":"⭐ Notificações no WhatsApp","enabled":true},{"label":"Notificações no Discord","enabled":true},{"label":"Notificações no Google Chat","enabled":true},{"label":"Notificações no Mattermost","enabled":true},{"label":"⭐ Notificações no E-mail","enabled":true},{"label":"⭐ Mensagens personalizáveis","enabled":true},{"label":"⭐ Página de status pública","enabled":true},{"label":"✨ 180 dias de retenção de dados","enabled":true}]'::jsonb
      WHERE name = '${PlanEnum.AGUIA}'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }

}
