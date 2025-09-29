import { Injectable } from '@nestjs/common';

@Injectable()
export class CronService {
  public configure() {
    // TODO
  }

  public schedule(id: string, interval: string, callback: (params?: any) => void | Promise<void>) {
    // TODO
  }
}
