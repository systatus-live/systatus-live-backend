import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInitialTables1731171138314 implements MigrationInterface {
  name = 'CreateInitialTables1731171138314'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(1024) NOT NULL, "email" character varying(1024) NOT NULL, "password" character varying(4096) NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_0fb77e465edebc92c4aa86c548a" UNIQUE ("email"), CONSTRAINT "PK_4ab1c54e07add7286bfd0c510c4" PRIMARY KEY ("id"))`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
