import { Body, Controller, InternalServerErrorException, Post, Request, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { I18n, I18nContext } from 'nestjs-i18n';
import { IntegrationEntity } from '../database/entities/IntegrationEntity';
import { AuthGuard } from '../guards/auth/auth.guard';
import { DataSource, Repository } from 'typeorm';

@Controller({
  version: "1",
  path: "/integrations"
})
@UseGuards(AuthGuard)
export class IntegrationController {
  @InjectRepository(IntegrationEntity) private integrationRepository: Repository<IntegrationEntity>

  constructor(
    private dataSource: DataSource
  ) { }

  @Post("/")
  async createIntegration(@Request() request: Request, @Body() body: any, @I18n() i18n: I18nContext) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      const newIntegration = this.integrationRepository.create({
        title: body.title,
        type: body.type,
        createdUserId: request["loggedUser"],
        updatedUserId: request["loggedUser"]
      });

      await queryRunner.manager.save(IntegrationEntity, newIntegration);
      await queryRunner.commitTransaction();

      return {
        message: i18n.translate("translate.integrationController.integrationCreateSuccess")
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(i18n.translate("translate.integrationController.integrationCreateError"));
    } finally {
      await queryRunner.release();
    }
  }
}
