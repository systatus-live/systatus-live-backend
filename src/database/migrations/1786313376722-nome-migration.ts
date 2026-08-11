import { PlanEnum } from "src/types/PlanEnum";
import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1786313376722 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      update plans 
      set display_features = '[{"label": "5 monitores", "enabled": true}, {"label": "Monitoramento a partir de 5 minutos", "enabled": true}, {"label": "Notificações no Slack", "enabled": true}, {"label": "Notificações no Google Chat", "enabled": true}, {"label": "Notificações no Discord", "enabled": true}, {"label": "Notificações no E-mail", "enabled": false}, {"label": "Notificações no WhatsApp", "enabled": false}, {"label": "Mensagens personalizáveis", "enabled": false}, {"label": "Página de status pública", "enabled": false}]'::jsonb 
      where name = '${PlanEnum.ANDORINHA}'
    `);

    await queryRunner.query(`
      update plans 
      set display_features = '[{"label": "🆙 50 monitores", "enabled": true}, {"label": "🆙 Monitoramento a partir de 60 segundos", "enabled": true}, {"label": "Notificações no Slack", "enabled": true}, {"label": "Notificações no Google Chat", "enabled": true}, {"label": "Notificações no Discord", "enabled": true}, {"label": "🆙 Notificações no E-mail", "enabled": true}, {"label": "Notificações no WhatsApp", "enabled": false}, {"label": "Mensagens personalizáveis", "enabled": false}, {"label": "🆙 Página de status pública", "enabled": true}]'::jsonb 
      where name = '${PlanEnum.CORUJA}'
    `);

    await queryRunner.query(`
      update plans 
      set display_features = '[{"label": "🆙 100 monitores", "enabled": true}, {"label": "🆙 Monitoramento a partir de 60 segundos", "enabled": true}, {"label": "Notificações no Slack", "enabled": true}, {"label": "Notificações no Google Chat", "enabled": true}, {"label": "Notificações no Discord", "enabled": true}, {"label": "🆙 Notificações no E-mail", "enabled": true}, {"label": "🆙 Notificações no WhatsApp", "enabled": true}, {"label": "🆙 Mensagens personalizáveis", "enabled": true}, {"label": "🆙 Página de status pública", "enabled": true}]'::jsonb 
      where name = '${PlanEnum.AGUIA}'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }

}
