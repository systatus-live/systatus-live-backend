
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from 'src/controllers/auth/auth.controller';
import { UserEntity } from 'src/database/entities/UserEntity';
import { AuthService } from 'src/services/auth.service';
import { MailService } from 'src/services/mail.service';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_KEY,
      signOptions: { 
        expiresIn: "3d" 
      }
    }),
    TypeOrmModule.forFeature([UserEntity])
  ],
  providers: [
    AuthService,
    MailService
  ],
  controllers: [AuthController],
  exports: [
    AuthService,
    MailService,
    TypeOrmModule,
  ],
})
export class AuthModule { }