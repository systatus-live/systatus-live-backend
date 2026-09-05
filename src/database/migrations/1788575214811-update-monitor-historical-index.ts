import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateMonitorHistoricalIndex1788575214811 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Recria o índice com INCLUDE (status, total_ms) para permitir Index Only Scan no hist_agg e last_check
    await queryRunner.query(`drop index if exists idx_monitor_historical_monitor_created_at`);
    
    await queryRunner.query(`
      create index idx_monitor_historical_monitor_created_at
      on monitor_historical (monitor_id, created_at desc)
      include (status, total_ms)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
