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

  @Column({ type: "decimal", nullable: false })
  price: number;

  @Column({ type: "varchar", length: 100, nullable: false })
  image: string;

  @Column({ type: "int", nullable: false })
  monitorQty: number;

  @Column({ type: "boolean", nullable: false })
  whatsapp: boolean;

  @Column({ type: "boolean", nullable: false })
  slack: boolean;

  @Column({ type: "boolean", nullable: false })
  googleChat: boolean;

  @Column({ type: "boolean", nullable: false })
  email: boolean;

  @Column({ type: "boolean", nullable: false })
  discord: boolean;

  @Column({ type: "boolean", nullable: false })
  customNotification: boolean;

  @Column({ type: "boolean", nullable: false })
  statusPage: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: string;
}