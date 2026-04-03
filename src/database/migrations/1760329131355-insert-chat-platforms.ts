import { ChatPlatformEnum, ChatPlatformLabelEnum, ChatPlatformTypeEnum } from "../../types/ChatPlatformEnum";
import { MigrationInterface, QueryRunner } from "typeorm";

export class InsertChatPlatforms1760329131355 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      insert into "chat_platforms" (name, description, "icon_url", "doc_url", type) 
      values ('${ChatPlatformEnum.SLACK}', '${ChatPlatformLabelEnum.SLACK}', 'https://systatus.live/logos/slack.svg', 'https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks', '${ChatPlatformTypeEnum.WEBHOOK}')
    `);

    await queryRunner.query(`
      insert into "chat_platforms" (name, description, "icon_url", "doc_url", type) 
      values ('${ChatPlatformEnum.GOOGLE_CHAT}', '${ChatPlatformLabelEnum.GOOGLE_CHAT}', 'https://systatus.live/logos/google-chat.svg', 'https://developers.google.com/workspace/chat/quickstart/webhooks?hl=pt-br', '${ChatPlatformTypeEnum.WEBHOOK}')
    `);

    await queryRunner.query(`
      insert into "chat_platforms" (name, description, "icon_url", "doc_url", type) 
      values ('${ChatPlatformEnum.DISCORD}', '${ChatPlatformLabelEnum.DISCORD}', 'https://systatus.live/logos/discord.svg', 'https://discord.com/developers/docs/resources/webhook', '${ChatPlatformTypeEnum.WEBHOOK}')
    `);

    await queryRunner.query(`
      insert into "chat_platforms" (name, description, "icon_url", "doc_url", type) 
      values ('${ChatPlatformEnum.EMAIL}', '${ChatPlatformLabelEnum.EMAIL}', 'https://systatus.live/logos/mail.svg', '', '${ChatPlatformTypeEnum.EMAIL}')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }

}
