import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1786462398616 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`update plans set price = 0, description = 'Para projetos pessoais e pequenos sites. Sem cartão de crédito.', display_features = '[{"label": "50 monitores", "enabled": true}, {"label": "Monitoramento a partir de 5min.", "enabled": true}, {"label": "Notificações no Slack", "enabled": true}, {"label": "Notificações no Google Chat", "enabled": true}, {"label": "Notificações no Discord", "enabled": true}, {"label": "Notificações no E-mail", "enabled": false}, {"label": "Notificações no WhatsApp", "enabled": false, "hint": null}, {"label": "Mensagens personalizáveis", "enabled": false}, {"label": "Página de status pública", "enabled": false}, {"label": "7 dias de retenção de dados", "enabled": true}]'::jsonb where name = 'Andorinha';`);
    await queryRunner.query(`update plans set price = 89.90, description = 'Para times que rodam serviços em produção com monitoramento contínuo.', display_features = '[{"label": "🆙 100 monitores", "enabled": true}, {"label": "🆙 Monitoramento a partir de 60s", "enabled": true}, {"label": "Notificações no Slack", "enabled": true}, {"label": "Notificações no Google Chat", "enabled": true}, {"label": "Notificações no Discord", "enabled": true}, {"label": "🆙 Notificações no E-mail", "enabled": true}, {"label": "Notificações no WhatsApp", "enabled": false, "hint": null}, {"label": "🆙 Mensagens personalizáveis", "enabled": true}, {"label": "🆙 Página de status pública", "enabled": true}, {"label": "🆙 30 dias de retenção de dados", "enabled": true}]'::jsonb where name = 'Coruja';`);
    await queryRunner.query(`update plans set price = 189.90, description = 'Para operações em escala.', display_features = '[{"label": "🆙 200 monitores", "enabled": true}, {"label": "🆙 Monitoramento a partir de 60s", "enabled": true}, {"label": "Notificações no Slack", "enabled": true}, {"label": "Notificações no Google Chat", "enabled": true}, {"label": "Notificações no Discord", "enabled": true}, {"label": "🆙 Notificações no E-mail", "enabled": true}, {"label": "🆙 Notificações no WhatsApp", "enabled": true, "hint": "Com limite de 100 mensagens por mês"}, {"label": "🆙 Mensagens personalizáveis", "enabled": true}, {"label": "🆙 Página de status pública", "enabled": true}, {"label": "🆙 90 dias de retenção de dados", "enabled": true}]'::jsonb where name = 'Águia';`);

    // Converte coluna para text para permitir migração de dados e recriação do enum na mesma transação
    await queryRunner.query(`ALTER TABLE subscriptions ALTER COLUMN status TYPE text`);

    // Migra dados existentes
    await queryRunner.query(`UPDATE subscriptions SET status = 'FREE', end_date = NULL WHERE status = 'TRIAL'`);
    await queryRunner.query(`UPDATE subscriptions SET status = 'CANCELED' WHERE status = 'UPGRADED'`);

    // Recria o tipo enum sem TRIAL e UPGRADED, com FREE
    await queryRunner.query(`DROP TYPE "subscriptions_status_enum"`);
    await queryRunner.query(`CREATE TYPE "subscriptions_status_enum" AS ENUM('ACTIVE', 'CANCELED', 'OVERDUE', 'FREE', 'EXPIRED')`);
    await queryRunner.query(`ALTER TABLE subscriptions ALTER COLUMN status TYPE "subscriptions_status_enum" USING status::"subscriptions_status_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }

}
