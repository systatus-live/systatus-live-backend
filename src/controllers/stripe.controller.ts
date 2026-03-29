import { BadRequestException, Body, Controller, Headers, Post, RawBody, Request, UseGuards } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { AuthGuard } from "../middlewares/auth.guard";
import { StripeService } from "../services/stripe.service";
import { StripeEventEnum } from "../types/StripeEventEnum";

@Controller({
  version: "1",
  path: "/stripe"
})
export class StripeController {
  constructor(
    private stripeService: StripeService
  ) { }

  @Post("/checkout")
  @UseGuards(AuthGuard)
  async createCheckout(@Request() request: Request, @Body() body: { planId: string }) {
    return this.stripeService.createCheckoutSession(request["loggedUser"], body.planId);
  }

  @SkipThrottle()
  @Post("/webhook")
  async handleWebhook(@Headers("stripe-signature") signature: string, @RawBody() rawBody: Buffer,) {
    let event: any;

    try {
      event = this.stripeService.constructEvent(rawBody, signature);
    } catch (error) {
      throw new BadRequestException(`Webhook Error: ${error.message}`);
    }

    new Promise(async (resolve) => {
      await this.stripeService.saveGatewayLog(event);

      switch (event.type as StripeEventEnum) {
        case StripeEventEnum.CHECKOUT_SESSION_COMPLETED:
          await this.stripeService.handleCheckoutCompleted(event.data.object);
          break;
        case StripeEventEnum.INVOICE_PAYMENT_SUCCEEDED:
          await this.stripeService.handleInvoicePaymentSucceeded(event.data.object);
          break;
        case StripeEventEnum.INVOICE_PAYMENT_FAILED:
          await this.stripeService.handleInvoicePaymentFailed(event.data.object);
          break;
        case StripeEventEnum.CUSTOMER_SUBSCRIPTION_DELETED:
          await this.stripeService.handleSubscriptionDeleted(event.data.object);
          break;
      }

      resolve(true);
    })

    return {
      received: true
    };
  }
}
