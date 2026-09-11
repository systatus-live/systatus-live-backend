import { PlanEnum } from "../../types/PlanEnum";
import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateHintMensagensPersonalizaveis1788912001000 implements MigrationInterface {
  name = 'UpdateHintMensagensPersonalizaveis1788912001000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE plans
      SET display_features = (
        SELECT jsonb_agg(
          CASE
            WHEN elem->>'hint' = 'Compatível com Slack, Discord, Google Chat e Mattermost'
            THEN jsonb_set(elem, '{hint}', '"Compatível com Slack, Discord, Google Chat, Mattermost e Microsoft Teams"')
            ELSE elem
          END
        )
        FROM jsonb_array_elements(display_features) elem
      )
      WHERE name IN ('${PlanEnum.ANDORINHA}', '${PlanEnum.CORUJA}', '${PlanEnum.AGUIA}')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
