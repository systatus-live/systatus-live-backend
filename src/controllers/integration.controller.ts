import { BadRequestException, Body, ConflictException, Controller, Delete, Get, InternalServerErrorException, NotFoundException, Param, Post, Put, Query, Request, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IntegrationService } from '../services/integration.service';
import removeAccents from '../utils/removeAccents';
import { DataSource, Not, Repository } from 'typeorm';
import { IntegrationEntity } from '../database/entities/IntegrationEntity';
import { AuthGuard } from '../guards/auth/auth.guard';
import { ChatPlatformEnum } from '../enums/ChatPlatformEnum';
import { MailService } from 'src/services/mail.service';
import { readFileSync } from 'fs';
import { UserEntity } from 'src/database/entities/UserEntity';
import getCurrentDate from 'src/utils/getCurrenDate';

@Controller({
  version: "1",
  path: "/integrations"
})
@UseGuards(AuthGuard)
export class IntegrationController {
  @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>
  @InjectRepository(IntegrationEntity) private integrationRepository: Repository<IntegrationEntity>

  private querySize: number = parseInt(process.env.QUERY_SIZE as string);

  constructor(
    private dataSource: DataSource,
    private integrationService: IntegrationService,
    private mailService: MailService
  ) { }

  @Post("/")
  async createIntegration(@Request() request: Request, @Body() body: any) {
    const integrationWithSameAddress = await this.integrationRepository.findOne({
      where: {
        createdUserId: request["loggedUser"],
        address: body.address
      },
      select: ["id", "name"]
    })

    if (integrationWithSameAddress) {
      throw new ConflictException(`Já existe a integração '${integrationWithSameAddress.name}' com este endereço`)
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const newIntegration = this.integrationRepository.create({
        address: body.address,
        name: body.name,
        chatPlatformId: body.chatPlatformId,
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
        select
          itg.id
          , itg.name
          , itg.address
          , itg."chatPlatformId"
          , cpl.description as "chatPlatform"
          , cpl."iconUrl" as "chatPlatformIconUrl"
          , itg."createdAt"
          , itg."updatedAt"
        from integrations itg
        join chat_platforms cpl on cpl.id = itg."chatPlatformId"
        where itg."createdUserId" = '${request["loggedUser"]}'
        ${search ? `and (lower(trim(unaccent(itg.name))) like '%${search}%' or lower(trim(unaccent(cpl.description))) like '%${search}%')` : ""}
        order by itg."createdAt" desc  
        limit ${this.querySize} offset ${this.querySize * page}
      `),
      this.dataSource.query(`
        select count(1) as total
        from integrations itg
        join chat_platforms cpl on cpl.id = itg."chatPlatformId"
        where itg."createdUserId" = '${request["loggedUser"]}'
        ${search ? `and (lower(trim(unaccent(itg.name))) like '%${search}%' or lower(trim(unaccent(cpl.description))) like '%${search}%')` : ""}
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
      select: ["id", "name", "address", "chatPlatformId", "createdAt", "updatedAt"]
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

    const integrationWithSameAddress = await this.integrationRepository.findOne({
      where: {
        createdUserId: request["loggedUser"],
        address: body.address,
        id: Not(integration.id)
      },
      select: ["id", "name"]
    })

    if (integrationWithSameAddress) {
      throw new ConflictException(`Já existe a integração '${integrationWithSameAddress.name}' com este endereço.`)
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.update(IntegrationEntity, {
        id: integration.id
      }, {
        address: body.address,
        name: body.name,
        chatPlatformId: body.chatPlatformId,
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
      select: ["id", "name", "address", "chatPlatformId", "createdAt", "updatedAt"],
      relations: ["chatPlatform"]
    })

    if (!integration) {
      throw new NotFoundException("Integração não encontrada.");
    }

    try {
      const title = "Teste de Integração";
      const msg = `A integração '${integration.name}' está funcionando corretamente.`;
      const footer = `Systatus.Live - ${getCurrentDate("DD/MM/YYYY HH:mm:ss")}`;

      switch (integration.chatPlatform.name) {
        case ChatPlatformEnum.SLACK:
          await this.integrationService.sendSlackWebhook(integration.address, title, msg, footer);
          break;
        case ChatPlatformEnum.GOOGLE_CHAT:
          await this.integrationService.sendGoogleChatWebhook(integration.address, title, msg, footer);
          break;
        case ChatPlatformEnum.DISCORD:
          await this.integrationService.sendDiscordWebhook(integration.address, title, msg, footer);
          break;
        case ChatPlatformEnum.EMAIL:
          const loggedUser = await this.userRepository.findOne({
            where: {
              id: request["loggedUser"]
            },
            select: ["name"]
          })

          const emailBody = readFileSync(`${__dirname}/../assets/mail/IntegrationVerify.html`, "utf-8")
            .replace(/{{USERNAME}}/g, loggedUser!.name)
            .replace(/{{INTEGRATION}}/g, integration.name);
          await this.mailService.sendMail("Systatus.Live <system@systatus.live>", integration.address, "Teste Integração", emailBody);
          break;
        default:
          throw new UnprocessableEntityException("Plataforma de chat não suportada para validação.");
      }
    } catch (error) {
      throw new InternalServerErrorException(`Falha ao validar a integração. Verifique o endereço informado.`);
    }

    return {
      message: "Integração validada com sucesso."
    }
  }
}
