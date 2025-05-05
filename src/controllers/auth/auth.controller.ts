import { Body, ConflictException, Controller, InternalServerErrorException, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { readFileSync } from 'fs';
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

    if (findUser && findUser.verified) {
      throw new ConflictException("E-mail already registered.");
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const verificationCode = Array.from({ length: 6 }, () => Math.floor(Math.random() * 9) + 1).join("");
      const password = this.authService.bcryptHashSync(body.password);

      let savedUser: any = null;

      if (findUser) {
        savedUser = {
          id: findUser.id,
          name: body.name,
          email: body.email,
          password: password,
          accepted_terms: body.acceptTerms,
          discovery: body.discovery,
          verified: false,
          verification_code: verificationCode
        };
      } else {
        savedUser = this.userRepository.create({
          name: body.name,
          email: body.email,
          password: password,
          accepted_terms: body.acceptTerms,
          discovery: body.discovery,
          verified: false,
          verification_code: verificationCode
        });
      }

      await queryRunner.manager.save(UserEntity, savedUser);

      let emailBody = readFileSync(`${__dirname}/../../assets/mail/${findUser ? "VerifyUserEmail" : "NewUserEmail"}.html`, "utf-8");
      emailBody = emailBody.replace(/{{USERNAME}}/g, savedUser.name.split(" ")[0]).replace(/{{CODE}}/g, savedUser.verification_code);

      await this.mailService.sendMail(savedUser.email, findUser ? "Welcome back to Systatus Live 👋" : "Welcome to Systatus Live 👋", emailBody)

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
