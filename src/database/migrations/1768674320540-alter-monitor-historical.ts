import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterMonitorHistorical1768674320540 implements MigrationInterface {
  name = 'AlterMonitorHistorical1768674320540'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "monitor_historical" ADD "duration" numeric`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
