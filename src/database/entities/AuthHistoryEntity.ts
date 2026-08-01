import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from './UserEntity';

@Entity({ name: "auth_historical" })
export class AuthHistoryEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id", referencedColumnName: "id" })
  interval: UserEntity;

  @Column()
  user_id: string;

  @Column({ type: "varchar", length: 50, nullable: false })
  ip: string;

  @Column({ type: "varchar", length: 1024, nullable: false })
  user_agent: string;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: string;
}