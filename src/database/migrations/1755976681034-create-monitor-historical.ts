import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMonitorHistorical1755976681034 implements MigrationInterface {
  name = 'CreateMonitorHistorical1755976681034'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "monitor_historical" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "monitorId" uuid NOT NULL, "status" character varying(7) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2efc8056749d51a6e365f7734e4" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" ADD CONSTRAINT "FK_76e6bc1b36985f66390ef06d391" FOREIGN KEY ("monitorId") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
