import { ChatPlatformEnum } from "../../types/ChatPlatformEnum";
import { PlanEnum } from "../../types/PlanEnum";
import { MigrationInterface, QueryRunner } from "typeorm";

export class InsertPlanChatPlatformsMicrosoftTeams1788912002000 implements MigrationInterface {
  name = 'InsertPlanChatPlatformsMicrosoftTeams1788912002000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO plan_chat_platforms (plan_id, chat_platform_id)
      SELECT p.id, cp.id
      FROM plans p, chat_platforms cp
      WHERE cp.name = '${ChatPlatformEnum.MICROSOFT_TEAMS}'
      AND p.name IN ('${PlanEnum.CORUJA}', '${PlanEnum.AGUIA}')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
