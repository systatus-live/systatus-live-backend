import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1769286313581 implements MigrationInterface {
  name = 'NomeMigration1769286313581'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TYPE "public"."invoices_status_enum" RENAME TO "invoices_status_enum_old"`);
    await queryRunner.query(`CREATE TYPE "public"."invoices_status_enum" AS ENUM('PENDING', 'CANCELED', 'PAID', 'OVERDUE')`);
    await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "status" TYPE "public"."invoices_status_enum" USING "status"::"text"::"public"."invoices_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."invoices_status_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
