import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlanDisplayFeatures1774051200000 implements MigrationInterface {
  name = 'AddPlanDisplayFeatures1774051200000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "plans" ADD "displayFeatures" jsonb NOT NULL DEFAULT '[]'`);

    const andorinhaFeatures = JSON.stringify([
      { label: "5 monitores", enabled: true },
      { label: "Monitoramento a cada 5 minutos", enabled: true },
      { label: "Notificações no Slack", enabled: true },
      { label: "Notificações no Google Chat", enabled: true },
      { label: "Notificações no E-mail", enabled: true },
      { label: "Notificações no Discord", enabled: true },
      { label: "Notificações no WhatsApp", enabled: false },
      { label: "Mensagens personalizáveis", enabled: false },
      { label: "Página de status pública", enabled: false },
    ]);

    const corujaFeatures = JSON.stringify([
      { label: "🆙 50 monitores", enabled: true },
      { label: "🆙 Monitoramento a cada 60 segundos", enabled: true },
      { label: "Notificações no Slack", enabled: true },
      { label: "Notificações no Google Chat", enabled: true },
      { label: "Notificações no E-mail", enabled: true },
      { label: "Notificações no Discord", enabled: true },
      { label: "Notificações no WhatsApp", enabled: false },
      { label: "Mensagens personalizáveis", enabled: false },
      { label: "🆙 Página de status pública", enabled: true },
    ]);

    const aguiaFeatures = JSON.stringify([
      { label: "🆙 100 monitores", enabled: true },
      { label: "🆙 Monitoramento a cada 60 segundos", enabled: true },
      { label: "🆙 Notificações no Slack", enabled: true },
      { label: "Notificações no Google Chat", enabled: true },
      { label: "Notificações no E-mail", enabled: true },
      { label: "Notificações no Discord", enabled: true },
      { label: "Notificações no WhatsApp", enabled: true },
      { label: "🆙 Mensagens personalizáveis", enabled: true },
      { label: "🆙 Página de status pública", enabled: true },
    ]);

    await queryRunner.query(`UPDATE "plans" SET "displayFeatures" = $1 WHERE name = 'Andorinha'`, [andorinhaFeatures]);
    await queryRunner.query(`UPDATE "plans" SET "displayFeatures" = $1 WHERE name = 'Coruja'`, [corujaFeatures]);
    await queryRunner.query(`UPDATE "plans" SET "displayFeatures" = $1 WHERE name = 'Águia'`, [aguiaFeatures]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "plans" DROP COLUMN "displayFeatures"`);
  }
}
