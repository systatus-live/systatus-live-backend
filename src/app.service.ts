import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MonitorEntity } from './database/entities/MonitorEntity';
import { MonitorService } from './services/monitor.service';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(
    private datasource: DataSource,
    private monitorService: MonitorService
  ) { }

  onApplicationBootstrap() {
    this.initMonitor();
  }

  private async initMonitor() {
    try {
      const monitorList = await this.datasource.getRepository(MonitorEntity).find({
        order: {
          created_at: "DESC"
        }
      });
      monitorList.forEach(monitor => this.monitorService.start(monitor));
    } catch (error) {
      this.logger.error(error.message);
    }
  }
}
