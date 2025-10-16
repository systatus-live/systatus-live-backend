import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterTable1760329796972 implements MigrationInterface {
  name = 'AlterTable1760329796972'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "integrations" DROP COLUMN "createdAt"`);
    await queryRunner.query(`ALTER TABLE "integrations" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "integrations" DROP COLUMN "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "integrations" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
