import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterTable1759190852142 implements MigrationInterface {
  name = 'AlterTable1759190852142'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "discovery"`);
    await queryRunner.query(`ALTER TABLE "users" ADD "discovery" character varying(50)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
