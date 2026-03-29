import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { PersonTypeEnum } from '../../types/PersonTypeEnum';

@Entity({ name: "users" })
export class UserEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 50, nullable: false })
  name: string;

  @Column({ type: "varchar", unique: true, length: 255, nullable: false })
  email: string;

  @Column({ type: "text", nullable: true })
  password: string | null;

  @Column({ type: "boolean", nullable: false, default: false })
  accepted_terms: boolean;

  @Column({ type: "varchar", length: 50, nullable: true })
  discovery: string | null;

  @Column({ type: "boolean", nullable: false, default: false })
  verified: boolean;

  @Column({ type: "varchar", length: 6, nullable: true })
  verification_code: string | null;

  @Column({ type: "text", nullable: true })
  avatar: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  stripe_customer_id: string | null;

  @Column({ type: "enum", enum: PersonTypeEnum, nullable: true })
  person_type: PersonTypeEnum | null;

  @Column({ type: "varchar", length: 18, nullable: true })
  document: string | null;

  @Column({ type: "varchar", length: 9, nullable: true })
  zip_code: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  billing_name: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  billing_email: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  address: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  number: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  complement: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  neighborhood: string | null;

  @Column({ type: "varchar", length: 2, nullable: true })
  state: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  city: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: string;
}