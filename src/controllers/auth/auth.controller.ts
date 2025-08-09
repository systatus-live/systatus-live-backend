import { Body, ConflictException, Controller, ForbiddenException, InternalServerErrorException, NotImplementedException, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { readFileSync } from 'fs';
import { UserEntity } from 'src/database/entities/UserEntity';
import { SigninTypeEnum } from 'src/enums/SigninTypeEnum';
import { AuthService } from 'src/services/auth.service';
import { MailService } from 'src/services/mail.service';
import { DataSource, Repository } from 'typeorm';
import { OAuth2Client } from "google-auth-library";
import { I18n, I18nContext } from 'nestjs-i18n';

@Controller("auth")
export class AuthController {
  @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>

  constructor(
    private authService: AuthService,
    private dataSource: DataSource,
    private mailService: MailService
  ) { }

  @Post("/signup")
  async signup(@Body() body: any, @I18n() i18n: I18nContext) {
    const findUser = await this.userRepository.findOne({
      where: {
        email: body.email
      }
    })

    if (findUser) {
      throw new ConflictException(i18n.translate("messages.authController.userAlreadyExists"));
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const verificationCode = Array.from({ length: 6 }, () => Math.floor(Math.random() * 9) + 1).join("");
      const password = this.authService.bcryptHashSync(body.password);

      const savedUser = this.userRepository.create({
        name: body.name,
        email: body.email,
        password: password,
        accepted_terms: body.acceptTerms,
        discovery: body.discovery,
        verified: false,
        verification_code: verificationCode
      });

      await queryRunner.manager.save(UserEntity, savedUser);

      const emailBody = readFileSync(`${__dirname}/../../assets/mail/NewUserEmail.html`, "utf-8")
        .replace(/{{USERNAME}}/g, savedUser.name!.split(" ")[0])
        .replace(/{{CODE}}/g, verificationCode);
      await this.mailService.sendMail(savedUser.email!, "Welcome to Systatus Live 👋", emailBody);

      await queryRunner.commitTransaction();

      return {
        message: i18n.translate("messages.authController.userCreateSuccess")
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(i18n.translate("messages.authController.userCreateError"));
    } finally {
      await queryRunner.release();
    }
  }

  @Patch("/codes")
  async verifyCode(@Body() body: any, @I18n() i18n: I18nContext) {
    const findUser = await this.userRepository.findOne({
      where: {
        verified: false,
        verification_code: body.code
      }
    })

    if (!findUser) {
      throw new UnauthorizedException(i18n.translate("messages.authController.verifyCodeError"));
    }

    const userRepository = this.dataSource.getRepository(UserEntity);
    await userRepository.save({
      id: findUser.id,
      verified: true,
      verification_code: null
    })

    return {
      message: i18n.translate("messages.authController.verifyCodeSuccess")
    }
  }

  @Post("/codes")
  async sendCode(@Body() body: any, @I18n() i18n: I18nContext) {
    const findUser = await this.userRepository.findOne({
      where: {
        email: body.email,
      }
    })

    const defaultMsg = i18n.translate("messages.authController.sendCodeSuccess");

    if (!findUser) {
      return {
        message: defaultMsg
      }
    }

    if (findUser.verified) {
      throw new ForbiddenException(i18n.translate("messages.authController.sendCodeError"))
    }

    const emailBody = readFileSync(`${__dirname}/../../assets/mail/VerifyUserEmail.html`, "utf-8")
      .replace(/{{USERNAME}}/g, findUser.name!.split(" ")[0])
      .replace(/{{CODE}}/g, findUser.verification_code!);
    await this.mailService.sendMail(findUser.email!, "Welcome back to Systatus Live 👋", emailBody);

    return {
      message: defaultMsg
    }
  }

  @Post("/signin")
  async signin(@Body() body, @I18n() i18n: I18nContext) {
    let findUser: UserEntity | null = null;
    let defaultMsg = i18n.translate("messages.authController.authUserPasswordError");

    switch (body.type) {
      case SigninTypeEnum.EMAIL_PASSWORD:
        findUser = await this.userRepository.findOne({
          where: {
            email: body.email
          }
        })

        if (!findUser || !this.authService.bcryptCompareSync(findUser.password, body.password)) {
          throw new UnauthorizedException(defaultMsg);
        }

        if (!findUser.verified) {
          return {
            message: i18n.translate("messages.authController.authUserEmailVerificationError"),
            data: {
              access_token: null,
              verified: false
            }
          }
        }

        break;
      case SigninTypeEnum.GOOGLE:
        try {
          const oAuth2Client = new OAuth2Client();

          const decodedGoogleToken = await oAuth2Client.verifyIdToken({
            idToken: body.credential,
            audience: process.env.GOOGLE_CLIENT_ID
          });

          findUser = await this.userRepository.findOne({
            where: {
              email: decodedGoogleToken.getPayload()?.email!
            }
          })

          if (!findUser) {
            throw new UnauthorizedException(defaultMsg);
          }

          if (!findUser.verified) {
            const userRepository = this.dataSource.getRepository(UserEntity);
            findUser = await userRepository.save({
              id: findUser.id,
              verified: true,
              verification_code: null
            })
          }
        } catch (error) {
          throw new UnauthorizedException(defaultMsg);
        }

        break;
      default:
        throw new NotImplementedException(i18n.translate("messages.authController.authUserTypeError"));
    }

    const accessToken = this.authService.generateJWT({
      user: findUser!.id
    });

    return {
      message: "Authorized",
      data: {
        access_token: accessToken,
        verified: true
      }
    }
  }
}
