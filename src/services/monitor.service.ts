import { Agenda, Job } from '@hokify/agenda';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MonitorService {
  private static agendaInstance: Agenda | null = null;

  public configure() {
    MonitorService.agendaInstance = new Agenda({
      db: {
        address: process.env.MONGO_URI as string,
        collection: "systatus-agenda"
      },
    }, (error) => {
      if (error) {
        console.error("[AGENDA] Error connecting to MongoDB:", error);
      } else {
        console.log("[AGENDA] Connected to MongoDB successfully");
        MonitorService.agendaInstance?.start();
      }
    });

    MonitorService.agendaInstance.on("start", (job: Job<any>) => console.log(`[AGENDA] Job ${job.attrs.name} started`));
    MonitorService.agendaInstance.on("complete", (job: Job<any>) => console.log(`[AGENDA] Job ${job.attrs.name} completed`));
    MonitorService.agendaInstance.on("error", (error: Error) => console.error("[AGENDA] Error:", error));
    MonitorService.agendaInstance.on("fail", (error: Error, job: Job<any>) => console.error(`[AGENDA] Job ${job.attrs.name} failed with error:`, error));
  }

  public schedule(id: string, interval: string, callback: (agendaJob: Job<any>, done: (error?: Error) => void) => void): void {
    MonitorService.agendaInstance?.define(id, callback);
    MonitorService.agendaInstance?.every(interval, id);
  }
}
