import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { MainModule } from './modules/main.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ".env"
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 10,
        },
      ],
    }),
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DATABASE_HOST,
      port: +process.env.DATABASE_PORT!,
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      synchronize: false,
      entities: [`${__dirname}/database/entities/**/*{.ts,.js}`],
      migrations: [`${__dirname}/database/migrations/**/*{.ts,.js}`],
      autoLoadEntities: true,
      retryAttempts: 3,
      retryDelay: 10000,
      migrationsRun: true
    }),
    ScheduleModule.forRoot(),
    MainModule,
  ],
  controllers: [AppController]
})
export class AppModule { }
