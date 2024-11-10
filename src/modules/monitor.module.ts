import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitorController } from '../controllers/monitor.controller';
import { MonitorEntity } from '../database/entities/MonitorEntity';
import { AuthService } from '../services/auth.service';
import { MonitorService } from '../services/monitor.service';
import { MonitorLogEntity } from '../database/entities/MonitorLogEntity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MonitorEntity,
      MonitorLogEntity
    ]),
  ],
  exports: [],
  providers: [
    MonitorService,
    AuthService
  ],
  controllers: [
    MonitorController
  ]
})
export class MonitorModule { }
