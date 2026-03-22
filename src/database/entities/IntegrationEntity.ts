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
  address: string;

  @ManyToOne(() => ChatPlatformEntity, { nullable: false })
  @JoinColumn({ name: "chat_platform_id", referencedColumnName: "id" })
  chatPlatform: ChatPlatformEntity;

  @Column()
  chat_platform_id: string;

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