import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterUsersTable1746405634031 implements MigrationInterface {
  name = 'AlterUsersTable1746405634031'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "verification_code" character varying(6)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "verification_code"`);
  }

}
