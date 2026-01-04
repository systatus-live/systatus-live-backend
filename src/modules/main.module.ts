
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
import { CronService } from '../services/cron.service';
import { MailService } from '../services/mail.service';
import { IntegrationService } from '../services/integration.service';
import { ChatPlatformController } from '../controllers/chat-platform.controller';
import { ChatPlatformEntity } from '../database/entities/ChatPlatformEntity';
import { MonitorIntegrationEntity } from '../database/entities/MonitorIntegrationEntity';
import { StatisticsController } from '../controllers/statistics.controller';
import { IncidentEntity } from '../database/entities/IncidentEntity';
import { IncidentController } from '../controllers/incident.controller.ts';
import { UserController } from 'src/controllers/user.controller';

const serviceList = [
  AuthService,
  MailService,
  CronService,
  IntegrationService
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
      ChatPlatformEntity
    ]),
  ],
  providers: [
    ...serviceList
  ],
  controllers: [
    AuthController,
    IntegrationController,
    MonitorController,
    ChatPlatformController,
    StatisticsController,
    IncidentController,
    UserController
  ],
  exports: [
    TypeOrmModule,
    ...serviceList
  ],
})
export class MainModule { }