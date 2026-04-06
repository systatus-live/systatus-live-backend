import { PlanEnum } from "../../types/PlanEnum";
import { ChatPlatformEnum, ChatPlatformLabelEnum, ChatPlatformTypeEnum } from "../../types/ChatPlatformEnum";
import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterTable1775402440723 implements MigrationInterface {
  name = 'AlterTable1775402440723'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "plan_chat_platforms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "plan_id" uuid NOT NULL, "chat_platform_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e1a2c90e4e550533592cecf3f4f" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "plan_chat_platforms" ADD CONSTRAINT "FK_36c2cc76ac2a0d6831267f13d7c" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "plan_chat_platforms" ADD CONSTRAINT "FK_5e3f92c0609afbd9cd954cd5c23" FOREIGN KEY ("chat_platform_id") REFERENCES "chat_platforms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

    // Remove plan_permissions referentes às integrações de chat
    await queryRunner.query(`
      DELETE FROM plan_permissions
      WHERE permission_id IN (
        SELECT id FROM permissions
        WHERE name IN ('INTEG_SLACK', 'INTEG_DISCORD', 'INTEG_GOOGLE_CHAT', 'INTEG_EMAIL', 'INTEG_WHATSAPP')
      )
    `);

    // Remove as permissions de integração de chat
    await queryRunner.query(`
      DELETE FROM permissions
      WHERE name IN ('INTEG_SLACK', 'INTEG_DISCORD', 'INTEG_GOOGLE_CHAT', 'INTEG_EMAIL', 'INTEG_WHATSAPP')
    `);

    // Insere WhatsApp na tabela de plataformas de chat
    await queryRunner.query(`
      INSERT INTO chat_platforms (name, description, icon_url, doc_url, type)
      VALUES ('${ChatPlatformEnum.WHATSAPP}', '${ChatPlatformLabelEnum.WHATSAPP}', 'https://systatus.live/logos/whatsapp.svg', '', '${ChatPlatformTypeEnum.PHONE}')
    `);

    // Andorinha e Coruja: todas as plataformas exceto WhatsApp
    await queryRunner.query(`
      INSERT INTO plan_chat_platforms (plan_id, chat_platform_id)
      SELECT p.id, cp.id
      FROM plans p, chat_platforms cp
      WHERE p.name IN ('${PlanEnum.ANDORINHA}', '${PlanEnum.CORUJA}')
        AND cp.name != '${ChatPlatformEnum.WHATSAPP}'
    `);

    // Águia: todas as plataformas incluindo WhatsApp
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
