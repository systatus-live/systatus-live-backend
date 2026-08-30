import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1788117975252 implements MigrationInterface {
  name = 'NomeMigration1788117975252'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "monitor_historical" RENAME COLUMN duration TO total_ms`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" ADD "dns_ms" double precision`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" ADD "tcp_ms" double precision`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" ADD "tls_ms" double precision`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" ADD "ttfb_ms" double precision`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
