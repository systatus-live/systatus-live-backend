import { IntegrationTemplateTypeEnum } from "../../types/IntegrationTemplateTypeEnum";
import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1786309970100 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      insert into integration_templates (
        integration_id
        , type
        , down_template
        , up_template
        , created_user_id
        , updated_user_id
      )
      select 
        id
        , '${IntegrationTemplateTypeEnum.DEFAULT}'
        , '🔴 {{monitor}} ({{address}}) ficou indisponível: {{status_description}}'
        , '🟢 {{monitor}} ({{address}}) ficou disponível. Downtime: {{downtime}}'
        , created_user_id
        , updated_user_id
      from integrations
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }

}
