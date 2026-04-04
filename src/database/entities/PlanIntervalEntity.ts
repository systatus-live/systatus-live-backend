import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { PlanEntity } from './PlanEntity';
import { IntervalEntity } from './IntervalEntity';

@Entity({ name: "plan_intervals" })
export class PlanIntervalEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid", nullable: false })
  plan_id: string;

  @ManyToOne(() => PlanEntity)
  @JoinColumn({ name: "plan_id" })
  plan: PlanEntity;

  @Column({ type: "uuid", nullable: false })
  interval_id: string;

  @ManyToOne(() => IntervalEntity)
  @JoinColumn({ name: "interval_id" })
  interval: IntervalEntity;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: string;
}
