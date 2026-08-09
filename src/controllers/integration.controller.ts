import { BadRequestException, Body, ConflictException, Controller, Delete, Get, InternalServerErrorException, NotFoundException, Param, Post, Put, Query, Request, UnprocessableEntityException, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { readFileSync } from 'fs';
import { DataSource, Not, Repository } from 'typeorm';
import { IntegrationEntity } from '../database/entities/IntegrationEntity';
import { IntegrationTemplateEntity } from '../database/entities/IntegrationTemplateEntity';
import { UserEntity } from '../database/entities/UserEntity';
import { AuthGuard } from '../middlewares/auth.guard';
import { AuthService } from '../services/auth.service';
import { IntegrationService } from '../services/integration.service';
import { MailService } from '../services/mail.service';
import { PlanService } from '../services/plan.service';
import { ChatPlatformEnum, ChatPlatformTypeEnum } from '../types/ChatPlatformEnum';
import { ChatPlatformEntity } from '../database/entities/ChatPlatformEntity';
import { IntegrationTemplateTypeEnum } from '../types/IntegrationTemplateTypeEnum';
import { PermissionEnum } from '../types/PermissionEnum';
import getCurrentDate from '../utils/getCurrenDate';
import removeAccents from '../utils/removeAccents';
import formatDate from 'src/utils/formatDate';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

@Controller({
  version: "1",
  path: "/integrations"
})
@UseGuards(AuthGuard)
export class IntegrationController {
  @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>
  @InjectRepository(IntegrationEntity) private integrationRepository: Repository<IntegrationEntity>
  @InjectRepository(IntegrationTemplateEntity) private integrationTemplateRepository: Repository<IntegrationTemplateEntity>

  private querySize: number = parseInt(process.env.QUERY_SIZE as string);

  private readonly downTemplateDefault = "🔴 {{monitor}} ({{address}}) ficou indisponível: {{status_description}}";
  private readonly upTemplateDefault = "🟢 {{monitor}} ({{address}}) ficou disponível. Downtime: {{downtime}}";

  constructor(
    private dataSource: DataSource,
    private authService: AuthService,
    private integrationService: IntegrationService,
    private mailService: MailService,
    private planService: PlanService,
  ) { }

  @Post("/")
  async createIntegration(@Request() request: Request, @Body() body: any) {
    const integrationWithSameAddress = await this.integrationRepository.findOne({
      where: {
        created_user_id: request["loggedUser"],
        address: body.address
      },
      select: ["id", "name"]
    })

    if (integrationWithSameAddress) {
      throw new ConflictException(`Já existe a integração '${integrationWithSameAddress.name}' com este endereço.`)
    }

    await this.planService.assertChatPlatformAllowed(request["loggedPlan"], body.chatPlatformId);

    const hasCustomNotification = await this.authService.hasPermission(request["loggedPlan"], PermissionEnum.CUSTOM_NOTIFICATION);

    const downTemplate = hasCustomNotification ? (body.downTemplate || this.downTemplateDefault) : this.downTemplateDefault;
    const upTemplate = hasCustomNotification ? (body.upTemplate || this.upTemplateDefault) : this.upTemplateDefault;

    if (hasCustomNotification) {
      const chatPlatform = await this.dataSource.getRepository(ChatPlatformEntity).findOne({
        where: {
          id: body.chatPlatformId
        },
        select: ["type"]
      });

      if (chatPlatform?.type !== ChatPlatformTypeEnum.WEBHOOK) {
        throw new BadRequestException("Mensagens personalizadas disponíveis apenas para integrações de webhook.");
      }

      if (downTemplate.length > 250 || upTemplate.length > 250) {
        throw new BadRequestException("Os templates devem ter no máximo 250 caracteres.");
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const newIntegration = this.integrationRepository.create({
        address: body.address,
        name: body.name,
        chat_platform_id: body.chatPlatformId,
        created_user_id: request["loggedUser"],
        updated_user_id: request["loggedUser"]
      });

      await queryRunner.manager.save(IntegrationEntity, newIntegration);

      await queryRunner.manager.save(IntegrationTemplateEntity, this.integrationTemplateRepository.create({
        integration_id: newIntegration.id,
        created_user_id: request["loggedUser"],
        updated_user_id: request["loggedUser"],
        ...(hasCustomNotification ? {
          type: IntegrationTemplateTypeEnum.CUSTOM,
          down_template: downTemplate,
          up_template: upTemplate,
        } : {
          type: IntegrationTemplateTypeEnum.DEFAULT,
          down_template: this.downTemplateDefault,
          up_template: this.upTemplateDefault,
        })
      }));

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

  @Get("/templates/defaults")
  getTemplateDefaults() {
    return {
      downTemplate: this.downTemplateDefault,
      upTemplate: this.upTemplateDefault,
    };
  }

  @Get("/")
  async getIntegrationList(@Request() request: Request, @Query("page") page: string, @Query("search") search: string) {
    if (page == null || isNaN(parseInt(page)) || parseInt(page) < 0) {
      throw new BadRequestException("Informe o parâmetro numérico 'page >= 0'");
    }

    if (search) {
      search = removeAccents(search).toLowerCase();
    }

    const list = await this.dataSource.query(`
      select
        itg.id
        , itg.name
        , itg.address
        , itg.chat_platform_id
        , cpl.description as "chatPlatform"
        , cpl.icon_url as "chatPlatformIconUrl"
        , itg.created_at
        , itg.updated_at
        , count(*) over() as total
      from integrations itg
      join chat_platforms cpl on cpl.id = itg.chat_platform_id
      where itg.created_user_id = '${request["loggedUser"]}'
      and ($1::text is null or lower(trim(unaccent(itg.name))) like $1 or lower(trim(unaccent(itg.address))) like $1)
      order by itg.created_at desc
      limit ${this.querySize} offset ${this.querySize * parseInt(page)}
    `, [search ? `%${search}%` : null]);

    return {
      data: list,
      pagination: {
        rows: this.querySize,
        total: parseInt(list[0]?.total ?? 0)
      }
    }
  }

  @Get("/:id")
  async getIntegrationById(@Request() request: Request, @Param("id") id: string) {
    const integration = await this.integrationRepository.findOne({
      where: {
        created_user_id: request["loggedUser"],
        id: id
      },
      select: ["id", "name", "address", "chat_platform_id", "created_at", "updated_at"]
    }).catch(_ => {
      throw new NotFoundException("Integração não encontrada.");
    })

    if (!integration) {
      throw new NotFoundException("Integração não encontrada.");
    }

    const templates = await this.integrationTemplateRepository.find({
      where: {
        integration_id: integration.id
      },
      select: ["type", "down_template", "up_template"]
    });

    integration["template"] = templates.find(t => t.type == IntegrationTemplateTypeEnum.CUSTOM) ?? templates.find(t => t.type == IntegrationTemplateTypeEnum.DEFAULT);

    return integration
  }

  @Put("/:id")
  async updateIntegration(@Request() request: Request, @Body() body: any, @Param("id") id: string) {
    const integration = await this.integrationRepository.findOne({
      where: {
        created_user_id: request["loggedUser"],
        id: id
      },
      select: ["id", "chat_platform_id"]
    })

    if (!integration) {
      throw new NotFoundException("Integração não encontrada.");
    }

    const integrationWithSameAddress = await this.integrationRepository.findOne({
      where: {
        created_user_id: request["loggedUser"],
        address: body.address,
        id: Not(integration.id)
      },
      select: ["id", "name"]
    })

    if (integrationWithSameAddress) {
      throw new ConflictException(`Já existe a integração '${integrationWithSameAddress.name}' com este endereço.`)
    }

    const hasCustomNotification = await this.authService.hasPermission(request["loggedPlan"], PermissionEnum.CUSTOM_NOTIFICATION);

    const downTemplate = hasCustomNotification ? (body.downTemplate || this.downTemplateDefault) : this.downTemplateDefault;
    const upTemplate = hasCustomNotification ? (body.upTemplate || this.upTemplateDefault) : this.upTemplateDefault;

    if (hasCustomNotification) {
      const platformId = body.chatPlatformId ?? integration.chat_platform_id;

      const chatPlatform = await this.dataSource.getRepository(ChatPlatformEntity).findOne({
        where: {
          id: platformId
        },
        select: ["type"]
      });

      if (chatPlatform?.type != ChatPlatformTypeEnum.WEBHOOK) {
        throw new BadRequestException("Mensagens personalizadas disponíveis apenas para integrações de webhook.");
      }

      if (downTemplate.length > 250 || upTemplate.length > 250) {
        throw new BadRequestException("Os templates devem ter no máximo 250 caracteres.");
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.update(IntegrationEntity, {
        id: integration.id
      }, {
        address: body.address,
        name: body.name,
        chat_platform_id: body.chatPlatformId,
        updated_user_id: request["loggedUser"]
      });

      const existingTemplate = await queryRunner.manager.findOne(IntegrationTemplateEntity, {
        where: {
          integration_id: integration.id
        }
      });

      const templateData = {
        updated_user_id: request["loggedUser"],
        ...(hasCustomNotification ? {
          type: IntegrationTemplateTypeEnum.CUSTOM,
          down_template: downTemplate,
          up_template: upTemplate,
        } : {
          type: IntegrationTemplateTypeEnum.DEFAULT,
          down_template: this.downTemplateDefault,
          up_template: this.upTemplateDefault,
        })
      };

      if (existingTemplate) {
        await queryRunner.manager.update(IntegrationTemplateEntity, {
          id: existingTemplate.id
        }, templateData);
      } else {
        await queryRunner.manager.save(IntegrationTemplateEntity, this.integrationTemplateRepository.create({
          integration_id: integration.id,
          created_user_id: request["loggedUser"],
          ...templateData
        }));
      }

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
        created_user_id: request["loggedUser"],
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

  @Throttle({
    default: {
      limit: 5,
      ttl: 60000
    }
  })
  @UseGuards(ThrottlerGuard)
  @Post("/validates")
  async validateIntegration(@Request() request: Request, @Body("id") id: string) {
    const integration = await this.integrationRepository.findOne({
      where: {
        created_user_id: request["loggedUser"],
        id: id
      },
      select: ["id", "name", "address", "chat_platform_id", "created_at", "updated_at"],
      relations: ["chatPlatform"]
    })

    if (!integration) {
      throw new NotFoundException("Integração não encontrada.");
    }

    try {
      const title = "Teste de Integração";
      const msg = `A integração '${integration.name}' está funcionando corretamente.`;
      const footer = `Systatus.Live - ${formatDate(getCurrentDate(), "DD/MM/YYYY HH:mm:ss")}`;

      switch (integration.chatPlatform.name) {
        case ChatPlatformEnum.SLACK:
          await this.integrationService.sendSlackWebhook(integration.address, title, msg, footer, "#999999");
          break;
        case ChatPlatformEnum.GOOGLE_CHAT:
          await this.integrationService.sendGoogleChatWebhook(integration.address, title, msg, footer);
          break;
        case ChatPlatformEnum.DISCORD:
          await this.integrationService.sendDiscordWebhook(integration.address, title, msg, footer, "#999999");
          break;
        case ChatPlatformEnum.WHATSAPP:
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
          await this.mailService.sendMail("Systatus.Live <systatus@artcode.dev>", integration.address, "Teste Integração", emailBody);
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
