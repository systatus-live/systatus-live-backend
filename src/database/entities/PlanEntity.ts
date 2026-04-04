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

  @Column({ type: "jsonb", nullable: false, default: "[]" })
  display_features: { label: string; included: boolean; }[];

  @Column({ type: "varchar", length: 100, nullable: true })
  stripe_price_id: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: string;
}
