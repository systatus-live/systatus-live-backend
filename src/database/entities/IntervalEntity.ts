import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: "intervals" })
export class IntervalEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "int", nullable: false })
  index: number;

  @Column({ type: "varchar", length: 30, nullable: false })
  name: string;

  @Column({ type: "varchar", length: 20, nullable: false })
  cron: string

  @CreateDateColumn({ type: "timestamptz" })
  created_at: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: string;
}