import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterUsers1768697332625 implements MigrationInterface {
  name = 'AlterUsers1768697332625'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN "name" TYPE varchar(50) USING "name"::varchar(50);`);
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN email TYPE varchar(255) USING email::varchar(255);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
