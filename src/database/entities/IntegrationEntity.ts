import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from './UserEntity';
import { ChatPlatformEntity } from './ChatPlatformEntity';

@Entity({ name: "integrations" })
export class IntegrationEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 30, nullable: false })
  name: string;

  @Column({ type: "varchar", length: 1024, nullable: false })
  url: string;

  @ManyToOne(() => ChatPlatformEntity, { nullable: false })
  @JoinColumn({ name: "chatPlatformId", referencedColumnName: "id" })
  chatPlatform: ChatPlatformEntity;

  @Column()
  chatPlatformId: string;

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