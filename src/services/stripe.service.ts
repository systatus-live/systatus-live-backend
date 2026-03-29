import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, QueryRunner, Repository } from "typeorm";
import Stripe from "stripe";
import { GatewayLogEntity } from "../database/entities/GatewayLogEntity";
import { InvoiceEntity } from "../database/entities/InvoiceEntity";
import { PaymentEntity } from "../database/entities/PaymentEntity";
import { PlanEntity } from "../database/entities/PlanEntity";
import { SubscriptionEntity } from "../database/entities/SubscriptionEntity";
import { UserEntity } from "../database/entities/UserEntity";
import { ProviderEnum } from "../types/ProviderEnum";
import { InvoiceStatusEnum } from "../types/InvoiceStatusEnum";
import { PaymentStatusEnum } from "../types/PaymentStatusEnum";
import { SubscriptionStatusEnum } from "../types/SubscriptionStatusEnum";
import formatDate from "../utils/formatDate";
import getCurrentDate from "../utils/getCurrenDate";
import momentTz from "moment-timezone";

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(
    private dataSource: DataSource,
    @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>,
    @InjectRepository(PlanEntity) private planRepository: Repository<PlanEntity>,
    @InjectRepository(SubscriptionEntity) private subscriptionRepository: Repository<SubscriptionEntity>,
    @InjectRepository(GatewayLogEntity) private gatewayLogRepository: Repository<GatewayLogEntity>,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-02-25.clover",
    });
  }

  async provisionSubscription(queryRunner: QueryRunner, userId: string, email: string, name: string, planId: string): Promise<void> {
    const plan = await this.planRepository.findOne({
      where: {
        id: planId
      }
    });

    if (!plan?.stripe_price_id) {
      throw new Error("Plano não configurado no Stripe. Contate o suporte.");
    }

    const customer = await this.stripe.customers.create({
      email: email,
      name: name
    });

    const stripeSubscription = await this.stripe.subscriptions.create({
      customer: customer.id,
      items: [
        {
          price: plan.stripe_price_id
        }
      ],
      metadata: {
        userId, planId
      },
    });

    await queryRunner.manager.save(UserEntity, {
      id: userId,
      stripe_customer_id: customer.id
    });

    const dateFormat = "YYYY-MM-DD HH:mm:ssZ";

    await queryRunner.manager.save(SubscriptionEntity, {
      user_id: userId,
      plan_id: planId,
      gateway_id: stripeSubscription.id,
      status: SubscriptionStatusEnum.ACTIVE,
      start_date: formatDate(momentTz.unix(stripeSubscription.items.data[0].current_period_start).tz("America/Sao_Paulo"), dateFormat),
      end_date: formatDate(momentTz.unix(stripeSubscription.items.data[0].current_period_end).tz("America/Sao_Paulo"), dateFormat),
    });
  }

  async createCheckoutSession(userId: string, planId: string): Promise<{ url: string }> {
    const [user, plan] = await Promise.all([
      this.userRepository.findOne({
        where: {
          id: userId
        }
      }),
      this.planRepository.findOne({
        where: {
          id: planId
        }
      }),
    ]);

    if (!plan) {
      throw new BadRequestException("Plano não encontrado.");
    }

    if (!plan.stripe_price_id) {
      throw new BadRequestException("Plano não possui preço configurado no Stripe.");
    }

    let stripeCustomerId = user!.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await this.stripe.customers.create({
        email: user!.email,
        name: user!.name,
      });

      stripeCustomerId = customer.id;

      await this.userRepository.save({
        id: userId,
        stripe_customer_id: stripeCustomerId
      });
    }

    const successUrl = `${process.env.WEB_URL}/panel/account/subscription?status=success`;
    const cancelUrl = `${process.env.WEB_URL}/panel/account/subscription?status=cancel`;

    const session = await this.stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [
        {
          price: plan.stripe_price_id,
          quantity: 1
        }
      ],
      metadata: {
        userId: userId,
        planId: planId
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      phone_number_collection: {
        enabled: true
      },
      billing_address_collection: "required"
    });

    return {
      url: session.url!
    };
  }

  async saveGatewayLog(event: any): Promise<void> {
    await this.gatewayLogRepository.save({
      provider: ProviderEnum.STRIPE,
      json: event,
    });
  }

  constructEvent(payload: Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  }

  async handleCheckoutCompleted(session: any): Promise<void> {
    const { userId, planId } = session.metadata;
    const stripeSubscriptionId: string = session.subscription;
    const stripeCustomerId: string = session.customer;

    await this.userRepository.save({
      id: userId,
      stripe_customer_id: stripeCustomerId
    });

    const customerDetails = session.customer_details;
    if (customerDetails) {
      await this.stripe.customers.update(stripeCustomerId, {
        name: customerDetails.name ?? undefined,
        phone: customerDetails.phone ?? undefined,
        address: customerDetails.address ?? undefined,
      });
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const currentSub = await queryRunner.manager.findOne(SubscriptionEntity, {
        where: {
          user_id: userId,
          status: SubscriptionStatusEnum.ACTIVE
        },
      });

      if (currentSub) {
        if (currentSub.gateway_id) {
          await this.stripe.subscriptions.cancel(currentSub.gateway_id).catch(() => { });
        }

        await queryRunner.manager.save(SubscriptionEntity, {
          id: currentSub.id,
          status: SubscriptionStatusEnum.CANCELED,
        });
      }

      const stripeSub = await this.stripe.subscriptions.retrieve(stripeSubscriptionId);
      const dateFormat = "YYYY-MM-DD HH:mm:ssZ";
      const item = stripeSub.items.data[0];

      const savedSub = await queryRunner.manager.save(SubscriptionEntity, {
        user_id: userId,
        plan_id: planId,
        gateway_id: stripeSubscriptionId,
        status: SubscriptionStatusEnum.ACTIVE,
        start_date: formatDate(momentTz.unix(item.current_period_start).tz("America/Sao_Paulo"), dateFormat),
        end_date: formatDate(momentTz.unix(item.current_period_end).tz("America/Sao_Paulo"), dateFormat),
      });

      await queryRunner.commitTransaction();

      if (session.invoice) {
        const stripeInvoice = await this.stripe.invoices.retrieve(session.invoice as string);
        await this.saveInvoicePayment(stripeInvoice, savedSub);
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async handleInvoicePaymentSucceeded(invoice: any): Promise<void> {
    if (invoice.billing_reason === "subscription_create") return;

    const stripeSubscriptionId = invoice.parent?.subscription_details?.subscription;
    if (!stripeSubscriptionId) return;

    const subscription = await this.subscriptionRepository.findOne({
      where: {
        gateway_id: stripeSubscriptionId
      },
    });

    if (!subscription) return;

    await this.saveInvoicePayment(invoice, subscription);
  }

  private async saveInvoicePayment(invoice: any, subscription: SubscriptionEntity): Promise<void> {
    const dateFormat = "YYYY-MM-DD HH:mm:ssZ";
    const lineItem = invoice.lines?.data?.[0];
    const periodStart = momentTz.unix(lineItem?.period?.start ?? invoice.period_start).tz("America/Sao_Paulo");
    const periodEnd = momentTz.unix(lineItem?.period?.end ?? invoice.period_end).tz("America/Sao_Paulo");
    const issueDate = momentTz.unix(invoice.created).tz("America/Sao_Paulo");
    const amountPaid = invoice.amount_paid / 100;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.save(SubscriptionEntity, {
        id: subscription.id,
        start_date: formatDate(periodStart, dateFormat),
        end_date: formatDate(periodEnd, dateFormat),
      });

      const newInvoice = await queryRunner.manager.save(InvoiceEntity, {
        subscription_id: subscription.id,
        gateway_id: invoice.id,
        amount: amountPaid,
        issue_date: formatDate(issueDate, dateFormat),
        due_date: formatDate(periodEnd, dateFormat),
        status: InvoiceStatusEnum.PAID,
        subscription_start_date: subscription.start_date,
        subscription_end_date: subscription.end_date,
      });

      await queryRunner.manager.save(PaymentEntity, {
        invoice_id: newInvoice.id,
        amount: amountPaid,
        paid_date: formatDate(getCurrentDate(), dateFormat),
        status: PaymentStatusEnum.PAID,
      });

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
    } finally {
      await queryRunner.release();
    }
  }

  async handleInvoicePaymentFailed(invoice: any): Promise<void> {
    const stripeSubscriptionId = invoice.parent?.subscription_details?.subscription;
    if (!stripeSubscriptionId) return;

    const subscription = await this.subscriptionRepository.findOne({
      where: {
        gateway_id: stripeSubscriptionId
      },
    });

    if (!subscription) return;

    await this.subscriptionRepository.save({
      id: subscription.id,
      status: SubscriptionStatusEnum.OVERDUE,
    });
  }

  async getAccountAddress(): Promise<{ line1: string; line2: string; city: string; state: string; postalCode: string; country: string; phone: string; email: string; }> {
    const account = await this.stripe.accounts.retrieve();
    const addr = account.business_profile?.support_address;
    return {
      line1: addr?.line1 ?? "",
      line2: addr?.line2 ?? "",
      city: addr?.city ?? "",
      state: addr?.state ?? "",
      postalCode: addr?.postal_code ?? "",
      country: addr?.country ?? "",
      phone: account.business_profile?.support_phone ?? "",
      email: account.business_profile?.support_email ?? "",
    };
  }

  async getCustomerAddress(customerId: string): Promise<{ line1: string; line2: string; city: string; state: string; postalCode: string; country: string; phone: string; }> {
    const customer = await this.stripe.customers.retrieve(customerId) as Stripe.Customer;
    const addr = customer.address;
    return {
      line1: addr?.line1 ?? "",
      line2: addr?.line2 ?? "",
      city: addr?.city ?? "",
      state: addr?.state ?? "",
      postalCode: addr?.postal_code ?? "",
      country: addr?.country ?? "",
      phone: customer.phone ?? "",
    };
  }

  async handleSubscriptionDeleted(stripeSubscription: any): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: {
        gateway_id: stripeSubscription.id
      },
    });

    if (!subscription) return;

    await this.subscriptionRepository.save({
      id: subscription.id,
      status: SubscriptionStatusEnum.CANCELED,
    });
  }

  async updateCustomerBillingData(customerId: string, data: {
    name: string;
    email: string;
    personType: string;
    document: string;
    zipCode: string;
    address: string;
    number: string;
    complement: string;
    city: string;
    state: string;
  }): Promise<void> {
    const line1 = [data.address, data.number, data.complement].filter(Boolean).join(", ");

    await this.stripe.customers.update(customerId, {
      name: data.name,
      email: data.email,
      address: {
        line1,
        city: data.city,
        state: data.state,
        postal_code: data.zipCode?.replace(/\D/g, ""),
        country: "BR",
      },
    });

    const doc = data.document?.replace(/\D/g, "");

    if (doc) {
      const existingTaxIds = await this.stripe.customers.listTaxIds(customerId);

      for (const taxId of existingTaxIds.data) {
        await this.stripe.customers.deleteTaxId(customerId, taxId.id);
      }

      await this.stripe.customers.createTaxId(customerId, {
        type: data.personType === "PF" ? "br_cpf" : "br_cnpj",
        value: doc
      });
    }
  }

  async getCardByInvoiceGatewayId(stripeInvoiceId: string): Promise<{ brand: string; last4: string } | null> {
    const fullInvoice = await this.stripe.invoices.retrieve(stripeInvoiceId, {
      expand: ["payments.data.payment.payment_intent"]
    });

    const paymentIntentRaw = (fullInvoice.payments?.data?.[0]?.payment as any)?.payment_intent;

    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentRaw.id, {
      expand: ["payment_method"]
    });

    const { card } = paymentIntent.payment_method as any;

    return {
      brand: card.brand as string,
      last4: card.last4 as string,
    };
  }
}
