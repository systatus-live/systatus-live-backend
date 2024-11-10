import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInitialTables1731277877553 implements MigrationInterface {
  name = 'CreateInitialTables1731277877553'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(1024) NOT NULL, "email" character varying(1024) NOT NULL, "password" character varying(4096), "verified" boolean NOT NULL DEFAULT false, "confirmation_code" character varying(10), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TYPE "public"."monitors_type_enum" AS ENUM('HTTP', 'PING')`);
    await queryRunner.query(`CREATE TYPE "public"."monitors_http_method_enum" AS ENUM('OPTIONS', 'POST', 'GET', 'PUT', 'PATCH', 'DELETE')`);
    await queryRunner.query(`CREATE TABLE "monitors" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(1024) NOT NULL, "cron" character varying(100) NOT NULL, "type" "public"."monitors_type_enum" NOT NULL, "http_method" "public"."monitors_http_method_enum", "address" text NOT NULL, "id_user" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_193902e2013887310490284cdbe" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TYPE "public"."monitor_logs_status_enum" AS ENUM('SUCCESS', 'ERROR')`);
    await queryRunner.query(`CREATE TABLE "monitor_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "id_monitor" uuid NOT NULL, "status" "public"."monitor_logs_status_enum" NOT NULL, "http_status" integer, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_10de0181aa41f0652c8c51b992c" PRIMARY KEY ("id", "id_monitor"))`);
    await queryRunner.query(`ALTER TABLE "monitors" ADD CONSTRAINT "FK_89684d94660d3f416612e40fc4a" FOREIGN KEY ("id_user") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "monitor_logs" ADD CONSTRAINT "FK_241e221c8dd65b909e2afe39b9e" FOREIGN KEY ("id_monitor") REFERENCES "monitors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
