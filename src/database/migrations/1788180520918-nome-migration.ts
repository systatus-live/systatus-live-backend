import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1788180520918 implements MigrationInterface {
  name = 'NomeMigration1788180520918'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "monitor_historical" ADD "ping_packet_loss" double precision`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" ADD "ping_avg_ms" double precision`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" ADD "ping_min_ms" double precision`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" ADD "ping_max_ms" double precision`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
