import { BadRequestException, Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import removeAccents from '../utils/removeAccents';
import { DataSource } from 'typeorm';
import { AuthGuard } from '../middlewares/auth.guard';

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
  async getChatPlatformList(@Request() request: Request, @Query("page") page: number, @Query("search") search: string) {
    if (page == null || isNaN(page) || page < 0) {
      throw new BadRequestException("Informe o parâmetro numérico 'page >= 0'");
    }

    if (search) {
      search = removeAccents(search);
    }

    const planId = request["loggedPlan"];

    const [list, [{ total }]] = await Promise.all([
      this.dataSource.query(`
        select cpl.id
          , cpl.name
          , cpl.description
          , cpl.icon_url
          , cpl.doc_url
          , cpl.created_at
          , cpl.updated_at
          , cpl.type
        from chat_platforms cpl
        join plan_chat_platforms pcp on pcp.chat_platform_id = cpl.id
        where pcp.plan_id = '${planId}'
        and ($1::text is null or lower(trim(unaccent(cpl.name))) like $1 or lower(trim(unaccent(cpl.description))) like $1)
        order by cpl.index asc
        limit ${this.querySize} offset ${this.querySize * page}
      `, [search ? `%${search}%` : null]),
      this.dataSource.query(`
        select count(*) as total
        from chat_platforms cpl
        join plan_chat_platforms pcp on pcp.chat_platform_id = cpl.id
        where pcp.plan_id = '${planId}'
        and ($1::text is null or lower(trim(unaccent(cpl.name))) like $1 or lower(trim(unaccent(cpl.description))) like $1)
      `, [search ? `%${search}%` : null]),
    ]);

    return {
      data: list,
      total: parseInt(total ?? 0)
    }
  }
}
