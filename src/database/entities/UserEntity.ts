import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: "users" })
export class UserEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 1024, nullable: false })
  name: string;

  @Column({ type: "varchar", unique: true, length: 1024, nullable: false })
  email: string;

  @Column({ type: "text", nullable: false })
  password: string;

  @Column({ type: "boolean", nullable: false, default: false })
  accepted_terms: boolean;

  @Column({ type: "varchar", length: 10, nullable: true })
  discovery: string | null;

  @Column({ type: "boolean", nullable: false, default: false })
  verified: boolean;

  @Column({ type: "varchar", length: 6, nullable: true })
  verification_code: string | null;

  @CreateDateColumn()
  created_at: string;

  @UpdateDateColumn()
  updated_at: string;
}