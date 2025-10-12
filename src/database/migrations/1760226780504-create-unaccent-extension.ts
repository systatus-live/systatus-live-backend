import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUnaccentExtension1760226780504 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION unaccent`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
