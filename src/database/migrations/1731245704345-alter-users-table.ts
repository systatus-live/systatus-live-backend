import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterUsersTable1731245704345 implements MigrationInterface {
  name = 'AlterUsersTable1731245704345'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "verified" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
