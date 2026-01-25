import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1769261122737 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`drop table billings`);
    await queryRunner.query(`drop table subscriptions`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }

}
