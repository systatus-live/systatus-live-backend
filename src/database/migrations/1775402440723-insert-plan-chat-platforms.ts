import { PlanEnum } from "../../types/PlanEnum";
import { ChatPlatformEnum } from "../../types/ChatPlatformEnum";
import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterTable1775402440723 implements MigrationInterface {
  name = 'AlterTable1775402440723'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Andorinha: todas as plataformas exceto WhatsApp, E-mail e Microsoft Teams
    await queryRunner.query(`
      INSERT INTO plan_chat_platforms (plan_id, chat_platform_id)
      SELECT p.id, cp.id
      FROM plans p, chat_platforms cp
      WHERE p.name = '${PlanEnum.ANDORINHA}'
      AND cp.name NOT IN ('${ChatPlatformEnum.WHATSAPP}', '${ChatPlatformEnum.EMAIL}', '${ChatPlatformEnum.MICROSOFT_TEAMS}')
    `);

    // Coruja: todas as plataformas exceto WhatsApp
    await queryRunner.query(`
      INSERT INTO plan_chat_platforms (plan_id, chat_platform_id)
      SELECT p.id, cp.id
      FROM plans p, chat_platforms cp
      WHERE p.name = '${PlanEnum.CORUJA}'
      AND cp.name != '${ChatPlatformEnum.WHATSAPP}'
    `);

    // Águia: todas as plataformas
    await queryRunner.query(`
      INSERT INTO plan_chat_platforms (plan_id, chat_platform_id)
      SELECT p.id, cp.id
      FROM plans p, chat_platforms cp
      WHERE p.name = '${PlanEnum.AGUIA}'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
