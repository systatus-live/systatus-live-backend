import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1765156700899 implements MigrationInterface {
  name = 'NomeMigration1765156700899'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "monitor_historical" DROP CONSTRAINT "FK_76e6bc1b36985f66390ef06d391"`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" ADD CONSTRAINT "FK_76e6bc1b36985f66390ef06d391" FOREIGN KEY ("monitorId") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
