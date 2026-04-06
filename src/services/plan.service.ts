import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MonitorEntity } from '../database/entities/MonitorEntity';
import { PlanEntity } from '../database/entities/PlanEntity';
import { PlanIntervalEntity } from '../database/entities/PlanIntervalEntity';
import { PlanChatPlatformEntity } from '../database/entities/PlanChatPlatformEntity';
import { ChatPlatformEntity } from '../database/entities/ChatPlatformEntity';
import { PlanEnum } from '../types/PlanEnum';
import { ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';

@Injectable()
export class PlanService {
  @InjectRepository(PlanEntity) private planRepository: Repository<PlanEntity>;
  @InjectRepository(MonitorEntity) private monitorRepository: Repository<MonitorEntity>;
  @InjectRepository(PlanIntervalEntity) private planIntervalRepository: Repository<PlanIntervalEntity>;
  @InjectRepository(PlanChatPlatformEntity) private planChatPlatformRepository: Repository<PlanChatPlatformEntity>;
  @InjectRepository(ChatPlatformEntity) private chatPlatformRepository: Repository<ChatPlatformEntity>;

  async getPlanById(id: string) {
    const [plan] = await this._getPlanList(id);
    return plan;
  }

  async getPlanList() {
    return this._getPlanList();
  }

  async assertMonitorLimit(planId: string, userId: string): Promise<void> {
    const [plan, count] = await Promise.all([
      this.planRepository.findOne({
        where: {
          id: planId
        },
        select: ["monitor_qty"]
      }),
      this.monitorRepository.count({
        where: {
          created_user_id: userId
        }
      })
    ]);

    if (!plan) return;

    if (count >= plan.monitor_qty) {
      throw new ForbiddenException(`Seu plano permite até ${plan.monitor_qty} monitores. Considere fazer upgrade.`);
    }
  }

  async _getPlanList(id: string | null = null) {
    let filters: any = {
      order: {
        index: "ASC"
      }
    }
    if (id) {
      filters["where"] = {
        id: id
      }
    }

    const planList = await this.planRepository.find(filters);

    return planList.map((plan) => ({
      id: plan.id,
      name: plan.name,
      price: plan.price,
      period: "/mês",
      description: plan.description,
      bta: "Assinar",
      btaLink: "/auth/signup",
      mostPopular: plan.name == PlanEnum.CORUJA,
      features: plan.display_features,
      image: plan.image
    }));
  }

  async assertIntervalAllowed(planId: string, intervalId: string): Promise<void> {
    const planInterval = await this.planIntervalRepository.findOne({
      where: {
        plan_id: planId,
        interval_id: intervalId
      }
    });

    if (!planInterval) {
      throw new ForbiddenException(`Seu plano não permite o uso deste intervalo de monitoramento. Considere fazer upgrade.`);
    }
  }

  async assertChatPlatformAllowed(planId: string, chatPlatformId: string): Promise<void> {
    const planChatPlatform = await this.planChatPlatformRepository.findOne({
      where: { 
        plan_id: planId, 
        chat_platform_id: chatPlatformId 
      }
    });

    if (!planChatPlatform) {
      const chatPlatform = await this.chatPlatformRepository.findOne({
        where: { 
          id: chatPlatformId 
        },
        select: ["description"]
      });
      throw new ForbiddenException(`Seu plano não inclui integração com "${chatPlatform?.description}". Considere fazer upgrade.`);
    }
  }
}
