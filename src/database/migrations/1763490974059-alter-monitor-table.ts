import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterMonitorTable1763490974059 implements MigrationInterface {
  name = 'AlterMonitorTable1763490974059'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "createdAt"`);
    await queryRunner.query(`ALTER TABLE "users" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "users" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "monitors" DROP COLUMN "createdAt"`);
    await queryRunner.query(`ALTER TABLE "monitors" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "monitors" DROP COLUMN "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "monitors" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" DROP COLUMN "createdAt"`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" DROP COLUMN "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "chat_platforms" DROP COLUMN "createdAt"`);
    await queryRunner.query(`ALTER TABLE "chat_platforms" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "chat_platforms" DROP COLUMN "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "chat_platforms" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
