import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PlanEntity } from '../database/entities/PlanEntity';
import { PlanEnum } from '../types/PlanEnum';
import { Repository } from 'typeorm';

@Injectable()
export class PlanService {
  @InjectRepository(PlanEntity) private planRepository: Repository<PlanEntity>

  async getPlanById(id: string) {
    const [plan] = await this._getPlanList(id);
    return plan;
  }

  async getPlanList() {
    return this._getPlanList();
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

    const publicList = planList.map((plan) => {
      const obj = {
        name: plan.name,
        price: plan.price,
        period: plan.name == PlanEnum.ANDORINHA ? "" : "/mês",
        description: plan.description,
        bta: "Assinar",
        btaLink: "/auth/signup",
        mostPopular: plan.name == PlanEnum.CORUJA,
        features: {
          [`${[PlanEnum.CORUJA, PlanEnum.AGUIA].includes(plan.name as PlanEnum) ? "🆙 " : ""}${plan.monitorQty} monitores`]: true,
          [`${[PlanEnum.CORUJA, PlanEnum.AGUIA].includes(plan.name as PlanEnum) ? "🆙 " : ""}Monitoramento a cada ${[PlanEnum.CORUJA, PlanEnum.AGUIA].includes(plan.name as PlanEnum) ? "60 segundos" : "5 minutos"}`]: true,
          [`${[PlanEnum.AGUIA].includes(plan.name as PlanEnum) ? "🆙 " : ""}Notificações no WhatsApp`]: plan.whatsapp,
          "Notificações no Slack": plan.slack,
          "Notificações no Google Chat": plan.googleChat,
          "Notificações no E-mail": plan.email,
          "Notificações no Discord": plan.discord,
          [`${[PlanEnum.AGUIA].includes(plan.name as PlanEnum) ? "🆙 " : ""}Mensagens personalizáveis`]: plan.customNotification,
          [`${[PlanEnum.CORUJA, PlanEnum.AGUIA].includes(plan.name as PlanEnum) ? "🆙 " : ""}Página de status pública`]: plan.statusPage
        },
        image: plan.image
      }
      return obj;
    })

    return publicList;
  }
}
