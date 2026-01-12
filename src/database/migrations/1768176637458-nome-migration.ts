import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1768176637458 implements MigrationInterface {
  name = 'NomeMigration1768176637458'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
