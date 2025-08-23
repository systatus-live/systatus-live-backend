import { Agenda, Job } from '@hokify/agenda';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CronService {
  private static agendaInstance: Agenda | null = null;

  public configure() {
    CronService.agendaInstance = new Agenda({
      db: {
        address: process.env.MONGO_URI as string,
        collection: "systatus-agenda"
      },
    }, (error) => {
      if (error) {
        console.error("[AGENDA] Error connecting to MongoDB:", error);
      } else {
        console.log("[AGENDA] Connected to MongoDB successfully");
        CronService.agendaInstance?.start();
      }
    });

    CronService.agendaInstance.on("start", (job: Job<any>) => {
      const lastRunAt = job.attrs.lastRunAt || new Date();
      console.log(`[AGENDA] Job ${job.attrs.name} started at ${lastRunAt.toLocaleString()}`);
    });
    CronService.agendaInstance.on("complete", (job: Job<any>) => console.log(`[AGENDA] Job ${job.attrs.name} completed`));
    CronService.agendaInstance.on("error", (error: Error) => console.error("[AGENDA] Error:", error));
    CronService.agendaInstance.on("fail", (error: Error, job: Job<any>) => console.error(`[AGENDA] Job ${job.attrs.name} failed with error:`, error));
  }

  public schedule(id: string, interval: string, callback: (agendaJob: Job<any>, done: (error?: Error) => void) => void): void {
    CronService.agendaInstance?.define(id, callback);
    CronService.agendaInstance?.every(interval, id);
  }
}
