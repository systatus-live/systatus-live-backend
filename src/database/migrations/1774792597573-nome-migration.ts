import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1774792597573 implements MigrationInterface {
  name = 'NomeMigration1774792597573'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "country"`);
    await queryRunner.query(`ALTER TABLE "users" ADD "billing_name" character varying(100)`);
    await queryRunner.query(`ALTER TABLE "users" ADD "billing_email" character varying(255)`);
    await queryRunner.query(`ALTER TABLE "users" ADD "number" character varying(20)`);
    await queryRunner.query(`ALTER TABLE "users" ADD "complement" character varying(100)`);
    await queryRunner.query(`ALTER TABLE "users" ADD "state" character varying(2)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
