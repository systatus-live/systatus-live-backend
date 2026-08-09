import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1786302223170 implements MigrationInterface {
  name = 'NomeMigration1786302223170'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "integration_templates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "integration_id" uuid NOT NULL, "type" character varying(1) NOT NULL, "down_template" text, "up_template" text, "created_user_id" uuid NOT NULL, "updated_user_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_4ccb1f740bf2bc0fcf3b79ef409" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "integration_templates" ADD CONSTRAINT "FK_31882464338fadd35ff76bd3cd6" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "integration_templates" ADD CONSTRAINT "FK_86026c75c1eae88e2f414c7a1bd" FOREIGN KEY ("created_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "integration_templates" ADD CONSTRAINT "FK_0485348dd3e89e88ba4e0d0003b" FOREIGN KEY ("updated_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
