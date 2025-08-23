import { Column, CreateDateColumn, Entity, JoinColumn, ManyToMany, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { MonitorEntity } from './MonitorEntity';

@Entity({ name: "monitor_historical" })
export class MonitorHistoryEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => MonitorEntity, { onDelete: "CASCADE", nullable: false })
  @JoinColumn({ name: "monitorId", referencedColumnName: "id" })
  monitor: MonitorEntity;

  @Column()
  monitorId: string;

  @Column({ type: "varchar", length: 7, nullable: false })
  status: string;

  @CreateDateColumn()
  createdAt: string;

  @UpdateDateColumn()
  updatedAt: string;
}