import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { MonitorEntity } from './MonitorEntity';

@Entity({ name: "incidents" })
export class IncidentEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => MonitorEntity, { onDelete: "CASCADE", nullable: false })
  @JoinColumn({ name: "monitor_id", referencedColumnName: "id" })
  monitor: MonitorEntity;

  @Column()
  monitor_id: string;

  @Column({ type: "bool", nullable: false })
  active: boolean;

  @Column({ type: "timestamptz", nullable: true })
  ended_at: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: string;
}