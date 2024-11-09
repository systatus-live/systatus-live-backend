import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: "users "})
export class UserEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 1024, nullable: false })
  name: string;

  @Column({ type: "varchar", length: 1024, nullable: false, unique: true })
  email: string;

  @Column({ type: "varchar", length: 4096, nullable: false })
  password: string;

  @CreateDateColumn()
  created_at: string;

  @UpdateDateColumn()
  updated_at: string;
}