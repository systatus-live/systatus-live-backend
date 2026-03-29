import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterAmountToDecimal1774300000000 implements MigrationInterface {
  name = 'AlterAmountToDecimal1774300000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "invoices" ALTER COLUMN amount TYPE DECIMAL(10, 2)`);
    await queryRunner.query(`ALTER TABLE "payments" ALTER COLUMN amount TYPE DECIMAL(10, 2)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
