import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateIndex1788490320730 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Índice usado pelo DISTINCT ON de last_check e pelas queries de histórico por monitor
    await queryRunner.query(`
      create index if not exists idx_monitor_historical_monitor_created_at
      on monitor_historical (monitor_id, created_at desc)
    `);

    // Índice usado pelo DISTINCT ON de last_incident e pela query de incidentes recentes por monitor
    await queryRunner.query(`
      create index if not exists idx_incidents_monitor_created_at
      on incidents (monitor_id, created_at desc)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }

}
