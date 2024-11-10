import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserEntity } from '../database/entities/user.entity';
import { AuthService } from '../services/auth.service';
import { DataSource, Repository } from 'typeorm';

@Controller("auth")
export class AuthController {
  private userRepository: Repository<UserEntity> = null;

  constructor(
    private datasource: DataSource,
    private authService: AuthService,
    private jwtService: JwtService
  ) {
    this.userRepository = this.datasource.getRepository(UserEntity);
  }

  @Post()
  async login(@Body() body: any) {
    const { email, password } = body;

    const findUser = await this.userRepository.findOne({
      where: {
        email: email
      }
    })

    if (!findUser || !this.authService.bcryptCompareSync(findUser.password, password)) {
      throw new UnauthorizedException("Invalid user or password.");
    }

    const jwt = await this.jwtService.signAsync({
      user: findUser.id
    })

    return {
      message: "Authorized",
      data: {
        access_token: jwt
      }
    }
  }
}