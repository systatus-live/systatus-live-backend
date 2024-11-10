import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../database/entities/user.entity';
import { UserController } from '../controllers/user.controller';
import { AuthService } from '../services/auth.service';
import { MailService } from 'src/services/mail.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity])
  ],
  exports: [TypeOrmModule],
  providers: [
    AuthService,
    MailService
  ],
  controllers: [UserController],
})
export class UserModule {}
