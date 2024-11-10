import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { MonitorEntity } from './MonitorEntity';
import { MonitorLogStatusEnum } from '../../enums/MonitorLogStatusEnum';

@Entity({ name: "monitor_logs"})
export class MonitorLogEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @PrimaryColumn("uuid")
  id_monitor: string;

  @ManyToOne(() => MonitorEntity, { nullable: false })
  @JoinColumn({ name: "id_monitor", referencedColumnName: "id" })
  monitor: MonitorEntity;

  @Column({ type: "enum", enum: MonitorLogStatusEnum, nullable: false })
  status: MonitorLogStatusEnum;

  @Column({ type: "int", nullable: true })
  http_status: number;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: string;
}