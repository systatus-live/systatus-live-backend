import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from './UserEntity';

@Entity({ name: "auth_historical" })
export class AuthHistoryEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId", referencedColumnName: "id" })
  interval: UserEntity;

  @Column()
  userId: string;

  @Column({ type: "varchar", length: 50, nullable: false })
  ip: string;

  @Column({ type: "varchar", length: 1024, nullable: false })
  userAgent: string;

  @Column({ type: "varchar", length: 4096, nullable: true })
  locationJson: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: string;
}