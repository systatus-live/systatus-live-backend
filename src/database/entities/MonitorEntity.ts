import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from './UserEntity';

@Entity({ name: "monitors" })
export class MonitorEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 30, nullable: false })
  name: string;

  @Column({ type: "varchar", length: 10, nullable: false })
  type: string;

  @Column({ type: "text", nullable: false })
  address: string;

  @Column({ type: "boolean", nullable: false, default: true })
  active: boolean;

  @Column({ type: "varchar", length: 20, nullable: false })    
  cron: string

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE", nullable: false })
  @JoinColumn({ name: "createdUserId", referencedColumnName: "id" })
  createdUser: UserEntity;

  @Column()
  createdUserId: string;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE", nullable: false })
  @JoinColumn({ name: "updatedUserId", referencedColumnName: "id" })
  updatedUser: UserEntity;

  @Column()
  updatedUserId: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: string;
}