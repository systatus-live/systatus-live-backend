import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { MonitorEntity } from './MonitorEntity';
import { IntegrationEntity } from './IntegrationEntity';
import { UserEntity } from './UserEntity';

@Entity({ name: "monitor_integrations" })
export class MonitorIntegrationEntity {
  @ManyToOne(() => MonitorEntity, { onDelete: "CASCADE", nullable: false })
  @JoinColumn({ name: "monitorId", referencedColumnName: "id" })
  monitor: MonitorEntity;

  @PrimaryColumn()
  monitorId: string;

  @ManyToOne(() => IntegrationEntity, { onDelete: "CASCADE", nullable: false })
  @JoinColumn({ name: "integrationId", referencedColumnName: "id" })
  integration: IntegrationEntity;

  @PrimaryColumn()
  integrationId: string;

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