import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { PlanEntity } from './PlanEntity';
import { UserEntity } from './UserEntity';
import { SubscriptionStatusEnum } from '../../types/SubscriptionStatusEnum';

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

  @Column({ type: "timestamptz", nullable: false })
  startDate: string;

  @Column({ type: "timestamptz", nullable: false })
  endDate: string;

  @Column({ type: "enum", enum: SubscriptionStatusEnum, nullable: false })
  status: SubscriptionStatusEnum;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: string;
}