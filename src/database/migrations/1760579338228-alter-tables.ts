import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterTables1760579338228 implements MigrationInterface {
  name = 'AlterTables1760579338228'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "integrations" RENAME COLUMN "type" TO "chatPlatformId"`);
    await queryRunner.query(`ALTER TABLE "integrations" DROP COLUMN "chatPlatformId"`);
    await queryRunner.query(`ALTER TABLE "integrations" ADD "chatPlatformId" uuid NOT NULL`);
    await queryRunner.query(`ALTER TABLE "integrations" ADD CONSTRAINT "FK_a25946b36649e36a4eb5c403a6e" FOREIGN KEY ("chatPlatformId") REFERENCES "chat_platforms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
