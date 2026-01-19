import { Controller, Get } from '@nestjs/common';
import { PlanService } from 'src/services/plan.service';

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
    const planList = await this.planService.getPlanList();
    return {
      data: planList
    }
  }
}
