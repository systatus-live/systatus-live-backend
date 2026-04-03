import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import momentTz from 'moment-timezone';
import { LessThan, Repository } from 'typeorm';
import { SubscriptionEntity } from '../database/entities/SubscriptionEntity';
import { SubscriptionStatusEnum } from '../types/SubscriptionStatusEnum';

@Injectable()
export class TrialService {
  constructor(
    @InjectRepository(SubscriptionEntity)
    private subscriptionRepository: Repository<SubscriptionEntity>
  ) { }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { 
    timeZone: "America/Sao_Paulo" 
  })
  async expireTrials(): Promise<void> {
    const now = momentTz().tz("America/Sao_Paulo").toISOString();

    await this.subscriptionRepository.update({
      status: SubscriptionStatusEnum.TRIAL,
      end_date: LessThan(now)
    }, {
      status: SubscriptionStatusEnum.EXPIRED
    });
  }
}
