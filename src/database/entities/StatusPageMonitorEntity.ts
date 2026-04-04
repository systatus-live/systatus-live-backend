import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { MonitorEntity } from './MonitorEntity';
import { StatusPageEntity } from './StatusPageEntity';

@Entity({ name: "status_page_monitors" })
export class StatusPageMonitorEntity {
  @ManyToOne(() => StatusPageEntity, { onDelete: "CASCADE", nullable: false })
  @JoinColumn({ name: "status_page_id", referencedColumnName: "id" })
  statusPage: StatusPageEntity;

  @PrimaryColumn()
  status_page_id: string;

  @ManyToOne(() => MonitorEntity, { onDelete: "CASCADE", nullable: false })
  @JoinColumn({ name: "monitor_id", referencedColumnName: "id" })
  monitor: MonitorEntity;

  @PrimaryColumn()
  monitor_id: string;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: string;
}
