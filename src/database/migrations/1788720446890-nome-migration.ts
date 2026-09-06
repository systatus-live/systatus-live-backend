import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1788720446890 implements MigrationInterface {
  name = 'NomeMigration1788720446890'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      update integration_templates 
      set down_template = '{{monitor}} ({{address}}) ficou indisponível: {{status_description}}', up_template = '{{monitor}} ({{address}}) ficou disponível. Downtime: {{downtime}}'
      where 1 = 1;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
