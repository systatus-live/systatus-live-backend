import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterUsersTable1746389216927 implements MigrationInterface {
  name = 'AlterUsersTable1746389216927'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "password" text NOT NULL`);
    await queryRunner.query(`ALTER TABLE "users" ADD "accepted_terms" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "users" ADD "discovery" character varying(10)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "discovery"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "accepted_terms"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password"`);
  }

}
