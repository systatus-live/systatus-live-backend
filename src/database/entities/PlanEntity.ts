import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: "plans" })
export class PlanEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "int", nullable: false })
  index: number;

  @Column({ type: "varchar", length: 30, nullable: false, unique: true })
  name: string;

  @Column({ type: "varchar", length: 500, nullable: false })
  description: string;

  @Column({ type: "double precision", nullable: false })
  price: number;

  @Column({ type: "varchar", length: 100, nullable: false })
  image: string;

  @Column({ type: "int", nullable: false })
  monitor_qty: number;

  @Column({ type: "boolean", nullable: false })
  whatsapp: boolean;

  @Column({ type: "boolean", nullable: false })
  slack: boolean;

  @Column({ type: "boolean", nullable: false })
  google_chat: boolean;

  @Column({ type: "boolean", nullable: false })
  email: boolean;

  @Column({ type: "boolean", nullable: false })
  discord: boolean;

  @Column({ type: "boolean", nullable: false })
  custom_notification: boolean;

  @Column({ type: "boolean", nullable: false })
  status_page: boolean;

  @Column({ type: "jsonb", nullable: false, default: "[]" })
  display_features: { label: string; included: boolean; }[];

  @Column({ type: "varchar", length: 100, nullable: true })
  stripe_price_id: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: string;
}