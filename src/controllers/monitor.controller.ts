import { Body, Controller, Get, InternalServerErrorException, Post, Request, UseGuards } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { MonitorEntity } from '../database/entities/MonitorEntity';
import { AuthGuard } from '../guards/auth.guard';
import { AuthService } from '../services/auth.service';
import { MonitorService } from '../services/monitor.service';

@Controller("monitors")
export class MonitorController {
  private monitorRepository: Repository<MonitorEntity> = null;

  constructor(
    private authService: AuthService,
    private dataSource: DataSource,
    private monitorService: MonitorService
  ) {
    this.monitorRepository = this.dataSource.getRepository(MonitorEntity);
  }

  @UseGuards(AuthGuard)
  @Post()
  async createMonitor(@Body() body: any, @Request() req: Request) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    let newMonitor: MonitorEntity = null;

    try {
      newMonitor = this.monitorRepository.create({
        name: body.name,
        cron: "* * * * *",
        address: await this.authService.aesEncrypt(body.address),
        type: body.type,
        http_method: body.http_method,
        id_user: req.headers["logged_user_id"]
      });
      await queryRunner.manager.save(MonitorEntity, newMonitor);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      throw new InternalServerErrorException(`Internal failure when creating the monitor. Please contact support.`);
    }

    try {
      this.monitorService.start(newMonitor);
      await queryRunner.commitTransaction();
      await queryRunner.release();
    } catch (error) {
      this.monitorService.stop(newMonitor.id);
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      throw new InternalServerErrorException(`Internal failure when starting the monitor. Please contact support.`);
    }

    return {
      message: "Monitor created successfully",
      data: {
        id: newMonitor.id
      }
    }
  }

  @UseGuards(AuthGuard)
  @Get()
  async getMonitorList(@Request() req: Request) {
    const monitorList = await this.monitorRepository.find({
      where: {
        id: req.headers["logged_user_id"]
      },
      select: ["id", "name", "address", "created_at", "updated_at", "type", "cron"],
      order: {
        created_at: "DESC"
      }
    });

    monitorList.forEach(monitor => monitor.address = this.authService.aesDecrypt(monitor.address));

    return monitorList;
  }
}
