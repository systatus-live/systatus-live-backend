import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateChatPlatforms1768060157416 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`update "chat_platforms" set "iconUrl" = replace("iconUrl", 'https://systatus.live', '')`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }

}
