import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateChatPlataformsTable1760329088104 implements MigrationInterface {
  name = 'CreateChatPlataformsTable1760329088104'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "chat_platforms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "description" character varying(255) NOT NULL, "iconUrl" character varying(1024) NOT NULL, "docUrl" character varying(1024) NOT NULL, "createdUserId" uuid, "updatedUserId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_1a9a90741f8bd1864a173e9e2e4" UNIQUE ("name"), CONSTRAINT "PK_c66becec4b71681ef9cd17242c8" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "chat_platforms" ADD CONSTRAINT "FK_e48176d60175c53031d8b1f7066" FOREIGN KEY ("createdUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "chat_platforms" ADD CONSTRAINT "FK_c2213041c41a25639602cb3d81b" FOREIGN KEY ("updatedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
