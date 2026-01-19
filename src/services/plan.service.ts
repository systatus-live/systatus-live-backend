import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PlanEntity } from 'src/database/entities/PlanEntity';
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
        price: plan.price == 0 ? "Grátis" : `R$ ${plan.price}`,
        period: plan.name == "Andorinha" ? "" : "/mês",
        description: plan.description,
        bta: "Assinar",
        btaLink: "/auth/signup",
        mostPopular: false,
        features: {
          [`${["Coruja", "Águia"].includes(plan.name) ? "🆙 " : ""}${plan.monitorQty} monitores`]: true,
          [`${["Coruja", "Águia"].includes(plan.name) ? "🆙 " : ""}Monitoramento a cada ${["Coruja", "Águia"].includes(plan.name) ? "60 segundos" : "5 minutos"}`]: true,
          [`${["Águia"].includes(plan.name) ? "🆙 " : ""}Notificações no WhatsApp`]: plan.whatsapp,
          "Notificações no Slack": plan.slack,
          "Notificações no Google Chat": plan.googleChat,
          "Notificações no E-mail": plan.email,
          "Notificações no Discord": plan.discord,
          [`${["Águia"].includes(plan.name) ? "🆙 " : ""}Mensagens personalizáveis`]: plan.customNotification,
          [`${["Coruja", "Águia"].includes(plan.name) ? "🆙 " : ""}Página de status pública`]: plan.statusPage
        },
        image: plan.image
      }
      return obj;
    })

    return publicList;
  }
}
