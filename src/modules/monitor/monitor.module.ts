import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitorController } from 'src/controllers/monitor/monitor.controller';
import { MonitorEntity } from 'src/database/entities/MonitorEntity';
import { MonitorHistoryEntity } from 'src/database/entities/MonitorHistoryEntity';
import { AuthService } from 'src/services/auth.service';
import { CronService } from 'src/services/cron.service';


@Module({
  imports: [
    TypeOrmModule.forFeature([
      MonitorEntity,
      MonitorHistoryEntity
    ])
  ],
  providers: [
    CronService,
    AuthService
  ],
  controllers: [
    MonitorController
  ],
  exports: [
    TypeOrmModule,
    CronService,
  ]
})
export class MonitorModule {

}
