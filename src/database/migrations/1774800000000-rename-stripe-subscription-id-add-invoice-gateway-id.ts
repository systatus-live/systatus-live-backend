import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameStripeSubscriptionIdAddInvoiceGatewayId1774800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "subscriptions" RENAME COLUMN "stripe_subscription_id" TO "gateway_id"`);
    await queryRunner.query(`ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "gateway_id" VARCHAR(100) NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "invoices" DROP COLUMN IF EXISTS "gateway_id"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" RENAME COLUMN "gateway_id" TO "stripe_subscription_id"`);
  }
}
