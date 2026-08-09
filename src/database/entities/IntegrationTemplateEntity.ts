import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { IntegrationEntity } from './IntegrationEntity';
import { UserEntity } from './UserEntity';

@Entity({ name: "integration_templates" })
export class IntegrationTemplateEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => IntegrationEntity, { onDelete: "CASCADE", nullable: false })
  @JoinColumn({ name: "integration_id", referencedColumnName: "id" })
  integration: IntegrationEntity;

  @Column()
  integration_id: string;

  @Column({ type: "varchar", length: 1, nullable: false })
  type: string;

  @Column({ type: "text", nullable: true })
  down_template: string | null;

  @Column({ type: "text", nullable: true })
  up_template: string | null;

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
