import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterMonitorIncidentTable1765319211327 implements MigrationInterface {
  name = 'AlterMonitorIncidentTable1765319211327'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "monitor_incidents" ADD "endedAt" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(`update monitor_incidents set "endedAt" = "updatedAt" where active = false`);
    await queryRunner.query(`update monitors set type = 'GET' where type = 'HTTP'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
