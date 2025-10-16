import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from './UserEntity';
import { ChatPlatformEnum } from '../../enums/ChatPlatformEnum';

@Entity({ name: "chat_platforms" })
export class ChatPlatformEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255, nullable: false, unique: true })
  name: ChatPlatformEnum;

  @Column({ type: "varchar", length: 255, nullable: false })
  description: string;

  @Column({ type: "varchar", length: 1024, nullable: false })
  iconUrl: string;

  @Column({ type: "varchar", length: 1024, nullable: false })
  docUrl: string;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "createdUserId", referencedColumnName: "id" })
  createdUser: UserEntity;

  @Column({ nullable: true })
  createdUserId: string;

  @ManyToOne(() => UserEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "updatedUserId", referencedColumnName: "id" })
  updatedUser: UserEntity;

  @Column({ nullable: true })
  updatedUserId: string;

  @CreateDateColumn()
  createdAt: string;

  @UpdateDateColumn()
  updatedAt: string;
}