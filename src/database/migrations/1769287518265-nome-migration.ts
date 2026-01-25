import { PlanEnum } from "../../types/PlanEnum";
import { SubscriptionStatusEnum } from "../../types/SubscriptionStatusEnum";
import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1769287518265 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      insert into subscriptions ("userId", "planId", "startDate", "endDate", status)
      select usu.id as "userId", pla.id as "planId", usu."createdAt" as "startDate", now() as "endDate", '${SubscriptionStatusEnum.ACTIVE}' as status
      from plans pla, users usu
      where pla.name = '${PlanEnum.ANDORINHA}';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
