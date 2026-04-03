import { MigrationInterface, QueryRunner } from "typeorm";

export class InsertInterval1767713021476 implements MigrationInterface {
  name = 'InsertInterval1767713021476'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`insert into intervals (index, name, cron) values (1, '1 minuto', '* * * * *')`);
    await queryRunner.query(`insert into intervals (index, name, cron) values (2, '5 minutos', '*/5 * * * *')`);
    await queryRunner.query(`insert into intervals (index, name, cron) values (3, '30 minutos', '*/30 * * * *')`);
    await queryRunner.query(`insert into intervals (index, name, cron) values (4, '1 hora', '0 * * * *')`);
    await queryRunner.query(`insert into intervals (index, name, cron) values (5, '12 horas', '0 */12 * * *')`);
    await queryRunner.query(`insert into intervals (index, name, cron) values (6, '24 horas', '0 0 * * *')`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
