import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { PaymentStatusEnum } from '../../types/PaymentStatusEnum';
import { InvoiceEntity } from './InvoiceEntity';

@Entity({ name: "payments" })
export class PaymentEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => InvoiceEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "invoice_id", referencedColumnName: "id" })
  invoice: InvoiceEntity;

  @Column({ nullable: false })
  invoice_id: string;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: false })
  amount: number;

  @Column({ type: "timestamptz", nullable: true })
  paid_date: string | null;

  @Column({ type: "enum", enum: PaymentStatusEnum, nullable: false })
  status: PaymentStatusEnum;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: string;
}