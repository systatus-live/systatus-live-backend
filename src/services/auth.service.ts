import { ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from "bcrypt";
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthHistoryEntity } from '../database/entities/AuthHistoryEntity';
import { PlanPermissionEntity } from '../database/entities/PlanPermissionEntity';
import { PermissionEnum } from '../types/PermissionEnum';

@Injectable()
export class AuthService {
  @InjectRepository(AuthHistoryEntity) private authSessionRepository: Repository<AuthHistoryEntity>
  @InjectRepository(PlanPermissionEntity) private planPermissionRepository: Repository<PlanPermissionEntity>

  constructor(
    private jwtService: JwtService
  ) { }

  public generateJWT(data: any, expiresIn: string | number = "7d"): string {
    return this.jwtService.sign(data, {
      secret: process.env.JWT_KEY,
      expiresIn: expiresIn
    } as any);
  }

  public verifyJWT(jwt: string) {
    return this.jwtService.verify(jwt, {
      secret: process.env.JWT_KEY,
    });
  }

  public decodeJWT(jwt: string) {
    return this.jwtService.decode(jwt);
  }

  public bcryptHashSync(text: string): string {
    return bcrypt.hashSync(text, 12);
  }

  public bcryptCompareSync(encrypted: string, data: string): boolean {
    return bcrypt.compareSync(data, encrypted);
  }

  public async authLog(userId: string, request: Request) {
    const ip = request["clientIp"];
    const userAgent = request.headers["x-user-agent"] || request.headers["user-agent"] || "Desconhecido";

    await this.authSessionRepository.save({
      user_id: userId,
      ip: ip,
      user_agent: userAgent
    })
  }

  async hasPermission(planId: string, permission: PermissionEnum): Promise<boolean> {
    const count = await this.planPermissionRepository
      .createQueryBuilder("pp")
      .innerJoin("pp.permission", "p")
      .where("pp.plan_id = :planId", {
        planId: planId
      })
      .andWhere("p.name = :permission", {
        permission: permission
      })
      .getCount();
    return count > 0;
  }

  async assertPermission(planId: string, permission: PermissionEnum, message: string): Promise<void> {
    if (!await this.hasPermission(planId, permission)) {
      throw new ForbiddenException(message);
    }
  }

  async getPermissionList(planId: string): Promise<PermissionEnum[]> {
    const records = await this.planPermissionRepository
      .createQueryBuilder("pp")
      .innerJoinAndSelect("pp.permission", "p")
      .where("pp.plan_id = :planId", { 
        planId: planId 
      })
      .getMany();
    return records.map(r => r.permission.name);
  }
}
