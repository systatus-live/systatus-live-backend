import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterTable1768705266738 implements MigrationInterface {
  name = 'AlterTable1768705266738'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`drop table auth_sessions`);
    await queryRunner.query(`CREATE TABLE "auth_historical" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "ip" character varying(50) NOT NULL, "userAgent" character varying(1024) NOT NULL, "locationJson" character varying(4096), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_95cd3b48d1147c5a6b5c1d53750" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "auth_historical" ADD CONSTRAINT "FK_7f632038dee3a5065207e25b562" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
