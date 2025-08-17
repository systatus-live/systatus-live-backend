import { Body, Controller, InternalServerErrorException, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MonitorEntity } from 'src/database/entities/MonitorEntity';
import { MonitorService } from 'src/services/monitor.service';
import { DataSource, Repository } from 'typeorm';
import { I18n, I18nContext } from 'nestjs-i18n';

@Controller({
  version: "1",
  path: "/monitors"
})
export class MonitorController {
  @InjectRepository(MonitorEntity) private monitorRepository: Repository<MonitorEntity>

  constructor(
    private monitorService: MonitorService,
    private dataSource: DataSource
  ) { }

  @Post("/")
  async createMonitor(@Body() body: any, @I18n() i18n: I18nContext) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const savedMonitor = this.monitorRepository.create({
        title: body.title,
        type: body.type,
        uri: body.uri,
        active: body.active,
        cron: body.cron,
        createdUserId: "", // TODO get logged user ID
        updatedUserId: "" // TODO get logged user ID
      });

      await queryRunner.manager.save(MonitorEntity, savedMonitor);
      await queryRunner.commitTransaction();

      this.monitorService.schedule(savedMonitor.id, "* * * * *", (error) => {
        // TODO verify type to monitor
      })

      return {
        message: i18n.translate("messages.monitorController.monitorCreateSuccess")
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(i18n.translate("messages.monitorController.monitorCreateError"));
    } finally {
      await queryRunner.release();
    }
  }
}
