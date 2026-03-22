import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { SubscriptionEntity } from './SubscriptionEntity';
import { InvoiceStatusEnum } from '../../types/InvoiceStatusEnum';

@Entity({ name: "invoices" })
export class InvoiceEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => SubscriptionEntity)
  @JoinColumn({ name: "subscription_id", referencedColumnName: "id" })
  subscription: SubscriptionEntity;

  @Column({ nullable: false })
  subscription_id: string;

  @Column({ type: "int", nullable: false })
  amount: number;

  @Column({ type: "timestamptz", nullable: false })
  due_date: string;

  @Column({ type: "timestamptz", nullable: false })
  issue_date: string;

  @Column({ type: "enum", enum: InvoiceStatusEnum, nullable: false })
  status: InvoiceStatusEnum;

  @Column({ type: "timestamptz", nullable: false })
  subscription_start_date: string;

  @Column({ type: "timestamptz", nullable: false })
  subscription_end_date: string;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: string;
}