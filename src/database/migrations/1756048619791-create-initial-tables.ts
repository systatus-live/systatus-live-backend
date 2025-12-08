import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInitialTables1756048619791 implements MigrationInterface {
  name = 'CreateInitialTables1756048619791'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(1024) NOT NULL, "email" character varying(1024) NOT NULL, "password" text NOT NULL, "acceptedTerms" boolean NOT NULL DEFAULT false, "discovery" character varying(50), "verified" boolean NOT NULL DEFAULT false, "verificationCode" character varying(6), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "monitors" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(30) NOT NULL, "type" character varying(10) NOT NULL, "address" text NOT NULL, "active" boolean NOT NULL DEFAULT true, "cron" character varying(20) NOT NULL, "createdUserId" uuid NOT NULL, "updatedUserId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_193902e2013887310490284cdbe" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "chat_platforms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "description" character varying(255) NOT NULL, "iconUrl" character varying(1024) NOT NULL, "docUrl" character varying(1024) NOT NULL, "createdUserId" uuid, "updatedUserId" uuid, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_1a9a90741f8bd1864a173e9e2e4" UNIQUE ("name"), CONSTRAINT "PK_c66becec4b71681ef9cd17242c8" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "integrations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(30) NOT NULL, "address" character varying(1024) NOT NULL, "chatPlatformId" uuid NOT NULL, "createdUserId" uuid NOT NULL, "updatedUserId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9adcdc6d6f3922535361ce641e8" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "monitor_integrations" ("monitorId" uuid NOT NULL, "integrationId" uuid NOT NULL, "createdUserId" uuid NOT NULL, "updatedUserId" uuid NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ef8b697155cca5577a1ef0cee96" PRIMARY KEY ("monitorId", "integrationId"))`);
    await queryRunner.query(`CREATE TABLE "monitor_incidents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "monitorId" uuid NOT NULL, "active" boolean NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_cd9eb53c90c591c23f0cf09c9d5" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "monitor_historical" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "monitorId" uuid NOT NULL, "incidentId" uuid, "status" character varying(7) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_2efc8056749d51a6e365f7734e4" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "monitors" ADD CONSTRAINT "FK_887e857bf34016c3e0b86415b78" FOREIGN KEY ("createdUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "monitors" ADD CONSTRAINT "FK_a6b57dae6943b577cbda09899a6" FOREIGN KEY ("updatedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "chat_platforms" ADD CONSTRAINT "FK_e48176d60175c53031d8b1f7066" FOREIGN KEY ("createdUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "chat_platforms" ADD CONSTRAINT "FK_c2213041c41a25639602cb3d81b" FOREIGN KEY ("updatedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "integrations" ADD CONSTRAINT "FK_a25946b36649e36a4eb5c403a6e" FOREIGN KEY ("chatPlatformId") REFERENCES "chat_platforms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "integrations" ADD CONSTRAINT "FK_68110c11fdc18bd6ee3c55d9ec7" FOREIGN KEY ("createdUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "integrations" ADD CONSTRAINT "FK_1c35f15afc8658d0b5ae9ee3532" FOREIGN KEY ("updatedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "monitor_integrations" ADD CONSTRAINT "FK_c11c5215852d40a59111bd852db" FOREIGN KEY ("monitorId") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "monitor_integrations" ADD CONSTRAINT "FK_f1f3dad7513668e77a06af3c005" FOREIGN KEY ("integrationId") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "monitor_integrations" ADD CONSTRAINT "FK_260234474fe34dfbf962156849a" FOREIGN KEY ("createdUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "monitor_integrations" ADD CONSTRAINT "FK_fd082dd3c3ab0f7c7211bba0b3b" FOREIGN KEY ("updatedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "monitor_incidents" ADD CONSTRAINT "FK_9c3f3ff306a4c29c89ac87ded82" FOREIGN KEY ("monitorId") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" ADD CONSTRAINT "FK_76e6bc1b36985f66390ef06d391" FOREIGN KEY ("monitorId") REFERENCES "monitor_historical"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" ADD CONSTRAINT "FK_c0e3e8da7834520d0463824f081" FOREIGN KEY ("incidentId") REFERENCES "monitor_incidents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {

  }
}
