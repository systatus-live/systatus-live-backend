import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterTable1768766014758 implements MigrationInterface {
  name = 'AlterTable1768766014758'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "auth_historical" DROP CONSTRAINT "FK_7f632038dee3a5065207e25b562"`);
    await queryRunner.query(`ALTER TABLE "auth_historical" ADD CONSTRAINT "FK_7f632038dee3a5065207e25b562" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "auth_historical" DROP CONSTRAINT "FK_7f632038dee3a5065207e25b562"`);
    await queryRunner.query(`ALTER TABLE "auth_historical" ADD CONSTRAINT "FK_7f632038dee3a5065207e25b562" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }

}
