import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameColumnsToSnakeCase1774100000000 implements MigrationInterface {
  name = 'RenameColumnsToSnakeCase1774100000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // users
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "acceptedTerms" TO accepted_terms`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "verificationCode" TO verification_code`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "createdAt" TO created_at`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "updatedAt" TO updated_at`);

    // monitors
    await queryRunner.query(`ALTER TABLE "monitors" RENAME COLUMN "intervalId" TO interval_id`);
    await queryRunner.query(`ALTER TABLE "monitors" RENAME COLUMN "createdUserId" TO created_user_id`);
    await queryRunner.query(`ALTER TABLE "monitors" RENAME COLUMN "updatedUserId" TO updated_user_id`);
    await queryRunner.query(`ALTER TABLE "monitors" RENAME COLUMN "createdAt" TO created_at`);
    await queryRunner.query(`ALTER TABLE "monitors" RENAME COLUMN "updatedAt" TO updated_at`);

    // incidents
    await queryRunner.query(`ALTER TABLE "incidents" RENAME COLUMN "monitorId" TO monitor_id`);
    await queryRunner.query(`ALTER TABLE "incidents" RENAME COLUMN "endedAt" TO ended_at`);
    await queryRunner.query(`ALTER TABLE "incidents" RENAME COLUMN "createdAt" TO created_at`);
    await queryRunner.query(`ALTER TABLE "incidents" RENAME COLUMN "updatedAt" TO updated_at`);

    // integrations
    await queryRunner.query(`ALTER TABLE "integrations" RENAME COLUMN "chatPlatformId" TO chat_platform_id`);
    await queryRunner.query(`ALTER TABLE "integrations" RENAME COLUMN "createdUserId" TO created_user_id`);
    await queryRunner.query(`ALTER TABLE "integrations" RENAME COLUMN "updatedUserId" TO updated_user_id`);
    await queryRunner.query(`ALTER TABLE "integrations" RENAME COLUMN "createdAt" TO created_at`);
    await queryRunner.query(`ALTER TABLE "integrations" RENAME COLUMN "updatedAt" TO updated_at`);

    // monitor_integrations
    await queryRunner.query(`ALTER TABLE "monitor_integrations" RENAME COLUMN "monitorId" TO monitor_id`);
    await queryRunner.query(`ALTER TABLE "monitor_integrations" RENAME COLUMN "integrationId" TO integration_id`);
    await queryRunner.query(`ALTER TABLE "monitor_integrations" RENAME COLUMN "createdUserId" TO created_user_id`);
    await queryRunner.query(`ALTER TABLE "monitor_integrations" RENAME COLUMN "updatedUserId" TO updated_user_id`);
    await queryRunner.query(`ALTER TABLE "monitor_integrations" RENAME COLUMN "createdAt" TO created_at`);
    await queryRunner.query(`ALTER TABLE "monitor_integrations" RENAME COLUMN "updatedAt" TO updated_at`);

    // chat_platforms
    await queryRunner.query(`ALTER TABLE "chat_platforms" RENAME COLUMN "iconUrl" TO icon_url`);
    await queryRunner.query(`ALTER TABLE "chat_platforms" RENAME COLUMN "docUrl" TO doc_url`);
    await queryRunner.query(`ALTER TABLE "chat_platforms" RENAME COLUMN "createdAt" TO created_at`);
    await queryRunner.query(`ALTER TABLE "chat_platforms" RENAME COLUMN "updatedAt" TO updated_at`);

    // auth_flows
    await queryRunner.query(`ALTER TABLE "auth_flows" RENAME COLUMN "createdAt" TO created_at`);
    await queryRunner.query(`ALTER TABLE "auth_flows" RENAME COLUMN "updatedAt" TO updated_at`);

    // auth_historical
    await queryRunner.query(`ALTER TABLE "auth_historical" RENAME COLUMN "userId" TO user_id`);
    await queryRunner.query(`ALTER TABLE "auth_historical" RENAME COLUMN "userAgent" TO user_agent`);
    await queryRunner.query(`ALTER TABLE "auth_historical" RENAME COLUMN "locationJson" TO location_json`);
    await queryRunner.query(`ALTER TABLE "auth_historical" RENAME COLUMN "createdAt" TO created_at`);
    await queryRunner.query(`ALTER TABLE "auth_historical" RENAME COLUMN "updatedAt" TO updated_at`);

    // intervals
    await queryRunner.query(`ALTER TABLE "intervals" RENAME COLUMN "createdAt" TO created_at`);
    await queryRunner.query(`ALTER TABLE "intervals" RENAME COLUMN "updatedAt" TO updated_at`);

    // monitor_historical
    await queryRunner.query(`ALTER TABLE "monitor_historical" RENAME COLUMN "monitorId" TO monitor_id`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" RENAME COLUMN "incidentId" TO incident_id`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" RENAME COLUMN "createdAt" TO created_at`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" RENAME COLUMN "updatedAt" TO updated_at`);

    // subscriptions
    await queryRunner.query(`ALTER TABLE "subscriptions" RENAME COLUMN "userId" TO user_id`);
    await queryRunner.query(`ALTER TABLE "subscriptions" RENAME COLUMN "planId" TO plan_id`);
    await queryRunner.query(`ALTER TABLE "subscriptions" RENAME COLUMN "startDate" TO start_date`);
    await queryRunner.query(`ALTER TABLE "subscriptions" RENAME COLUMN "endDate" TO end_date`);
    await queryRunner.query(`ALTER TABLE "subscriptions" RENAME COLUMN "createdAt" TO created_at`);
    await queryRunner.query(`ALTER TABLE "subscriptions" RENAME COLUMN "updatedAt" TO updated_at`);

    // payments
    await queryRunner.query(`ALTER TABLE "payments" RENAME COLUMN "invoiceId" TO invoice_id`);
    await queryRunner.query(`ALTER TABLE "payments" RENAME COLUMN "paidDate" TO paid_date`);
    await queryRunner.query(`ALTER TABLE "payments" RENAME COLUMN "createdAt" TO created_at`);
    await queryRunner.query(`ALTER TABLE "payments" RENAME COLUMN "updatedAt" TO updated_at`);

    // invoices
    await queryRunner.query(`ALTER TABLE "invoices" RENAME COLUMN "subscriptionId" TO subscription_id`);
    await queryRunner.query(`ALTER TABLE "invoices" RENAME COLUMN "dueDate" TO due_date`);
    await queryRunner.query(`ALTER TABLE "invoices" RENAME COLUMN "issueDate" TO issue_date`);
    await queryRunner.query(`ALTER TABLE "invoices" RENAME COLUMN "subscriptionStartDate" TO subscription_start_date`);
    await queryRunner.query(`ALTER TABLE "invoices" RENAME COLUMN "subscriptionEndDate" TO subscription_end_date`);
    await queryRunner.query(`ALTER TABLE "invoices" RENAME COLUMN "createdAt" TO created_at`);
    await queryRunner.query(`ALTER TABLE "invoices" RENAME COLUMN "updatedAt" TO updated_at`);

    // plans
    await queryRunner.query(`ALTER TABLE "plans" RENAME COLUMN "monitorQty" TO monitor_qty`);
    await queryRunner.query(`ALTER TABLE "plans" RENAME COLUMN "googleChat" TO google_chat`);
    await queryRunner.query(`ALTER TABLE "plans" RENAME COLUMN "customNotification" TO custom_notification`);
    await queryRunner.query(`ALTER TABLE "plans" RENAME COLUMN "statusPage" TO status_page`);
    await queryRunner.query(`ALTER TABLE "plans" RENAME COLUMN "displayFeatures" TO display_features`);
    await queryRunner.query(`ALTER TABLE "plans" RENAME COLUMN "createdAt" TO created_at`);
    await queryRunner.query(`ALTER TABLE "plans" RENAME COLUMN "updatedAt" TO updated_at`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // plans
    await queryRunner.query(`ALTER TABLE "plans" RENAME COLUMN updated_at TO "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "plans" RENAME COLUMN created_at TO "createdAt"`);
    await queryRunner.query(`ALTER TABLE "plans" RENAME COLUMN display_features TO "displayFeatures"`);
    await queryRunner.query(`ALTER TABLE "plans" RENAME COLUMN status_page TO "statusPage"`);
    await queryRunner.query(`ALTER TABLE "plans" RENAME COLUMN custom_notification TO "customNotification"`);
    await queryRunner.query(`ALTER TABLE "plans" RENAME COLUMN google_chat TO "googleChat"`);
    await queryRunner.query(`ALTER TABLE "plans" RENAME COLUMN monitor_qty TO "monitorQty"`);

    // invoices
    await queryRunner.query(`ALTER TABLE "invoices" RENAME COLUMN updated_at TO "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "invoices" RENAME COLUMN created_at TO "createdAt"`);
    await queryRunner.query(`ALTER TABLE "invoices" RENAME COLUMN subscription_end_date TO "subscriptionEndDate"`);
    await queryRunner.query(`ALTER TABLE "invoices" RENAME COLUMN subscription_start_date TO "subscriptionStartDate"`);
    await queryRunner.query(`ALTER TABLE "invoices" RENAME COLUMN issue_date TO "issueDate"`);
    await queryRunner.query(`ALTER TABLE "invoices" RENAME COLUMN due_date TO "dueDate"`);
    await queryRunner.query(`ALTER TABLE "invoices" RENAME COLUMN subscription_id TO "subscriptionId"`);

    // payments
    await queryRunner.query(`ALTER TABLE "payments" RENAME COLUMN updated_at TO "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "payments" RENAME COLUMN created_at TO "createdAt"`);
    await queryRunner.query(`ALTER TABLE "payments" RENAME COLUMN paid_date TO "paidDate"`);
    await queryRunner.query(`ALTER TABLE "payments" RENAME COLUMN invoice_id TO "invoiceId"`);

    // subscriptions
    await queryRunner.query(`ALTER TABLE "subscriptions" RENAME COLUMN updated_at TO "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" RENAME COLUMN created_at TO "createdAt"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" RENAME COLUMN end_date TO "endDate"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" RENAME COLUMN start_date TO "startDate"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" RENAME COLUMN plan_id TO "planId"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" RENAME COLUMN user_id TO "userId"`);

    // monitor_historical
    await queryRunner.query(`ALTER TABLE "monitor_historical" RENAME COLUMN updated_at TO "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" RENAME COLUMN created_at TO "createdAt"`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" RENAME COLUMN incident_id TO "incidentId"`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" RENAME COLUMN monitor_id TO "monitorId"`);

    // intervals
    await queryRunner.query(`ALTER TABLE "intervals" RENAME COLUMN updated_at TO "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "intervals" RENAME COLUMN created_at TO "createdAt"`);

    // auth_historical
    await queryRunner.query(`ALTER TABLE "auth_historical" RENAME COLUMN updated_at TO "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "auth_historical" RENAME COLUMN created_at TO "createdAt"`);
    await queryRunner.query(`ALTER TABLE "auth_historical" RENAME COLUMN location_json TO "locationJson"`);
    await queryRunner.query(`ALTER TABLE "auth_historical" RENAME COLUMN user_agent TO "userAgent"`);
    await queryRunner.query(`ALTER TABLE "auth_historical" RENAME COLUMN user_id TO "userId"`);

    // auth_flows
    await queryRunner.query(`ALTER TABLE "auth_flows" RENAME COLUMN updated_at TO "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "auth_flows" RENAME COLUMN created_at TO "createdAt"`);

    // chat_platforms
    await queryRunner.query(`ALTER TABLE "chat_platforms" RENAME COLUMN updated_at TO "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "chat_platforms" RENAME COLUMN created_at TO "createdAt"`);
    await queryRunner.query(`ALTER TABLE "chat_platforms" RENAME COLUMN doc_url TO "docUrl"`);
    await queryRunner.query(`ALTER TABLE "chat_platforms" RENAME COLUMN icon_url TO "iconUrl"`);

    // monitor_integrations
    await queryRunner.query(`ALTER TABLE "monitor_integrations" RENAME COLUMN updated_at TO "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "monitor_integrations" RENAME COLUMN created_at TO "createdAt"`);
    await queryRunner.query(`ALTER TABLE "monitor_integrations" RENAME COLUMN updated_user_id TO "updatedUserId"`);
    await queryRunner.query(`ALTER TABLE "monitor_integrations" RENAME COLUMN created_user_id TO "createdUserId"`);
    await queryRunner.query(`ALTER TABLE "monitor_integrations" RENAME COLUMN integration_id TO "integrationId"`);
    await queryRunner.query(`ALTER TABLE "monitor_integrations" RENAME COLUMN monitor_id TO "monitorId"`);

    // integrations
    await queryRunner.query(`ALTER TABLE "integrations" RENAME COLUMN updated_at TO "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "integrations" RENAME COLUMN created_at TO "createdAt"`);
    await queryRunner.query(`ALTER TABLE "integrations" RENAME COLUMN updated_user_id TO "updatedUserId"`);
    await queryRunner.query(`ALTER TABLE "integrations" RENAME COLUMN created_user_id TO "createdUserId"`);
    await queryRunner.query(`ALTER TABLE "integrations" RENAME COLUMN chat_platform_id TO "chatPlatformId"`);

    // incidents
    await queryRunner.query(`ALTER TABLE "incidents" RENAME COLUMN updated_at TO "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "incidents" RENAME COLUMN created_at TO "createdAt"`);
    await queryRunner.query(`ALTER TABLE "incidents" RENAME COLUMN ended_at TO "endedAt"`);
    await queryRunner.query(`ALTER TABLE "incidents" RENAME COLUMN monitor_id TO "monitorId"`);

    // monitors
    await queryRunner.query(`ALTER TABLE "monitors" RENAME COLUMN updated_at TO "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "monitors" RENAME COLUMN created_at TO "createdAt"`);
    await queryRunner.query(`ALTER TABLE "monitors" RENAME COLUMN updated_user_id TO "updatedUserId"`);
    await queryRunner.query(`ALTER TABLE "monitors" RENAME COLUMN created_user_id TO "createdUserId"`);
    await queryRunner.query(`ALTER TABLE "monitors" RENAME COLUMN interval_id TO "intervalId"`);

    // users
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN updated_at TO "updatedAt"`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN created_at TO "createdAt"`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN verification_code TO "verificationCode"`);
    await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN accepted_terms TO "acceptedTerms"`);
  }
}
