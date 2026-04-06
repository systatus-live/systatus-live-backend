import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { PlanEntity } from './PlanEntity';
import { ChatPlatformEntity } from './ChatPlatformEntity';

@Entity({ name: "plan_chat_platforms" })
export class PlanChatPlatformEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => PlanEntity)
  @JoinColumn({ name: "plan_id" })
  plan: PlanEntity;

  @Column({ type: "uuid", nullable: false })
  plan_id: string;

  @ManyToOne(() => ChatPlatformEntity)
  @JoinColumn({ name: "chat_platform_id" })
  chatPlatform: ChatPlatformEntity;

  @Column({ type: "uuid", nullable: false })
  chat_platform_id: string;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: string;
}
