import { All, Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  constructor() {}

  @All()
  checkOnline() {
    return {
      message: "ok"
    }
  }
}
