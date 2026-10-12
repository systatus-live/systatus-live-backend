import { ChatPlatformEnum, ChatPlatformLabelEnum, ChatPlatformTypeEnum } from "../../types/ChatPlatformEnum";
import { MigrationInterface, QueryRunner } from "typeorm";

export class InsertChatPlatforms1760329131355 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      insert into "chat_platforms" (name, description, "icon_url", "doc_url", type, "index")
      values ('${ChatPlatformEnum.SLACK}', '${ChatPlatformLabelEnum.SLACK}', 'https://systatus.live/logos/slack.svg', 'https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks', '${ChatPlatformTypeEnum.WEBHOOK}', 1)
    `);

    await queryRunner.query(`
      insert into "chat_platforms" (name, description, "icon_url", "doc_url", type, "index")
      values ('${ChatPlatformEnum.WHATSAPP}', '${ChatPlatformLabelEnum.WHATSAPP}', 'https://systatus.live/logos/whatsapp.svg', '', '${ChatPlatformTypeEnum.PHONE}', 2)
    `);

    await queryRunner.query(`
      insert into "chat_platforms" (name, description, "icon_url", "doc_url", type, "index")
      values ('${ChatPlatformEnum.GOOGLE_CHAT}', '${ChatPlatformLabelEnum.GOOGLE_CHAT}', 'https://systatus.live/logos/google-chat.svg', 'https://developers.google.com/workspace/chat/quickstart/webhooks?hl=pt-br', '${ChatPlatformTypeEnum.WEBHOOK}', 3)
    `);

    await queryRunner.query(`
      insert into "chat_platforms" (name, description, "icon_url", "doc_url", type, "index")
      values ('${ChatPlatformEnum.MICROSOFT_TEAMS}', '${ChatPlatformLabelEnum.MICROSOFT_TEAMS}', 'https://systatus.live/logos/microsoft-teams.svg', 'https://learn.microsoft.com/pt-br/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook?tabs=dotnet', '${ChatPlatformTypeEnum.WEBHOOK}', 4)
    `);

    await queryRunner.query(`
      insert into "chat_platforms" (name, description, "icon_url", "doc_url", type, "index")
      values ('${ChatPlatformEnum.DISCORD}', '${ChatPlatformLabelEnum.DISCORD}', 'https://systatus.live/logos/discord.svg', 'https://discord.com/developers/docs/resources/webhook', '${ChatPlatformTypeEnum.WEBHOOK}', 5)
    `);

    await queryRunner.query(`
      insert into "chat_platforms" (name, description, "icon_url", "doc_url", type, "index")
      values ('${ChatPlatformEnum.MATTERMOST}', '${ChatPlatformLabelEnum.MATTERMOST}', 'https://systatus.live/logos/mattermost.svg', 'https://docs.mattermost.com/integrations-guide/incoming-webhooks', '${ChatPlatformTypeEnum.WEBHOOK}', 6)
    `);

    await queryRunner.query(`
      insert into "chat_platforms" (name, description, "icon_url", "doc_url", type, "index")
      values ('${ChatPlatformEnum.EMAIL}', '${ChatPlatformLabelEnum.EMAIL}', 'https://systatus.live/logos/mail.svg', '', '${ChatPlatformTypeEnum.EMAIL}', 7)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }

}
