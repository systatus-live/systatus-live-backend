import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from './UserEntity';
import { MonitorTypeEnum } from '../../enums/MonitorTypeEnum';
import { HttpMethodEnum } from '../../enums/HttpMethodEnum';

@Entity({ name: "monitors"})
export class MonitorEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 1024, nullable: false })
  name: string;

  @Column({ type: "varchar", length: 100, nullable: false })
  cron: string;

  @Column({ type: "enum", enum: MonitorTypeEnum, nullable: false })
  type: MonitorTypeEnum;

  @Column({ type: "enum", enum: HttpMethodEnum, nullable: true })
  http_method: HttpMethodEnum;

  @Column({ type: "text", nullable: false })
  address: string;

  @Column()
  id_user: string;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: "id_user", referencedColumnName: "id" })
  user: UserEntity;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: string;
}