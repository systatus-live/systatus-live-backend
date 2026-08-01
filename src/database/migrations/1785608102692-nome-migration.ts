import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1785608102692 implements MigrationInterface {
  name = 'NomeMigration1785608102692'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "auth_historical" DROP COLUMN "location_json"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
