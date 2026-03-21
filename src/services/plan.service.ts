import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChatPlatformEntity } from '../database/entities/ChatPlatformEntity';
import { MonitorEntity } from '../database/entities/MonitorEntity';
import { PlanEntity } from '../database/entities/PlanEntity';
import { PlanEnum } from '../types/PlanEnum';
import { ChatPlatformEnum } from '../types/ChatPlatformEnum';
import { Repository } from 'typeorm';

@Injectable()
export class PlanService {
  @InjectRepository(PlanEntity) private planRepository: Repository<PlanEntity>;
  @InjectRepository(MonitorEntity) private monitorRepository: Repository<MonitorEntity>;
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
      this.planRepository.findOne({ where: { id: planId }, select: ['monitorQty'] }),
      this.monitorRepository.count({ where: { createdUserId: userId } })
    ]);

    if (!plan) return;

    if (count >= plan.monitorQty) {
      throw new ForbiddenException(`Seu plano permite até ${plan.monitorQty} monitores. Considere fazer upgrade.`);
    }
  }

  async assertIntegrationAllowed(planId: string, chatPlatformId: string): Promise<void> {
    const [plan, chatPlatform] = await Promise.all([
      this.planRepository.findOne({
        where: {
          id: planId
        }
      }),
      this.chatPlatformRepository.findOne({
        where: {
          id: chatPlatformId
        },
        select: ["name"]
      })
    ]);

    if (!plan || !chatPlatform) return;

    const permissionMap: Partial<Record<ChatPlatformEnum, keyof PlanEntity>> = {
      [ChatPlatformEnum.SLACK]: "slack",
      [ChatPlatformEnum.DISCORD]: "discord",
      [ChatPlatformEnum.GOOGLE_CHAT]: "googleChat",
      [ChatPlatformEnum.EMAIL]: "email",
      [ChatPlatformEnum.WHATSAPP]: "whatsapp",
    };

    const field = permissionMap[chatPlatform.name];
    if (field && !plan[field]) {
      throw new ForbiddenException(`Seu plano não inclui integração com ${chatPlatform.name}. Considere fazer upgrade.`);
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
      name: plan.name,
      price: plan.price,
      period: plan.name == PlanEnum.ANDORINHA ? "" : "/mês",
      description: plan.description,
      bta: "Assinar",
      btaLink: "/auth/signup",
      mostPopular: plan.name == PlanEnum.CORUJA,
      features: plan.displayFeatures,
      image: plan.image
    }));
  }
}
