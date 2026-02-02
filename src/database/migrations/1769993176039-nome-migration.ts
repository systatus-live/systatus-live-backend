import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1769993176039 implements MigrationInterface {
  name = 'NomeMigration1769993176039'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "invoices" ADD "subscriptionStartDate" TIMESTAMP WITH TIME ZONE NULL`);
    await queryRunner.query(`ALTER TABLE "invoices" ADD "subscriptionEndDate" TIMESTAMP WITH TIME ZONE NULL`);

    await queryRunner.query(`
      update "invoices" t
      set "subscriptionStartDate" = sub."createdAt"::date, "subscriptionEndDate" = sub."startDate" - interval '1 days'
      from invoices inv
      join subscriptions sub on sub.id = inv."subscriptionId"
      where inv.id = t.id;
    `);

    await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "subscriptionStartDate" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "subscriptionEndDate" SET NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
