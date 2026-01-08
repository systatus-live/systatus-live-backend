import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateIntervalTable1767713021476 implements MigrationInterface {
  name = 'CreateIntervalTable1767713021476'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "chat_platforms" DROP CONSTRAINT "FK_e48176d60175c53031d8b1f7066"`);
    await queryRunner.query(`ALTER TABLE "chat_platforms" DROP CONSTRAINT "FK_c2213041c41a25639602cb3d81b"`);
    await queryRunner.query(`ALTER TABLE "chat_platforms" DROP COLUMN "createdUserId"`);
    await queryRunner.query(`ALTER TABLE "chat_platforms" DROP COLUMN "updatedUserId"`);

    await queryRunner.query(`CREATE TABLE "intervals" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "index" integer NOT NULL, "name" character varying(30) NOT NULL, "cron" character varying(20) NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_7e4b9f86ec6cdbdbf21c19f79b5" PRIMARY KEY ("id"))`);
    await queryRunner.query(`insert into intervals (index, name, cron) values (1, '1 minuto', '* * * * *')`);
    await queryRunner.query(`insert into intervals (index, name, cron) values (2, '5 minutos', '*/5 * * * *')`);
    await queryRunner.query(`insert into intervals (index, name, cron) values (3, '30 minutos', '*/30 * * * *')`);
    await queryRunner.query(`insert into intervals (index, name, cron) values (4, '1 hora', '0 * * * *')`);
    await queryRunner.query(`insert into intervals (index, name, cron) values (5, '12 horas', '0 */12 * * *')`);
    await queryRunner.query(`insert into intervals (index, name, cron) values (6, '24 horas', '0 0 * * *')`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
