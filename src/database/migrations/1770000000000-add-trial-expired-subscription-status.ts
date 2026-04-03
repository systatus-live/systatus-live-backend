import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTrialExpiredSubscriptionStatus1770000000000 implements MigrationInterface {
  name = 'AddTrialExpiredSubscriptionStatus1770000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "subscriptions_status_enum" ADD VALUE IF NOT EXISTS 'TRIAL'`);
    await queryRunner.query(`ALTER TYPE "subscriptions_status_enum" ADD VALUE IF NOT EXISTS 'EXPIRED'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
