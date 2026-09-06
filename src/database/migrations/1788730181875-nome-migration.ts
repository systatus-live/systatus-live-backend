import { ChatPlatformEnum } from "src/types/ChatPlatformEnum";
import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1788730181875 implements MigrationInterface {
  name = 'NomeMigration1788730181875'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chat_platforms" ADD "index" integer NOT NULL DEFAULT '0'`);
    await queryRunner.query(`UPDATE "chat_platforms" SET INDEX = 1 WHERE NAME = '${ChatPlatformEnum.SLACK}'`);
    await queryRunner.query(`UPDATE "chat_platforms" SET INDEX = 2 WHERE NAME = '${ChatPlatformEnum.WHATSAPP}'`);
    await queryRunner.query(`UPDATE "chat_platforms" SET INDEX = 3 WHERE NAME = '${ChatPlatformEnum.DISCORD}'`);
    await queryRunner.query(`UPDATE "chat_platforms" SET INDEX = 4 WHERE NAME = '${ChatPlatformEnum.EMAIL}'`);
    await queryRunner.query(`UPDATE "chat_platforms" SET INDEX = 5 WHERE NAME = '${ChatPlatformEnum.GOOGLE_CHAT}'`);
    await queryRunner.query(`UPDATE "chat_platforms" SET INDEX = 6 WHERE NAME = '${ChatPlatformEnum.MATTERMOST}'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }

}
