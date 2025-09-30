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
  acceptedTerms: boolean;

  @Column({ type: "varchar", length: 50, nullable: true })
  discovery: string | null;

  @Column({ type: "boolean", nullable: false, default: false })
  verified: boolean;

  @Column({ type: "varchar", length: 6, nullable: true })
  verificationCode: string | null;

  @CreateDateColumn()
  createdAt: string;

  @UpdateDateColumn()
  updatedAt: string;
}