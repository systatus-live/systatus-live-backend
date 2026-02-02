import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import momentTz from "moment-timezone";
import { InvoiceEntity } from 'src/database/entities/InvoiceEntity';
import { PaymentEntity } from 'src/database/entities/PaymentEntity';
import { PlanEntity } from 'src/database/entities/PlanEntity';
import { SubscriptionEntity } from 'src/database/entities/SubscriptionEntity';
import { InvoiceStatusEnum } from 'src/types/InvoiceStatusEnum';
import { PaymentStatusEnum } from 'src/types/PaymentStatusEnum';
import { PlanEnum } from 'src/types/PlanEnum';
import { SubscriptionStatusEnum } from 'src/types/SubscriptionStatusEnum';
import formatDate from 'src/utils/formatDate';
import getCurrentDate from 'src/utils/getCurrenDate';
import { DataSource, QueryRunner } from 'typeorm';

@Injectable()
export class SubscriptionService {
  constructor(
    private dataSource: DataSource
  ) { }

  @Cron("1 0 * * *", {
    name: "invoices-job",
    timeZone: "America/Sao_Paulo"
  })
  async invoiceJob() {
    const subscriptionList = await this.dataSource.query(`
      select sub.id, (select t.status from invoices t where t."subscriptionId" = sub.id order by t."createdAt" desc limit 1) as "lastInvoiceStatus"
      from subscriptions sub
      where sub."endDate"::date <= now()::date
      and sub.status = '${SubscriptionStatusEnum.ACTIVE}'
    `);

    for await (let subscription of subscriptionList) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        if (subscription.lastInvoiceStatus == null || subscription.lastInvoiceStatus == InvoiceStatusEnum.PAID) {
          await this.createInvoice(queryRunner, subscription.id);
        }
        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
      } finally {
        await queryRunner.release();
      }
    }
  }

  @Cron("30 0 * * *", {
    name: "payments-job",
    timeZone: "America/Sao_Paulo"
  })
  async paymentJob() {
    const invoiceList = await this.dataSource.query(`
      select inv.id, pla.name as "planName", pla.price as "planPrice"
      from subscriptions sub
      join invoices inv on inv."subscriptionId" = sub.id
      join plans pla on pla.id = sub."planId"
      where sub.status = '${SubscriptionStatusEnum.ACTIVE}'
      and inv.status = '${InvoiceStatusEnum.PENDING}'
    `);

    for await (let invoice of invoiceList) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        if (invoice.planName == PlanEnum.ANDORINHA) {
          await this.confirmPayment(queryRunner, invoice.id, invoice.planPrice);
        }
        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
      } finally {
        await queryRunner.release();
      }
    }
  }

  async createSubscription(queryRunner: QueryRunner, userId: string, planId: string) {
    const planRepository = this.dataSource.getRepository(PlanEntity);

    const plan = planRepository.findOne({
      where: {
        id: planId
      }
    })

    if (!plan) {
      throw new Error("Plano não encontrado.");
    }

    const dateFormat = "YYYY-MM-DD HH:mm:ssZ";
    const currentDate = getCurrentDate().hour(0).minute(0).second(0);
    const endDate = momentTz(currentDate).add(1, "month");

    const subscription = queryRunner.manager.save(SubscriptionEntity, {
      userId: userId,
      planId: planId,
      status: SubscriptionStatusEnum.ACTIVE,
      startDate: formatDate(currentDate, dateFormat),
      endDate: formatDate(endDate, dateFormat)
    });

    return subscription;
  }

  async createInvoice(queryRunner: QueryRunner, subscriptionId: string) {
    const subscription = await queryRunner.manager.findOne(SubscriptionEntity, {
      where: {
        id: subscriptionId
      },
      relations: ["plan"]
    });

    if (!subscription) {
      throw new Error("Assinatura não encontrada.");
    }

    const dateFormat = "YYYY-MM-DD HH:mm:ssZ";
    const currentDate = getCurrentDate().hour(0).minute(0).second(0);
    const dueDate = momentTz(currentDate).add(1, "week");

    const invoice = await queryRunner.manager.save(InvoiceEntity, {
      subscriptionId: subscription.id,
      amount: subscription.plan.price,
      issueDate: formatDate(currentDate, dateFormat),
      dueDate: formatDate(dueDate, dateFormat),
      status: InvoiceStatusEnum.PENDING,
      subscriptionStartDate: subscription.startDate,
      subscriptionEndDate: subscription.endDate
    });

    return invoice;
  }

  async confirmPayment(queryRunner: QueryRunner, invoiceId: string, amount: number) {
    const invoice = await queryRunner.manager.findOne(InvoiceEntity, {
      where: {
        id: invoiceId
      },
      relations: ["subscription", "subscription.plan"]
    });

    if (!invoice) {
      throw new Error("Fatura não encontrada.");
    }

    const currentDate = getCurrentDate();
    const dateFormat = "YYYY-MM-DD HH:mm:ssZ";

    // Insert payment
    const payment = queryRunner.manager.create(PaymentEntity, {
      invoiceId: invoice.id,
      amount: amount,
      paidDate: formatDate(currentDate, dateFormat),
      status: PaymentStatusEnum.PAID
    });
    await queryRunner.manager.save(payment);

    // Update invoice status
    await queryRunner.manager.save(InvoiceEntity, {
      id: invoice.id,
      status: InvoiceStatusEnum.PAID
    });

    // Update subscription dates
    await queryRunner.manager.save(SubscriptionEntity, {
      id: invoice.subscription.id,
      startDate: momentTz(currentDate).hour(0).minute(0).second(0).format(dateFormat),
      endDate: momentTz(currentDate).add(1, "month").hour(0).minute(0).second(0).format(dateFormat)
    });

    return payment;
  }
}
