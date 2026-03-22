import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { MonitorEntity } from './MonitorEntity';
import { IntegrationEntity } from './IntegrationEntity';
import { UserEntity } from './UserEntity';

@Entity({ name: "monitor_integrations" })
export class MonitorIntegrationEntity {
  @ManyToOne(() => MonitorEntity, { onDelete: "CASCADE", nullable: false })
  @JoinColumn({ name: "monitor_id", referencedColumnName: "id" })
  monitor: MonitorEntity;

  @PrimaryColumn()
  monitor_id: string;

  @ManyToOne(() => IntegrationEntity, { onDelete: "CASCADE", nullable: false })
  @JoinColumn({ name: "integration_id", referencedColumnName: "id" })
  integration: IntegrationEntity;

  @PrimaryColumn()
  integration_id: string;

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