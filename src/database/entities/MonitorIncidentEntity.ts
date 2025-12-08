import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { MonitorEntity } from './MonitorEntity';

@Entity({ name: "monitor_incidents" })
export class MonitorIncidentEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => MonitorEntity, { onDelete: "CASCADE", nullable: false })
  @JoinColumn({ name: "monitorId", referencedColumnName: "id" })
  monitor: MonitorEntity;

  @Column()
  monitorId: string;

  @Column({ type: "bool", nullable: false })
  active: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: string;
}