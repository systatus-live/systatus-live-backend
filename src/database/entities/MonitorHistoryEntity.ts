import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { IncidentEntity } from './IncidentEntity';
import { MonitorEntity } from './MonitorEntity';

@Entity({ name: "monitor_historical" })
export class MonitorHistoryEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => MonitorEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "monitor_id", referencedColumnName: "id" })
  monitor: MonitorEntity;

  @Column({ nullable: false })
  monitor_id: string;

  @ManyToOne(() => IncidentEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "incident_id", referencedColumnName: "id" })
  incident: IncidentEntity;

  @Column({ nullable: true })
  incident_id: string;

  @Column({ type: "varchar", length: 7, nullable: false })
  status: string;

  @Column({ type: "double precision", nullable: true })
  duration: number | null;

  @Column({ type: "jsonb", nullable: true })
  request_headers: Record<any, any> | null

  @Column({ type: "jsonb", nullable: true })
  response_headers: Record<any, any> | null

  @CreateDateColumn({ type: "timestamptz" })
  created_at: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: string;
}