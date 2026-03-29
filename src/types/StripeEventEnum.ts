// https://docs.stripe.com/api/events/types
export enum StripeEventEnum {
  CHECKOUT_SESSION_COMPLETED = "checkout.session.completed",
  INVOICE_PAYMENT_SUCCEEDED = "invoice.payment_succeeded",
  INVOICE_PAYMENT_FAILED = "invoice.payment_failed",
  CUSTOMER_SUBSCRIPTION_DELETED = "customer.subscription.deleted",
}
