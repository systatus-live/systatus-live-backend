import { PlanEnum } from "../../types/PlanEnum";
import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1789245191821 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE plans
      SET display_features = '{"monitors":50,"interval":"5min","retention_days":30,"slack":true,"whatsapp":false,"google_chat":true,"microsoft_teams":false,"discord":true,"mattermost":true,"email":false,"custom_messages":false,"status_page":false}'::jsonb
      WHERE name = '${PlanEnum.ANDORINHA}'
    `);

    await queryRunner.query(`
      UPDATE plans
      SET display_features = '{"monitors":100,"interval":"60s","retention_days":90,"slack":true,"whatsapp":false,"google_chat":true,"microsoft_teams":true,"discord":true,"mattermost":true,"email":true,"custom_messages":true,"status_page":true}'::jsonb
      WHERE name = '${PlanEnum.CORUJA}'
    `);

    await queryRunner.query(`
      UPDATE plans
      SET display_features = '{"monitors":200,"interval":"60s","retention_days":180,"slack":true,"whatsapp":true,"google_chat":true,"microsoft_teams":true,"discord":true,"mattermost":true,"email":true,"custom_messages":true,"status_page":true}'::jsonb
      WHERE name = '${PlanEnum.AGUIA}'
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
  }

}
