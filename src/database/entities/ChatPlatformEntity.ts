import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ChatPlatformEnum, ChatPlatformTypeEnum } from '../../types/ChatPlatformEnum';

@Entity({ name: "chat_platforms" })
export class ChatPlatformEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 255, nullable: false, unique: true })
  name: ChatPlatformEnum;

  @Column({ type: "varchar", length: 255, nullable: false })
  description: string;

  @Column({ type: "varchar", length: 1024, nullable: false })
  icon_url: string;

  @Column({ type: "varchar", length: 1024, nullable: false })
  doc_url: string;

  @Column({ type: "varchar", length: 255, nullable: false })
  type: ChatPlatformTypeEnum;

  @Column({ type: "int", nullable: false, default: 0 })
  index: ChatPlatformTypeEnum;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: string;
}