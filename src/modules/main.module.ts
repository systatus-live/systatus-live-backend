
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
import { AuthModule } from './auth/auth.module';

const serviceList = [
  AuthService,
  MailService,
  CronService
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
      UserEntity
    ]),
    AuthModule
  ],
  providers: [
    ...serviceList
  ],
  controllers: [
    AuthController,
    IntegrationController,
    MonitorController
  ],
  exports: [
    TypeOrmModule,
    ...serviceList
  ],
})
export class MainModule { }