import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { MonitorIncidentEntity } from './MonitorIncidentEntity';
import { MonitorEntity } from './MonitorEntity';

@Entity({ name: "monitor_historical" })
export class MonitorHistoryEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => MonitorEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "monitorId", referencedColumnName: "id" })
  monitor: MonitorEntity;

  @Column({ nullable: false })
  monitorId: string;

  @ManyToOne(() => MonitorIncidentEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "incidentId", referencedColumnName: "id" })
  incident: MonitorIncidentEntity;

  @Column({ nullable: true})
  incidentId: string;

  @Column({ type: "varchar", length: 7, nullable: false })
  status: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: string;
}