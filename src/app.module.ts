import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import dataSource from './database/dataSource';
import { UserModule } from './modules/user.module';
import { AuthService } from './services/auth.service';
import { MailService } from './services/mail.service';
import { AuthController } from './controllers/auth.controller';
import { JwtModule, JwtService } from '@nestjs/jwt';

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
    UserModule,
  ],
  controllers: [
    AppController, 
    AuthController
  ],
  providers: [
    AppService, 
    AuthService, 
    MailService, 
    JwtService
  ]
})
export class AppModule {
  constructor(
    private dataSource: DataSource,
  ) {
  }
}
