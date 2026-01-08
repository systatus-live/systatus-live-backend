import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthGuard } from '../guards/auth/auth.guard';
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
  async getIntervalList(@Query("page") page: number, @Query("search") search: string) {
    if (page == null || isNaN(page) || page < 0) {
      throw new BadRequestException("Informe o parâmetro numérico 'page >= 0'");
    }

    if (search) {
      search = removeAccents(search);
    }

    const results = await Promise.all([
      this.dataSource.query(`
        select int.id
          , int.name
          , int.cron
        from intervals int
        where 1 = 1
        ${search ? `and (lower(trim(unaccent(int.name))) like '%${search}%' or lower(trim(unaccent(int.cron))) like '%${search}%')` : ""}
        order by int.index asc
        limit ${this.querySize} offset ${this.querySize * page}
      `),
      this.dataSource.query(`
        select count(1) as total
        from intervals int
        where 1 = 1
        ${search ? `and (lower(trim(unaccent(int.name))) like '%${search}%' or lower(trim(unaccent(int.cron))) like '%${search}%')` : ""}
      `),
    ]);

    return {
      data: results[0],
      total: results[1][0].total
    }
  }
}
