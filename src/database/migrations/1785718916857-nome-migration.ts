import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1785718916857 implements MigrationInterface {
  name = 'NomeMigration1785718916857'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "monitor_historical" ADD "request_headers" jsonb NULL`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" ADD "response_headers" jsonb NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
