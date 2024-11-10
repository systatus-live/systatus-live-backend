import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: "users"})
export class UserEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 1024, nullable: false })
  name: string;

  @Column({ type: "varchar", length: 1024, nullable: false, unique: true })
  email: string;

  @Column({ type: "varchar", length: 4096, nullable: true })
  password: string;

  @Column({ type: "boolean", default: false, nullable: false })
  verified: boolean;

  @Column({ type: "varchar", length: 10, nullable: true })
  confirmation_code: string;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: string;
}