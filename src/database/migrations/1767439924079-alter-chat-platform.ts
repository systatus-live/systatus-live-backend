import { ChatPlatformEnum, ChatPlatformTypeEnum } from "../../types/ChatPlatformEnum";
import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterChatPlatform1767439924079 implements MigrationInterface {
  name = 'AlterChatPlatform1767439924079'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "incidents" DROP CONSTRAINT "FK_9c3f3ff306a4c29c89ac87ded82"`);
    await queryRunner.query(`ALTER TABLE "incidents" ADD CONSTRAINT "FK_77c92898211e6e84f9577380481" FOREIGN KEY ("monitorId") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "chat_platforms" ADD "type" character varying(255) NULL`);
    await queryRunner.query(`update "chat_platforms" set type = '${ChatPlatformTypeEnum.WEBHOOK}' where name in ('${ChatPlatformEnum.DISCORD}', '${ChatPlatformEnum.SLACK}', '${ChatPlatformEnum.GOOGLE_CHAT}')`);
    await queryRunner.query(`update "chat_platforms" set type = '${ChatPlatformTypeEnum.EMAIL}' where name in ('${ChatPlatformEnum.EMAIL}')`);
    await queryRunner.query(`update "chat_platforms" set type = '${ChatPlatformTypeEnum.PHONE}' where name in ('${ChatPlatformEnum.WHATSAPP}')`);
    await queryRunner.query(`ALTER TABLE chat_platforms ALTER COLUMN "type" SET NOT NULL;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
