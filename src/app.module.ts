import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './modules/user/user.module';
import { UserEntity } from './database/entities/UserEntity';
import { UserService } from './services/user/user.service';
import { UserController } from './controllers/user/user.controller';
import { DataSource } from 'typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ".env",
    }),
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT),
      username: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      synchronize: false,
      retryAttempts: 3,
      retryDelay: 10000,
      autoLoadEntities: false,
      entities: [
        UserEntity
      ]
    }),
    UserModule,
  ],
  controllers: [AppController, UserController],
  providers: [AppService, UserService]
})
export class AppModule { 
  constructor(private dataSource: DataSource) {}
}
