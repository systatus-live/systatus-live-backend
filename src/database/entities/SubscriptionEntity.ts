import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from './UserEntity';
import { PlanEntity } from './PlanEntity';
import { PlanPeriodEnum } from '../../types/PlanPeriodEnum';

@Entity({ name: "subscriptions" })
export class SubscriptionEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: "userId", referencedColumnName: "id" })
  user: UserEntity;

  @Column()
  userId: string;

  @ManyToOne(() => PlanEntity, { nullable: false })
  @JoinColumn({ name: "planId", referencedColumnName: "id" })
  plan: PlanEntity;

  @Column()
  planId: string;

  @Column({ type: "double precision", nullable: false })
  price: number;

  @Column({ type: "varchar", length: 10, nullable: false })
  period: PlanPeriodEnum;

  @Column({ type: "boolean", nullable: false, default: true })
  active: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: string;
}