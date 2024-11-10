import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../database/entities/UserEntity';
import { UserController } from '../controllers/user.controller';
import { AuthService } from '../services/auth.service';
import { MailService } from '../services/mail.service';
import { AuthModule } from './auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity]),
    AuthModule
  ],
  exports: [TypeOrmModule],
  providers: [
    AuthService,
    MailService
  ],
  controllers: [UserController],
})
export class UserModule {}
