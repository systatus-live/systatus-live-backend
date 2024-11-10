import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { MonitorLogEntity } from '../database/entities/MonitorLogEntity';
import { DataSource, Repository } from 'typeorm';
import axios from "axios";
import { AuthService } from './auth.service';
import { MonitorTypeEnum } from '../enums/MonitorTypeEnum';
import { exec } from "child_process";
import { MonitorEntity } from '../database/entities/MonitorEntity';
import { MonitorLogStatusEnum } from 'src/enums/MonitorLogStatusEnum';

@Injectable()
export class MonitorService {
  private monitorLogRepository: Repository<MonitorLogEntity> = null;
  private readonly logger = new Logger(MonitorService.name);

  constructor(
    private datasource: DataSource,
    private schedulerRegistry: SchedulerRegistry,
    private authService: AuthService
  ) {
    this.monitorLogRepository = this.datasource.getRepository(MonitorLogEntity);
  }

  public start(monitor: MonitorEntity) {
    const job = new CronJob(monitor.cron, () => {
      const address = this.authService.aesDecrypt(monitor.address);

      let doTest: () => Promise<any> = null;

      switch (monitor.type) {
        case MonitorTypeEnum.HTTP:
          doTest = () => {
            return axios[monitor.http_method.toLowerCase()](address);
          };
          break;
        case MonitorTypeEnum.PING:
          doTest = () => new Promise((resolve, reject) => {
            exec(`ping -c 1 ${address}`, (error, stdout, stderr) => {
              if (error) {
                reject(stdout);
              }
              resolve(1);
            })
          })
          break;
        default:
          break;
      }

      let status = null;
      let httpStatus = null;

      doTest().then(response => {
        this.logger.log(`${monitor.type} ${address}: ok`);
        status = MonitorLogStatusEnum.SUCCESS;
        httpStatus = response.status;
      }).catch(error => {
        this.logger.error(`${monitor.type} ${address}: ${error}`)
        status = MonitorLogStatusEnum.ERROR;
      }).finally(() => {
        this.monitorLogRepository.insert({
          id_monitor: monitor.id,
          status: status,
          http_status: httpStatus
        })
      })
    });
    this.schedulerRegistry.addCronJob(monitor.id, job as any);
    job.start();
  }

  public stop(id: string) {
    this.schedulerRegistry.getCronJob(id).stop();
    this.schedulerRegistry.deleteCronJob(id);
  }
}
