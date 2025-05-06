import { Body, ConflictException, Controller, InternalServerErrorException, NotImplementedException, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { readFileSync } from 'fs';
import { UserEntity } from 'src/database/entities/UserEntity';
import { SigninTypeEnum } from 'src/enums/SigninTypeEnum';
import { AuthService } from 'src/services/auth.service';
import { MailService } from 'src/services/mail.service';
import { DataSource, Repository } from 'typeorm';

@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>,
    private dataSource: DataSource,
    private mailService: MailService
  ) { }

  @Post("/signup")
  async signup(@Body() body) {
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

      let savedUser: Partial<UserEntity> = {
        name: body.name,
        email: body.email,
        password: password,
        accepted_terms: body.acceptTerms,
        discovery: body.discovery,
        verified: false,
        verification_code: verificationCode
      };

      if (findUser) {
        savedUser.id = findUser.id;
      } else {
        savedUser = this.userRepository.create(savedUser);
      }

      await queryRunner.manager.save(UserEntity, savedUser);

      let emailBody = readFileSync(`${__dirname}/../../assets/mail/${findUser ? "VerifyUserEmail" : "NewUserEmail"}.html`, "utf-8");
      emailBody = emailBody.replace(/{{USERNAME}}/g, savedUser.name!.split(" ")[0]).replace(/{{CODE}}/g, verificationCode);
      await this.mailService.sendMail(savedUser.email!, findUser ? "Welcome back to Systatus Live 👋" : "Welcome to Systatus Live 👋", emailBody)

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

  @Patch("/code-verifications")
  async verifyCode(@Body() body) {
    const findUser = await this.userRepository.findOne({
      where: {
        verified: false,
        verification_code: body.code
      }
    })

    if (!findUser) {
      throw new UnauthorizedException("Invalid code.");
    }

    const userRepository = this.dataSource.getRepository(UserEntity);
    await userRepository.save({
      id: findUser.id,
      verified: true,
      verification_code: null
    })

    return {
      message: "Code validated successfully."
    }
  }

  @Post("/signin")
  async signin(@Body() body) {
    let accessToken = "";

    switch (body.type) {
      case SigninTypeEnum.EMAIL_PASSWORD:
        const findUser = await this.userRepository.findOne({
          where: {
            email: body.email
          }
        })

        if (!findUser || !this.authService.bcryptCompareSync(findUser.password, body.password)) {
          throw new UnauthorizedException("Incorrect e-mail or password.");
        }

        accessToken = this.authService.generateJWT({
          user: findUser.id
        });

        break;
      default:
        throw new NotImplementedException("Sign in type is not supported.");
    }

    return {
      message: "Authorized",
      data: {
        access_token: accessToken
      }
    }
  }
}
