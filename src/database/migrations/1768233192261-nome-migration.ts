import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1768233192261 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`delete from intervals where name = '1 minuto'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }

}
