import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameTable1767268758872 implements MigrationInterface {
  name = 'RenameTable1767268758872'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE monitor_incidents RENAME TO incidents;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }

}
