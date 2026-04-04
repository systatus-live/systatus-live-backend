import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterTable1775269247685 implements MigrationInterface {
  name = 'AlterTable1775269247685'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`delete from gateway_logs where 1 = 1`);
    await queryRunner.query(`ALTER TABLE "gateway_logs" ADD "event" character varying(1024) NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
