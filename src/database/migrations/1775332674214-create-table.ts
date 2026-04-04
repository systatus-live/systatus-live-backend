import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTable1775332674214 implements MigrationInterface {
  name = 'CreateTable1775332674214'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "status_pages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "slug" character varying(50) NOT NULL, "title" character varying(100) NOT NULL, "active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_250dbd86b366571a497ebcea918" UNIQUE ("slug"), CONSTRAINT "PK_360e97c9c5ba8a8f5ca88315028" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "status_pages" ADD CONSTRAINT "FK_9003fb143d6748a7787c6789e91" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
