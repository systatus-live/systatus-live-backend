import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateInitialIndex1788488814811 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Índice parcial usado pelo LATERAL JOIN que busca o primeiro status de erro (não-2xx) por incidente.
    await queryRunner.query(`
      create index if not exists idx_monitor_historical_first_error
      on monitor_historical (monitor_id, incident_id, created_at)
      where status not like '2%'
    `);

    // Índice usado pelo LATERAL JOIN que busca o último status registrado por incidente (sem filtro de status).
    await queryRunner.query(`
      create index if not exists idx_monitor_historical_last_status
      on monitor_historical (monitor_id, incident_id, created_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
