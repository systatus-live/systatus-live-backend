import { PlanEnum } from "../../types/PlanEnum";
import { PermissionEnum } from "../../types/PermissionEnum";
import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTable1775339750126 implements MigrationInterface {
  name = 'CreateTable1775339750126'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "permissions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(100) NOT NULL, "description" character varying(255), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_48ce552495d14eae9b187bb6716" UNIQUE ("name"), CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY ("id"))`);
    await queryRunner.query(`CREATE TABLE "plan_permissions" ("plan_id" uuid NOT NULL, "permission_id" uuid NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8a987d4a069eeb99dbbe09b9247" PRIMARY KEY ("plan_id", "permission_id"))`);
    await queryRunner.query(`ALTER TABLE "plan_permissions" ADD CONSTRAINT "FK_36549acf496ef5f01d8422b60ed" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "plan_permissions" ADD CONSTRAINT "FK_e33b46b382b210fe9b9316d1f0c" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);

    await queryRunner.query(`
      INSERT INTO "permissions" (name, description) VALUES
      ('${PermissionEnum.STATUS_PAGE}', 'Acesso à criação e gestão de página pública de status'),
      ('${PermissionEnum.INTEG_SLACK}', 'Integração com Slack para notificações'),
      ('${PermissionEnum.INTEG_DISCORD}', 'Integração com Discord para notificações'),
      ('${PermissionEnum.INTEG_GOOGLE_CHAT}', 'Integração com Google Chat para notificações'),
      ('${PermissionEnum.INTEG_EMAIL}', 'Integração com Email para notificações'),
      ('${PermissionEnum.INTEG_WHATSAPP}', 'Integração com WhatsApp para notificações'),
      ('${PermissionEnum.CUSTOM_NOTIFICATION}', 'Notificações customizadas')
    `);

    await queryRunner.query(`
      INSERT INTO "plan_permissions" (plan_id, permission_id)
      SELECT p.id, perm.id
      FROM plans p
      CROSS JOIN permissions perm
      WHERE
        (p.name = '${PlanEnum.ANDORINHA}' AND perm.name IN (
          '${PermissionEnum.INTEG_SLACK}',
          '${PermissionEnum.INTEG_GOOGLE_CHAT}',
          '${PermissionEnum.INTEG_EMAIL}',
          '${PermissionEnum.INTEG_DISCORD}'
        ))
        OR (p.name = '${PlanEnum.CORUJA}' AND perm.name IN (
          '${PermissionEnum.INTEG_SLACK}',
          '${PermissionEnum.INTEG_GOOGLE_CHAT}',
          '${PermissionEnum.INTEG_EMAIL}',
          '${PermissionEnum.INTEG_DISCORD}',
          '${PermissionEnum.STATUS_PAGE}'
        ))
        OR (p.name = '${PlanEnum.AGUIA}' AND perm.name IN (
          '${PermissionEnum.INTEG_SLACK}',
          '${PermissionEnum.INTEG_GOOGLE_CHAT}',
          '${PermissionEnum.INTEG_EMAIL}',
          '${PermissionEnum.INTEG_DISCORD}',
          '${PermissionEnum.INTEG_WHATSAPP}',
          '${PermissionEnum.CUSTOM_NOTIFICATION}',
          '${PermissionEnum.STATUS_PAGE}'
        ))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}