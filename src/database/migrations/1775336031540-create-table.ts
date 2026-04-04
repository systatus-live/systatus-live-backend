import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTable1775336031540 implements MigrationInterface {
  name = 'CreateTable1775336031540'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "status_page_monitors" ("status_page_id" uuid NOT NULL, "monitor_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_05338274322c3c4b8ea699f2eec" PRIMARY KEY ("status_page_id", "monitor_id"))`);
    await queryRunner.query(`ALTER TABLE "status_page_monitors" ADD CONSTRAINT "FK_f031e84e8dea42949db2571dcdd" FOREIGN KEY ("status_page_id") REFERENCES "status_pages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "status_page_monitors" ADD CONSTRAINT "FK_6fbac24d9c65c83bad9b668a907" FOREIGN KEY ("monitor_id") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
