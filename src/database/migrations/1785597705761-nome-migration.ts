import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1785597705761 implements MigrationInterface {
  name = 'NomeMigration1785597705761'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "invoices" ADD "iid" integer NOT NULL DEFAULT '1'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
