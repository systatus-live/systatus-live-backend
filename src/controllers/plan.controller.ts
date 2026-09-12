import { Controller, Get } from '@nestjs/common';
import { PlanService } from '../services/plan.service';

@Controller({
  version: "1",
  path: "/plans"
})
export class PlanController {
  constructor(
    private planService: PlanService
  ) { }

  @Get("/")
  async getPlanList() {
    return this.planService.getPlanList();
  }
}
