
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
import { IntegrationService } from 'src/services/integration.service';
import { ChatPlatformController } from 'src/controllers/chat-platform.controller';
import { ChatPlatformEntity } from 'src/database/entities/ChatPlatformEntity';
import { MonitorIntegrationEntity } from 'src/database/entities/MonitorIntegrationEntity';
import { StatisticsController } from 'src/controllers/statistics.controller';
import { MonitorIncidentEntity } from 'src/database/entities/MonitorIncidentEntity';

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
      MonitorIncidentEntity,
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
    StatisticsController
  ],
  exports: [
    TypeOrmModule,
    ...serviceList
  ],
})
export class MainModule { }