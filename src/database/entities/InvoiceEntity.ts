import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { SubscriptionEntity } from './SubscriptionEntity';
import { InvoiceStatusEnum } from '../../types/InvoiceStatusEnum';

@Entity({ name: "invoices" })
export class InvoiceEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => SubscriptionEntity)
  @JoinColumn({ name: "subscriptionId", referencedColumnName: "id" })
  subscription: SubscriptionEntity;

  @Column({ nullable: false })
  subscriptionId: string;

  @Column({ type: "int", nullable: false })
  amount: number;

  @Column({ type: "timestamptz", nullable: false })
  dueDate: string;

  @Column({ type: "timestamptz", nullable: false })
  issueDate: string;

  @Column({ type: "enum", enum: InvoiceStatusEnum, nullable: false })
  status: InvoiceStatusEnum;

  @Column({ type: "timestamptz", nullable: false })
  subscriptionStartDate: string;

  @Column({ type: "timestamptz", nullable: false })
  subscriptionEndDate: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: string;
}