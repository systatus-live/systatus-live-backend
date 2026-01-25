import { PlanEnum } from "../../types/PlanEnum";
import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1768840122785 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      insert into subscriptions ("userId", "planId", price, period, active)
      select usu.id as "userId", pla.id as "planId", pla.price, 'MONTH' as period, true as active
      from plans pla, users usu
      where pla.name = '${PlanEnum.ANDORINHA}';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }

}
