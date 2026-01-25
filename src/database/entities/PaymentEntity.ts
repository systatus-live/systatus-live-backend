import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { PaymentStatusEnum } from '../../types/PaymentStatusEnum';
import { InvoiceEntity } from './InvoiceEntity';

@Entity({ name: "payments" })
export class PaymentEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => InvoiceEntity)
  @JoinColumn({ name: "invoiceId", referencedColumnName: "id" })
  invoice: InvoiceEntity;

  @Column({ nullable: false })
  invoiceId: string;

  @Column({ type: "int", nullable: false })
  amount: number;

  @Column({ type: "timestamptz", nullable: true })
  paidDate: string | null;

  @Column({ type: "enum", enum: PaymentStatusEnum, nullable: false })
  status: PaymentStatusEnum;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: string;
}