import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInitialTables1756048619791 implements MigrationInterface {
  name = 'CreateInitialTables1756048619791'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(1024) NOT NULL, "email" character varying(1024) NOT NULL, "password" text NOT NULL, "acceptedTerms" boolean NOT NULL DEFAULT false, "discovery" character varying(10), "verified" boolean NOT NULL DEFAULT false, "verificationCode" character varying(6), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "monitors" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(30) NOT NULL, "type" character varying(10) NOT NULL, "address" text NOT NULL, "active" boolean NOT NULL DEFAULT true, "cron" character varying(10) NOT NULL, "createdUserId" uuid NOT NULL, "updatedUserId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_193902e2013887310490284cdbe" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "monitor_historical" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "monitorId" uuid NOT NULL, "status" character varying(7) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2efc8056749d51a6e365f7734e4" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "integrations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying(30) NOT NULL, "url" character varying(1024) NOT NULL, "type" character varying NOT NULL, "createdUserId" uuid NOT NULL, "updatedUserId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9adcdc6d6f3922535361ce641e8" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "monitors" ADD CONSTRAINT "FK_887e857bf34016c3e0b86415b78" FOREIGN KEY ("createdUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "monitors" ADD CONSTRAINT "FK_a6b57dae6943b577cbda09899a6" FOREIGN KEY ("updatedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" ADD CONSTRAINT "FK_76e6bc1b36985f66390ef06d391" FOREIGN KEY ("monitorId") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "integrations" ADD CONSTRAINT "FK_68110c11fdc18bd6ee3c55d9ec7" FOREIGN KEY ("createdUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "integrations" ADD CONSTRAINT "FK_1c35f15afc8658d0b5ae9ee3532" FOREIGN KEY ("updatedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {

  }
}
