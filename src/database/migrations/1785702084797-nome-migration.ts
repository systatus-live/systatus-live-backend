import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1785702084797 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`update monitors set type = 'HTTP' where type = 'GET'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
