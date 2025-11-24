import { ChatPlatformEnum, ChatPlatformLabelEnum } from "../../enums/ChatPlatformEnum";
import { MigrationInterface, QueryRunner } from "typeorm";

export class InsertChatPlatforms1763990346627 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      insert into "chat_platforms" (name, description, "iconUrl", "docUrl") 
      values ('${ChatPlatformEnum.EMAIL}', '${ChatPlatformLabelEnum.EMAIL}', 'https://systatus.live/logos/mail.svg', '')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
