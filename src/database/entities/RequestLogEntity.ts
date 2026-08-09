import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from './UserEntity';

@Entity({ name: "request_logs" })
export class RequestLogEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "user_id", referencedColumnName: "id" })
  user: UserEntity;

  @Column({ nullable: true })
  user_id: string | null;

  @Column({ type: "varchar", length: 6, nullable: false })
  method: string;

  @Column({ type: "varchar", length: 4096, nullable: false })
  endpoint: string;

  @Column({ type: "text", nullable: true })
  payload: string | null;

  @Column({ type: "varchar", nullable: false, length: 3 })
  status: string;

  @Column({ type: "int", nullable: false })
  duration_client: number;

  @Column({ type: "int", nullable: true })
  duration_api: number | null;

  @Column({ type: "varchar", length: 512, nullable: true })
  aplication: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  platform: string | null;

  @Column({ type: "varchar", length: 9, nullable: true })
  version: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  ip: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: string;
}
