import { ChatPlatformEnum, ChatPlatformLabelEnum } from "../../enums/ChatPlatformEnum";
import { MigrationInterface, QueryRunner } from "typeorm";

export class InsertChatPlatforms1760329131355 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      insert into "chat_platforms" (name, description, "iconUrl", "docUrl") 
      values ('${ChatPlatformEnum.SLACK}', '${ChatPlatformLabelEnum.SLACK}', 'https://systatus.live/logos/slack.svg', 'https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks')
    `);

    await queryRunner.query(`
      insert into "chat_platforms" (name, description, "iconUrl", "docUrl") 
      values ('${ChatPlatformEnum.GOOGLE_CHAT}', '${ChatPlatformLabelEnum.GOOGLE_CHAT}', 'https://systatus.live/logos/google-chat.svg', 'https://developers.google.com/workspace/chat/quickstart/webhooks?hl=pt-br')
    `);

    await queryRunner.query(`
      insert into "chat_platforms" (name, description, "iconUrl", "docUrl") 
      values ('${ChatPlatformEnum.DISCORD}', '${ChatPlatformLabelEnum.DISCORD}', 'https://systatus.live/logos/discord.svg', 'https://discord.com/developers/docs/resources/webhook')
    `);

    await queryRunner.query(`
      insert into "chat_platforms" (name, description, "iconUrl", "docUrl") 
      values ('${ChatPlatformEnum.EMAIL}', '${ChatPlatformLabelEnum.EMAIL}', 'https://systatus.live/logos/mail.svg', '')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }

}
