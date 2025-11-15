import { Injectable } from '@nestjs/common';
import nodeCron, { ScheduledTask } from "node-cron";

@Injectable()
export class CronService {
  public cronList: Map<string, ScheduledTask> = new Map<string, ScheduledTask>();

  public schedule(id: string, interval: string, callback: (params?: any) => void | Promise<void>) {
    const cron = nodeCron.schedule(interval, callback);
    this.cronList.set(id, cron);
  }
}
