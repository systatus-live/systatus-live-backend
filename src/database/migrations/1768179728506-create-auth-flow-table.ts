import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAuthFlowTable1768179728506 implements MigrationInterface {
  name = 'CreateAuthFlowTable1768179728506'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "auth_flows" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "object" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_5b956a3a6a705882a27bbb83271" PRIMARY KEY ("id"))`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
