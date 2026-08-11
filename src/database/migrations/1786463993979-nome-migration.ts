import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1786463993979 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`update plans set price = 189.90, description = 'O plano completo para quem opera em escala e precisa de tudo.', display_features = '[{"label": "🆙 200 monitores", "enabled": true}, {"label": "🆙 Monitoramento a partir de 60s", "enabled": true}, {"label": "Notificações no Slack", "enabled": true}, {"label": "Notificações no Google Chat", "enabled": true}, {"label": "Notificações no Discord", "enabled": true}, {"label": "🆙 Notificações no E-mail", "enabled": true}, {"label": "🆙 Notificações no WhatsApp", "enabled": true, "hint": "Com limite de 100 mensagens por mês"}, {"label": "🆙 Mensagens personalizáveis", "enabled": true}, {"label": "🆙 Página de status pública", "enabled": true}, {"label": "🆙 90 dias de retenção de dados", "enabled": true}]'::jsonb where name = 'Águia';`);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
