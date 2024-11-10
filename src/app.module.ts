import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import dataSource from './database/dataSource';
import { AuthModule } from './modules/auth.module';
import { MonitorModule } from './modules/monitor.module';
import { UserModule } from './modules/user.module';
import { MailService } from './services/mail.service';
import { MonitorService } from './services/monitor.service';
import { ScheduleModule } from '@nestjs/schedule';

const dataSourceOptions: any = dataSource.options;

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ".env",
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        ...dataSourceOptions,
        autoLoadEntities: true,
        entities: [`${__dirname}/database/entities/**/*{.ts,.js}`],
        migrations: [`${__dirname}/database/migrations/**/*{.ts,.js}`],
        migrationsRun: true,
        seeds: [],
        factories: [],
        retryAttempts: 3,
        retryDelay: 20000
      }),
    }),
    ScheduleModule.forRoot(),
    UserModule,
    AuthModule,
    MonitorModule,
  ],
  controllers: [
    AppController
  ],
  providers: [
    AppService,
    MailService,
    MonitorService
  ]
})
export class AppModule {
  constructor(
    private dataSource: DataSource,
  ) { }
}
