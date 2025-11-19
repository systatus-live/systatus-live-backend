import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterMonitorTable1763328270784 implements MigrationInterface {
  name = 'AlterMonitorTable1763328270784'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE monitors ALTER COLUMN cron TYPE varchar(20) USING cron::varchar(20);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
