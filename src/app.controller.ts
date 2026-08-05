import { All, Controller } from "@nestjs/common";

@Controller()
export class AppController {
  constructor() {}

  @All()
  check() {
    return {
      message: "Online",
    };
  }
}
