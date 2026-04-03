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

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: false })
  amount: number;

  @Column({ type: "timestamptz", nullable: false })
  due_date: string;

  @Column({ type: "timestamptz", nullable: false })
  issue_date: string;

  @Column({ type: "enum", enum: InvoiceStatusEnum, nullable: false })
  status: InvoiceStatusEnum;

  @Column({ type: "varchar", length: 100, nullable: true })
  gateway_id: string | null;

  @Column({ type: "timestamptz", nullable: true })
  subscription_start_date: string | null;

  @Column({ type: "timestamptz", nullable: true })
  subscription_end_date: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: string;
}