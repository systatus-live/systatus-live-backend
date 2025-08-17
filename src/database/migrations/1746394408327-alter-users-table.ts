import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterUsersTable1746394408327 implements MigrationInterface {
  name = 'AlterUsersTable1746394408327'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "verified" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
