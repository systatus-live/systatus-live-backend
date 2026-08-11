
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from '../controllers/auth.controller';
import { IntegrationController } from '../controllers/integration.controller';
import { MonitorController } from '../controllers/monitor.controller';
import { IntegrationEntity } from '../database/entities/IntegrationEntity';
import { MonitorEntity } from '../database/entities/MonitorEntity';
import { MonitorHistoryEntity } from '../database/entities/MonitorHistoryEntity';
import { UserEntity } from '../database/entities/UserEntity';
import { AuthService } from '../services/auth.service';
import { MailService } from '../services/mail.service';
import { IntegrationService } from '../services/integration.service';
import { ChatPlatformController } from '../controllers/chat-platform.controller';
import { ChatPlatformEntity } from '../database/entities/ChatPlatformEntity';
import { MonitorIntegrationEntity } from '../database/entities/MonitorIntegrationEntity';
import { IncidentEntity } from '../database/entities/IncidentEntity';
import { IncidentController } from '../controllers/incident.controller.ts';
import { UserController } from '../controllers/user.controller';
import { IntervalEntity } from '../database/entities/IntervalEntity';
import { PlanIntervalEntity } from '../database/entities/PlanIntervalEntity';
import { IntervalController } from '../controllers/interval.controller';
import { AuthFlowEntity } from '../database/entities/AuthFlowEntity';
import { AuthHistoryEntity } from '../database/entities/AuthHistoryEntity';
import { PlanEntity } from '../database/entities/PlanEntity';
import { PlanController } from '../controllers/plan.controller';
import { StatusPageEntity } from '../database/entities/StatusPageEntity';
import { StatusPageMonitorEntity } from '../database/entities/StatusPageMonitorEntity';
import { PlanPermissionEntity } from '../database/entities/PlanPermissionEntity';
import { PermissionEntity } from '../database/entities/PermissionEntity';
import { PlanChatPlatformEntity } from '../database/entities/PlanChatPlatformEntity';
import { StatusPageController } from '../controllers/status-page.controller';
import { PlanService } from '../services/plan.service';
import { SubscriptionEntity } from '../database/entities/SubscriptionEntity';
import { MonitorService } from 'src/services/monitor.service';
import { InvoiceEntity } from 'src/database/entities/InvoiceEntity';
import { PaymentEntity } from 'src/database/entities/PaymentEntity';
import { InvoiceController } from 'src/controllers/invoice.controller';
import { PdfService } from 'src/services/pdf.service';
import { StripeController } from 'src/controllers/stripe.controller';
import { StripeService } from 'src/services/stripe.service';
import { GatewayLogEntity } from 'src/database/entities/GatewayLogEntity';
import { RequestLogEntity } from 'src/database/entities/RequestLogEntity';
import { IntegrationTemplateEntity } from 'src/database/entities/IntegrationTemplateEntity';
import { CheckoutGuard } from 'src/middlewares/checkout.guard';
import { UtilsController } from '../controllers/utils.controller';
import { SupportController } from '../controllers/support.controller';

const providerList = [
  AuthService,
  MailService,
  MonitorService,
  IntegrationService,
  PlanService,
  PdfService,
  StripeService,
  CheckoutGuard
]

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_KEY,
      signOptions: {
        expiresIn: "3d"
      }
    }),
    TypeOrmModule.forFeature([
      IntegrationEntity,
      MonitorEntity,
      MonitorHistoryEntity,
      MonitorIntegrationEntity,
      IncidentEntity,
      UserEntity,
      ChatPlatformEntity,
      IntervalEntity,
      PlanIntervalEntity,
      AuthFlowEntity,
      AuthHistoryEntity,
      PlanEntity,
      SubscriptionEntity,
      InvoiceEntity,
      PaymentEntity,
      GatewayLogEntity,
      RequestLogEntity,
      IntegrationTemplateEntity,
      StatusPageEntity,
      StatusPageMonitorEntity,
      PlanPermissionEntity,
      PermissionEntity,
      PlanChatPlatformEntity
    ]),
  ],
  providers: [
    ...providerList,
  ],
  controllers: [
    AuthController,
    IntegrationController,
    MonitorController,
    ChatPlatformController,
    IncidentController,
    UserController,
    IntervalController,
    PlanController,
    InvoiceController,
    StripeController,
    UtilsController,
    StatusPageController,
    SupportController,
  ],
  exports: [
    TypeOrmModule,
    ...providerList
  ],
})
export class MainModule { }