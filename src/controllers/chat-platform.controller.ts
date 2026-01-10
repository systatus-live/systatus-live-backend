import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import removeAccents from '../utils/removeAccents';
import { DataSource, Repository } from 'typeorm';
import { AuthGuard } from '../guards/auth/auth.guard';

@Controller({
  version: "1",
  path: "/chat-platforms"
})
@UseGuards(AuthGuard)
export class ChatPlatformController {
  private querySize: number = parseInt(process.env.QUERY_SIZE as string);

  constructor(
    private dataSource: DataSource
  ) { }

  @Get("/")
  async getChatPlatformList(@Query("page") page: number, @Query("search") search: string) {
    if (page == null || isNaN(page) || page < 0) {
      throw new BadRequestException("Informe o parâmetro numérico 'page >= 0'");
    }

    if (search) {
      search = removeAccents(search);
    }

    const results = await Promise.all([
      this.dataSource.query(`
        select cpl.id
          , cpl.name
          , cpl.description
          , cpl."iconUrl"
          , cpl."docUrl"
          , cpl."createdAt"
          , cpl."updatedAt"
          , cpl.type
        from chat_platforms cpl
        where 1 = 1
        ${search ? `and (lower(trim(unaccent(cpl.name))) like '%${search}%' or lower(trim(unaccent(cpl.description))) like '%${search}%')` : ""}
        order by cpl."createdAt" desc
        limit ${this.querySize} offset ${this.querySize * page}
      `),
      this.dataSource.query(`
        select count(1) as total
        from chat_platforms cpl
        where 1 = 1
        ${search ? `and (lower(trim(unaccent(cpl.name))) like '%${search}%' or lower(trim(unaccent(cpl.description))) like '%${search}%')` : ""}
      `),
    ]);

    return {
      data: results[0],
      total: results[1][0].total
    }
  }
}
