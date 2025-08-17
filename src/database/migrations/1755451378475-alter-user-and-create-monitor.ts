import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterUserAndCreateMonitor1755451378475 implements MigrationInterface {
  name = 'AlterUserAndCreateMonitor1755451378475'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "monitors" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(30) NOT NULL, "type" character varying(10) NOT NULL, "uri" text NOT NULL, "active" boolean NOT NULL DEFAULT true, "cron" character varying(10) NOT NULL, "createdUserId" character varying NOT NULL, "updatedUserId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_193902e2013887310490284cdbe" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "created_at" to "createdAt"`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "updated_at" to "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "accepted_terms" to "acceptedTerms"`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "verification_code" to "verificationCode"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
