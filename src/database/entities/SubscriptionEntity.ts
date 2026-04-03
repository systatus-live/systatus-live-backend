import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { PlanEntity } from './PlanEntity';
import { UserEntity } from './UserEntity';
import { SubscriptionStatusEnum } from '../../types/SubscriptionStatusEnum';

@Entity({ name: "subscriptions" })
export class SubscriptionEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: "user_id", referencedColumnName: "id" })
  user: UserEntity;

  @Column()
  user_id: string;

  @ManyToOne(() => PlanEntity, { nullable: false })
  @JoinColumn({ name: "plan_id", referencedColumnName: "id" })
  plan: PlanEntity;

  @Column()
  plan_id: string;

  @Column({ type: "timestamptz", nullable: false })
  start_date: string;

  @Column({ type: "timestamptz", nullable: true })
  end_date: string | null;

  @Column({ type: "enum", enum: SubscriptionStatusEnum, nullable: false })
  status: SubscriptionStatusEnum;

  @Column({ type: "varchar", length: 100, nullable: true })
  gateway_id: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: string;
}