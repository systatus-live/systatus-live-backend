import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInitialTables1731261696277 implements MigrationInterface {
  name = 'CreateInitialTables1731261696277'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(1024) NOT NULL, "email" character varying(1024) NOT NULL, "password" character varying(4096), "verified" boolean NOT NULL DEFAULT false, "confirmation_code" character varying(10), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
