import { MigrationInterface, QueryRunner } from "typeorm";

export class Insert1768781733400 implements MigrationInterface {
  name = 'Insert1768781733400'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO plans ("index", "name", description, price, image, monitor_qty, whatsapp, slack, google_chat, email, discord, custom_notification, status_page, display_features, stripe_price_id)
      VALUES (
        0,
        'Andorinha',
        'Comece a monitorar em minutos.',
        11.90,
        '/images/bird.png',
        5,
        false, true, true, true, true, false, false,
        '[{"label": "5 monitores", "enabled": true}, {"label": "Monitoramento a cada 5 minutos", "enabled": true}, {"label": "Notificações no Slack", "enabled": true}, {"label": "Notificações no Google Chat", "enabled": true}, {"label": "Notificações no E-mail", "enabled": true}, {"label": "Notificações no Discord", "enabled": true}, {"label": "Notificações no WhatsApp", "enabled": false}, {"label": "Mensagens personalizáveis", "enabled": false}, {"label": "Página de status pública", "enabled": false}]'::jsonb,
        '${process.env.STRIPE_PRICE_ID_ANDORINHA}'
      )
    `);

    await queryRunner.query(`
      INSERT INTO plans ("index", "name", description, price, image, monitor_qty, whatsapp, slack, google_chat, email, discord, custom_notification, status_page, display_features, stripe_price_id)
      VALUES (
        1,
        'Coruja',
        'Perfeito para expandir a cobertura de monitoramento.',
        89.9,
        '/images/owl.png',
        50,
        false, true, true, true, true, false, true,
        '[{"label": "🆙 50 monitores", "enabled": true}, {"label": "🆙 Monitoramento a cada 60 segundos", "enabled": true}, {"label": "Notificações no Slack", "enabled": true}, {"label": "Notificações no Google Chat", "enabled": true}, {"label": "Notificações no E-mail", "enabled": true}, {"label": "Notificações no Discord", "enabled": true}, {"label": "Notificações no WhatsApp", "enabled": false}, {"label": "Mensagens personalizáveis", "enabled": false}, {"label": "🆙 Página de status pública", "enabled": true}]'::jsonb,
        '${process.env.STRIPE_PRICE_ID_CORUJA}'
      )
    `);

    await queryRunner.query(`
      INSERT INTO plans ("index", "name", description, price, image, monitor_qty, whatsapp, slack, google_chat, email, discord, custom_notification, status_page, display_features, stripe_price_id)
      VALUES (
        2,
        'Águia',
        'Mais monitoramento, mensagens personalizadas e alertas no WhatsApp.',
        149.9,
        '/images/eagle.png',
        100,
        true, true, true, true, true, true, true,
        '[{"label": "🆙 100 monitores", "enabled": true}, {"label": "🆙 Monitoramento a cada 60 segundos", "enabled": true}, {"label": "Notificações no Slack", "enabled": true}, {"label": "Notificações no Google Chat", "enabled": true}, {"label": "Notificações no E-mail", "enabled": true}, {"label": "Notificações no Discord", "enabled": true}, {"label": "Notificações no WhatsApp", "enabled": true}, {"label": "🆙 Mensagens personalizáveis", "enabled": true}, {"label": "🆙 Página de status pública", "enabled": true}]'::jsonb,
        '${process.env.STRIPE_PRICE_ID_AGUIA}'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
