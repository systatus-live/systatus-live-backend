import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStripeFields1774200000000 implements MigrationInterface {
  name = 'AddStripeFields1774200000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(100) NULL`);
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(100) NULL`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(100) NULL`);

    if (process.env.STRIPE_PRICE_ID_ANDORINHA) {
      await queryRunner.query(`UPDATE "plans" SET stripe_price_id = '${process.env.STRIPE_PRICE_ID_ANDORINHA}' WHERE name = 'Andorinha'`);
    }
    if (process.env.STRIPE_PRICE_ID_CORUJA) {
      await queryRunner.query(`UPDATE "plans" SET stripe_price_id = '${process.env.STRIPE_PRICE_ID_CORUJA}' WHERE name = 'Coruja'`);
    }
    if (process.env.STRIPE_PRICE_ID_AGUIA) {
      await queryRunner.query(`UPDATE "plans" SET stripe_price_id = '${process.env.STRIPE_PRICE_ID_AGUIA}' WHERE name = 'Águia'`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
