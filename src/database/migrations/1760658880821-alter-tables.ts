import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterTables1760658880821 implements MigrationInterface {
  name = 'AlterTables1760658880821'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "monitors" RENAME COLUMN "title" TO "name"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
