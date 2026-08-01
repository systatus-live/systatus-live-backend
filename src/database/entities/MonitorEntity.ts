import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from './UserEntity';
import { IntervalEntity } from './IntervalEntity';

@Entity({ name: "monitors" })
export class MonitorEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 128, nullable: false })
  name: string;

  @Column({ type: "varchar", length: 10, nullable: false })
  type: string;

  @Column({ type: "text", nullable: false })
  address: string;

  @Column({ type: "boolean", nullable: false, default: true })
  active: boolean;

  @ManyToOne(() => IntervalEntity)
  @JoinColumn({ name: "interval_id", referencedColumnName: "id" })
  interval: IntervalEntity;

  @Column()
  interval_id: string;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE", nullable: false })
  @JoinColumn({ name: "created_user_id", referencedColumnName: "id" })
  createdUser: UserEntity;

  @Column()
  created_user_id: string;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE", nullable: false })
  @JoinColumn({ name: "updated_user_id", referencedColumnName: "id" })
  updatedUser: UserEntity;

  @Column()
  updated_user_id: string;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: string;
}