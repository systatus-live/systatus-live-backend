import { ChatPlatformEnum, ChatPlatformLabelEnum } from "src/enums/ChatPlatformEnum";
import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateTable1760664382420 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      update "chat_platforms" 
      set "iconUrl" = '/logos/slack.svg'
      where name = '${ChatPlatformEnum.SLACK}'
    `);

    await queryRunner.query(`
      update "chat_platforms" 
      set "iconUrl" = '/logos/google-chat.svg'
      where name = '${ChatPlatformEnum.GOOGLE_CHAT}'
    `);

    await queryRunner.query(`
      update "chat_platforms" 
      set "iconUrl" = '/logos/discord.svg'
      where name = '${ChatPlatformEnum.DISCORD}'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }

}
