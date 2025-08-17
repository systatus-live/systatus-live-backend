import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MonitorController } from 'src/controllers/monitor/monitor.controller';
import { MonitorEntity } from 'src/database/entities/MonitorEntity';
import { MonitorService } from 'src/services/monitor.service';


@Module({
  imports: [
    TypeOrmModule.forFeature([MonitorEntity])
  ],
  providers: [
    MonitorService
  ],
  controllers: [
    MonitorController
  ],
  exports: [
    TypeOrmModule,
    MonitorService,
  ]
})
export class MonitorModule {

}
