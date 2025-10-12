import { BadRequestException, Body, ConflictException, Controller, Delete, Get, InternalServerErrorException, NotFoundException, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from 'src/database/entities/UserEntity';
import removeAccents from 'src/utils/removeAccents';
import { DataSource, Not, Repository } from 'typeorm';
import { IntegrationEntity } from '../database/entities/IntegrationEntity';
import { AuthGuard } from '../guards/auth/auth.guard';
import { IntegrationService } from 'src/services/integration.service';
import { HttpStatusCode } from 'src/enums/HttpStatusCode';
import { IntegrationTypeEnum } from 'src/enums/IntegrationTypeEnum';

@Controller({
  version: "1",
  path: "/integrations"
})
@UseGuards(AuthGuard)
export class IntegrationController {
  @InjectRepository(IntegrationEntity) private integrationRepository: Repository<IntegrationEntity>
  @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>

  private querySize: number = parseInt(process.env.QUERY_SIZE as string);

  constructor(
    private dataSource: DataSource,
    private integrationService: IntegrationService
  ) { }

  @Post("/")
  async createIntegration(@Request() request: Request, @Body() body: any) {
    const integrationWithSameURL = await this.integrationRepository.findOne({
      where: {
        createdUserId: request["loggedUser"],
        url: body.url
      },
      select: ["id", "name"]
    })

    if (integrationWithSameURL) {
      throw new ConflictException(`Já existe a integração '${integrationWithSameURL.name}' com esta URL`)
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const newIntegration = this.integrationRepository.create({
        url: body.url,
        name: body.name,
        type: body.type,
        createdUserId: request["loggedUser"],
        updatedUserId: request["loggedUser"]
      });

      await queryRunner.manager.save(IntegrationEntity, newIntegration);
      await queryRunner.commitTransaction();

      return {
        message: "Integração criada com sucesso.",
        data: {
          id: newIntegration.id
        }
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException("Falha ao criar a integração.");
    } finally {
      await queryRunner.release();
    }
  }

  @Get("/")
  async getIntegrationList(@Request() request: Request, @Query("page") page: number, @Query("search") search: string) {
    if (page == null || isNaN(page) || page < 0) {
      throw new BadRequestException("Informe o parâmetro numérico 'page >= 0'");
    }

    if (search) {
      search = removeAccents(search);
    }

    const results = await Promise.all([
      this.dataSource.query(`
        select itg.id, itg.name, itg.url, itg.type, itg."createdAt", itg."updatedAt"
        from integrations itg
        where itg."createdUserId" = '${request["loggedUser"]}'
        ${search ? `and (lower(trim(unaccent(itg.name))) like '%${search}%' or lower(trim(unaccent(itg.type))) like '%${search}%' or lower(trim(unaccent(itg.url))) like '%${search}%')` : ""}
        order by itg."createdAt" desc  
        limit ${this.querySize} offset ${this.querySize * page}
      `),
      this.dataSource.query(`
        select count(1) as total
        from integrations itg
        where itg."createdUserId" = '${request["loggedUser"]}'
        ${search ? `and (lower(trim(unaccent(itg.name))) like '%${search}%' or lower(trim(unaccent(itg.type))) like '%${search}%' or lower(trim(unaccent(itg.url))) like '%${search}%')` : ""}
      `),
    ]);

    return {
      data: results[0],
      total: results[1][0].total
    }
  }

  @Get("/:id")
  async getIntegrationById(@Request() request: Request, @Param("id") id: string) {
    const integration = await this.integrationRepository.findOne({
      where: {
        createdUserId: request["loggedUser"],
        id: id
      },
      select: ["id", "name", "url", "type", "createdAt", "updatedAt"]
    })

    if (!integration) {
      throw new NotFoundException("Integração não encontrada.");
    }

    return integration
  }

  @Put("/:id")
  async updateIntegration(@Request() request: Request, @Body() body: any, @Param("id") id: string) {
    const integration = await this.integrationRepository.findOne({
      where: {
        createdUserId: request["loggedUser"],
        id: id
      },
      select: ["id"]
    })

    if (!integration) {
      throw new NotFoundException("Integração não encontrada.");
    }

    const integrationWithSameURL = await this.integrationRepository.findOne({
      where: {
        createdUserId: request["loggedUser"],
        url: body.url,
        id: Not(integration.id)
      },
      select: ["id", "name"]
    })

    if (integrationWithSameURL) {
      throw new ConflictException(`Já existe a integração '${integrationWithSameURL.name}' com esta URL`)
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.update(IntegrationEntity, {
        id: integration.id
      }, {
        url: body.url,
        name: body.name,
        type: body.type,
        updatedUserId: request["loggedUser"]
      });
      await queryRunner.commitTransaction();

      return {
        message: "Integração atualizada com sucesso."
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException("Falha ao atualizar a integração.");
    } finally {
      await queryRunner.release();
    }
  }

  @Delete("/:id")
  async deleteIntegrationById(@Request() request: Request, @Param("id") id: string) {
    const integration = await this.integrationRepository.findOne({
      where: {
        createdUserId: request["loggedUser"],
        id: id
      },
      select: ["id"]
    })

    if (!integration) {
      throw new NotFoundException("Integração não encontrada.");
    }

    await this.integrationRepository.delete({
      id: integration.id
    })

    return {
      message: "Integração excluída com sucesso."
    }
  }

  @Post("/validates")
  async validateIntegration(@Request() request: Request, @Body("id") id: string) {
    const integration = await this.integrationRepository.findOne({
      where: {
        createdUserId: request["loggedUser"],
        id: id
      },
      select: ["id", "name", "url", "type", "createdAt", "updatedAt"],
    })

    if (!integration) {
      throw new NotFoundException("Integração não encontrada.");
    }

    try {
      const title = "Integração verificada";
      const msg = `A integração '${integration.name}' foi validada com sucesso.`;
      const footer = "Systatus.Live (https://systatus.live)"

      switch (integration.type) {
        case IntegrationTypeEnum.SLACK:
          await this.integrationService.sendSlackWebhook(integration.url, title, msg, footer);
          break;
        case IntegrationTypeEnum.GOOGLE_CHAT:
          await this.integrationService.sendGoogleChatWebhook(integration.url, title, msg, footer);
          break;
        case IntegrationTypeEnum.DISCORD:
          await this.integrationService.sendDiscordWebhook(integration.url, title, msg, footer);
          break;
        default:
          throw new BadRequestException(`Tipo de integração '${integration.type}' inválido.`);
      }
    } catch (error) {
      throw new InternalServerErrorException(`Falha ao validar a integração. Verifique a URL informada.`);
    }

    return {
      message: "Integração validada com sucesso."
    }
  }
}
