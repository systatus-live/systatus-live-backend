import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterIntegrationsTable1763988917584 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE integrations RENAME COLUMN url TO address;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
