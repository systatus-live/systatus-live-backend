import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1788706176629 implements MigrationInterface {
  name = 'NomeMigration1788706176629'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_incidents_monitor_created_at"`);
    await queryRunner.query(`DROP INDEX "public"."idx_monitor_historical_first_error"`);
    await queryRunner.query(`DROP INDEX "public"."idx_monitor_historical_last_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_monitor_historical_monitor_created_at"`);

    await queryRunner.query(`ALTER TYPE "public"."invoices_status_enum" RENAME TO "invoices_status_enum_old"`);
    await queryRunner.query(`CREATE TYPE "public"."invoices_status_enum" AS ENUM('PENDING', 'CANCELED', 'PAID', 'DUE_DATE')`);
    await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN "status" TYPE "public"."invoices_status_enum" USING "status"::"text"::"public"."invoices_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."invoices_status_enum_old"`);

    await queryRunner.query(`ALTER TABLE "monitor_historical" ADD "http_status" character varying(7)`);
    await queryRunner.query(`UPDATE "monitor_historical" SET "http_status" = "status"`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" ALTER COLUMN "http_status" SET NOT NULL`);

    await queryRunner.query(`ALTER TABLE "monitor_historical" DROP COLUMN "status"`);
    await queryRunner.query(`CREATE TYPE "public"."monitor_historical_status_enum" AS ENUM('S', 'E')`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" ADD "status" "public"."monitor_historical_status_enum"`);
    await queryRunner.query(`UPDATE "monitor_historical" SET "status" = CASE WHEN "http_status" LIKE '2%' THEN 'S'::"public"."monitor_historical_status_enum" ELSE 'E'::"public"."monitor_historical_status_enum" END`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" ALTER COLUMN "status" SET NOT NULL`);

    await queryRunner.query(`
      CREATE INDEX idx_incidents_monitor_created_at
      ON incidents (monitor_id, created_at DESC)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_monitor_historical_first_error
      ON monitor_historical (monitor_id, incident_id, created_at)
      WHERE status = 'E'
    `);
    await queryRunner.query(`
      CREATE INDEX idx_monitor_historical_last_status
      ON monitor_historical (monitor_id, incident_id, created_at)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_monitor_historical_monitor_created_at
      ON monitor_historical (monitor_id, created_at DESC)
      INCLUDE (status, http_status, total_ms)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
