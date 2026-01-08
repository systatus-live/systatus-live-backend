import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterMonitorTable1767714171721 implements MigrationInterface {
  name = 'AlterMonitorTable1767714171721'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "monitors" DROP COLUMN "cron"`);
    await queryRunner.query(`ALTER TABLE "monitors" ADD "intervalId" uuid NULL`);
    await queryRunner.query(`update monitors set "intervalId" = (select t.id from intervals t where t.name = '5 minutos' )`);
    await queryRunner.query(`ALTER TABLE "monitors" ALTER COLUMN "intervalId" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "monitors" ADD CONSTRAINT "FK_57f973548cfad5d93880e628623" FOREIGN KEY ("intervalId") REFERENCES "intervals"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
