import { BadRequestException, Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthGuard } from '../middlewares/auth.guard';
import removeAccents from '../utils/removeAccents';

@Controller({
  version: "1",
  path: "/intervals"
})
@UseGuards(AuthGuard)
export class IntervalController {
  private querySize: number = parseInt(process.env.QUERY_SIZE as string);

  constructor(
    private dataSource: DataSource
  ) { }

  @Get("/")
  async getIntervalList(@Request() request: Request, @Query("page") page: number, @Query("search") search: string) {
    if (page == null || isNaN(page) || page < 0) {
      throw new BadRequestException("Informe o parâmetro numérico 'page >= 0'");
    }

    if (search) {
      search = removeAccents(search);
    }

    const planId = request["loggedPlan"];

    const [list, [{ total }]] = await Promise.all([
      this.dataSource.query(`
        select int.id
          , int.name
          , int.cron
        from intervals int
        join plan_intervals pi on pi.interval_id = int.id and pi.plan_id = '${planId}'
        where 1 = 1
        and ($1::text is null or lower(trim(unaccent(int.name))) like $1 or lower(trim(unaccent(int.cron))) like $1)
        order by int.index asc
        limit ${this.querySize} offset ${this.querySize * page}
      `, [search ? `%${search}%` : null]),
      this.dataSource.query(`
        select count(*) as total
        from intervals int
        join plan_intervals pi on pi.interval_id = int.id and pi.plan_id = '${planId}'
        where 1 = 1
        and ($1::text is null or lower(trim(unaccent(int.name))) like $1 or lower(trim(unaccent(int.cron))) like $1)
      `, [search ? `%${search}%` : null]),
    ]);

    return {
      data: list,
      total: parseInt(total ?? 0)
    }
  }
}
