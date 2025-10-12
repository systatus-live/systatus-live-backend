import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterTables1760190364228 implements MigrationInterface {
  name = 'AlterTables1760190364228'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "integrations" RENAME COLUMN "title" TO "name"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
