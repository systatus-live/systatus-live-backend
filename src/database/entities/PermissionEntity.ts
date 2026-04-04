import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { PermissionEnum } from '../../types/PermissionEnum';

@Entity({ name: "permissions" })
export class PermissionEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 100, nullable: false, unique: true })
  name: PermissionEnum;

  @Column({ type: "varchar", length: 255, nullable: true })
  description: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: string;
}
