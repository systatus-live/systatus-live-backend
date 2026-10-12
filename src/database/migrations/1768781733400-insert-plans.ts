import { MigrationInterface, QueryRunner } from "typeorm";

export class Insert1768781733400 implements MigrationInterface {
  name = 'Insert1768781733400'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO plans ("index", "name", description, price, image, monitor_qty, display_features, stripe_price_id)
      VALUES (
        0,
        'Andorinha',
        'Para projetos pessoais e pequenos sites. Sem cartão de crédito.',
        0,
        '/images/bird.png',
        50,
        '{"monitors":50,"interval":"5min","retention_days":30,"slack":true,"whatsapp":false,"google_chat":true,"microsoft_teams":false,"discord":true,"mattermost":true,"email":false,"custom_messages":false,"status_page":false}'::jsonb,
        null
      )
    `);

    await queryRunner.query(`
      INSERT INTO plans ("index", "name", description, price, image, monitor_qty, display_features, stripe_price_id)
      VALUES (
        1,
        'Coruja',
        'Ideal para times que rodam serviços em produção com monitoramento contínuo.',
        89.90,
        '/images/owl.png',
        100,
        '{"monitors":100,"interval":"60s","retention_days":90,"slack":true,"whatsapp":false,"google_chat":true,"microsoft_teams":true,"discord":true,"mattermost":true,"email":true,"custom_messages":true,"status_page":true}'::jsonb,
        '${process.env.STRIPE_PRICE_ID_CORUJA}'
      )
    `);

    await queryRunner.query(`
      INSERT INTO plans ("index", "name", description, price, image, monitor_qty, display_features, stripe_price_id)
      VALUES (
        2,
        'Águia',
        'O plano completo para quem opera em escala e precisa de tudo.',
        189.90,
        '/images/eagle.png',
        200,
        '{"monitors":200,"interval":"60s","retention_days":180,"slack":true,"whatsapp":true,"google_chat":true,"microsoft_teams":true,"discord":true,"mattermost":true,"email":true,"custom_messages":true,"status_page":true}'::jsonb,
        '${process.env.STRIPE_PRICE_ID_AGUIA}'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
