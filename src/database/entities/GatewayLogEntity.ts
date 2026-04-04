import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ProviderEnum } from '../../types/ProviderEnum';

@Entity({ name: "gateway_logs" })
export class GatewayLogEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "enum", enum: ProviderEnum, nullable: false })
  provider: ProviderEnum;

  @Column({ type: "jsonb", nullable: false, default: {} })
  json: Record<string, any>;

  @Column({ type: "varchar", length: 1024, nullable: false })
  event: string;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: string;
}
