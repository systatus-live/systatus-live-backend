import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { PlanEntity } from './PlanEntity';
import { PermissionEntity } from './PermissionEntity';

@Entity({ name: "plan_permissions" })
export class PlanPermissionEntity {
  @ManyToOne(() => PlanEntity, { onDelete: "CASCADE", nullable: false })
  @JoinColumn({ name: "plan_id", referencedColumnName: "id" })
  plan: PlanEntity;

  @PrimaryColumn()
  plan_id: string;

  @ManyToOne(() => PermissionEntity, { onDelete: "CASCADE", nullable: false })
  @JoinColumn({ name: "permission_id", referencedColumnName: "id" })
  permission: PermissionEntity;

  @PrimaryColumn()
  permission_id: string;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: string;
}
