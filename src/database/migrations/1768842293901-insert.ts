import { MigrationInterface, QueryRunner } from "typeorm";

export class Insert1768842293901 implements MigrationInterface {
  name = 'Insert1768842293901'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "plans" ALTER COLUMN price TYPE double precision USING price::double precision`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ALTER COLUMN price TYPE double precision USING price::double precision`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" ALTER COLUMN duration TYPE double precision USING duration::double precision`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
