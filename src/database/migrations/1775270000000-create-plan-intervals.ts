import { PlanEnum } from "../../types/PlanEnum";
import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePlanIntervals1775270000000 implements MigrationInterface {
  name = 'CreatePlanIntervals1775270000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Andorinha: todos os intervalos EXCETO "1 minuto" (index = 1)
    await queryRunner.query(`
      insert into plan_intervals (plan_id, interval_id)
      select p.id, i.id
      from plans p, intervals i
      where p.name = '${PlanEnum.ANDORINHA}' and i.index != 1
    `);

    // Coruja: todos os intervalos
    await queryRunner.query(`
      insert into plan_intervals (plan_id, interval_id)
      select p.id, i.id
      from plans p, intervals i
      where p.name = '${PlanEnum.CORUJA}'
    `);

    // Águia: todos os intervalos
    await queryRunner.query(`
      insert into plan_intervals (plan_id, interval_id)
      select p.id, i.id
      from plans p, intervals i
      where p.name = '${PlanEnum.AGUIA}'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
