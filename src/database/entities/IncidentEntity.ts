import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { MonitorEntity } from './MonitorEntity';

@Entity({ name: "incidents" })
export class IncidentEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => MonitorEntity, { onDelete: "CASCADE", nullable: false })
  @JoinColumn({ name: "monitorId", referencedColumnName: "id" })
  monitor: MonitorEntity;

  @Column()
  monitorId: string;

  @Column({ type: "bool", nullable: false })
  active: boolean;

  @Column({ type: "timestamptz", nullable: true })
  endedAt: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: string;
}