import { Body, ConflictException, Controller, InternalServerErrorException, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from 'src/database/entities/UserEntity';
import { AuthService } from 'src/services/auth.service';
import { MailService } from 'src/services/mail.service';
import { DataSource, getConnection, Repository } from 'typeorm';

@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>,
    private dataSource: DataSource,
    private mailService: MailService
  ) { }

  @Post("/register")
  async register(@Body() body) {
    const findUser = await this.userRepository.findOne({
      where: {
        email: body.email
      }
    })

    if (findUser) {
      throw new ConflictException("E-mail already registered.");
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const newUser = this.userRepository.create({
        name: body.name,
        email: body.email,
        password: this.authService.bcryptHashSync(body.password),
        accepted_terms: body.acceptTerms,
        discovery: body.discovery,
        verified: false
      })

      await queryRunner.manager.save(UserEntity, newUser);

      await queryRunner.commitTransaction();

      return {
        message: "User created successfully."
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException("Failed to register user.");
    } finally {
      await queryRunner.release();
    }
  }
}
