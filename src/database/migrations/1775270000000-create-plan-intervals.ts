import { PlanEnum } from "../../types/PlanEnum";
import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePlanIntervals1775270000000 implements MigrationInterface {
  name = 'CreatePlanIntervals1775270000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "plan_intervals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "plan_id" uuid NOT NULL, "interval_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_fe3583cdaf82dfbf778bbdb43d8" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "plan_intervals" ADD CONSTRAINT "FK_48b87f0219b8c1e1fd74785f447" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "plan_intervals" ADD CONSTRAINT "FK_d955773936e37592613c401e497" FOREIGN KEY ("interval_id") REFERENCES "intervals"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

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
