import { PlanEnum } from "../../types/PlanEnum";
import { PermissionEnum } from "../../types/PermissionEnum";
import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTable1775339750126 implements MigrationInterface {
  name = 'CreateTable1775339750126'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "permissions" (name, description) VALUES
      ('${PermissionEnum.STATUS_PAGE}', 'Acesso à criação e gestão de página pública de status'),
      ('${PermissionEnum.CUSTOM_NOTIFICATION}', 'Notificações customizadas')
    `);

    await queryRunner.query(`
      INSERT INTO "plan_permissions" (plan_id, permission_id)
      SELECT p.id, perm.id
      FROM plans p
      CROSS JOIN permissions perm
      WHERE
        (p.name = '${PlanEnum.CORUJA}' AND perm.name IN (
          '${PermissionEnum.CUSTOM_NOTIFICATION}',
          '${PermissionEnum.STATUS_PAGE}'
        ))
        OR (p.name = '${PlanEnum.AGUIA}' AND perm.name IN (
          '${PermissionEnum.CUSTOM_NOTIFICATION}',
          '${PermissionEnum.STATUS_PAGE}'
        ))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
