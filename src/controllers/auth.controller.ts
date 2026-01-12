import { Body, ConflictException, Controller, ForbiddenException, Get, InternalServerErrorException, NotImplementedException, Patch, Post, UnauthorizedException, UseGuards, Request } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { readFileSync } from 'fs';
import { UserEntity } from '../database/entities/UserEntity';
import { SignInTypeEnum } from '../types/SignInTypeEnum';
import { AuthService } from '../services/auth.service';
import { MailService } from '../services/mail.service';
import { DataSource, Repository } from 'typeorm';
import { OAuth2Client } from "google-auth-library";
import { AuthGuard } from '../guards/auth/auth.guard';
import { SignInOptionsDTO } from 'src/types/SignInOptionsDTO';
import axios from "axios";
import { CaptchaReasonEnum } from 'src/types/CaptchaReasonEnum';

@Controller({
  version: "1",
  path: "/auth"
})
export class AuthController {
  @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>

  constructor(
    private authService: AuthService,
    private dataSource: DataSource,
    private mailService: MailService
  ) { }

  @Post("/signup")
  async signup(@Request() request: Request, @Body() body: any) {
    const captcha = request.headers["captcha"];

    if (!captcha) {
      throw new ForbiddenException("reCAPTCHA não foi informado.");
    }

    try {
      const { data } = await axios.post(`https://recaptchaenterprise.googleapis.com/v1/projects/systatus-live/assessments?key=${process.env.GOOGLE_API_KEY}`, {
        event: {
          token: captcha,
          expectedAction: "login",
          siteKey: process.env.GOOGLE_CAPTCHA_CLIENT_ID
        }
      }, {
        headers: {
          Referer: process.env.WEB_URL
        }
      }).catch(_ => {
        throw new ForbiddenException("Falha ao validar o reCAPTCHA. Contate o suporte.");
      })

      if (data.tokenProperties.invalidReason != CaptchaReasonEnum.DUPE) {
        if (!data.tokenProperties.valid) {
          throw new ForbiddenException("reCAPTCHA inválido. Tente novamente.");
        }
      }
    } catch (error) {
      throw new ForbiddenException(error.message);
    }

    const findUser = await this.userRepository.findOne({
      where: {
        email: body.email
      }
    })

    if (findUser) {
      throw new ConflictException("Usuário já existe. Tente fazer login.");
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const verificationCode = Array.from({ length: 6 }, () => Math.floor(Math.random() * 9) + 1).join("");

      const savedUser = this.userRepository.create({
        name: body.name,
        email: body.email,
        password: null,
        acceptedTerms: body.acceptTerms,
        discovery: body.discovery,
        verified: false,
        verificationCode: verificationCode,
        avatar: null
      });

      if (body.password) {
        savedUser.password = this.authService.bcryptHashSync(body.password);
      }

      await queryRunner.manager.save(UserEntity, savedUser);

      const emailBody = readFileSync(`${__dirname}/../assets/mail/NewUserEmail.html`, "utf-8")
        .replace(/{{USERNAME}}/g, savedUser.name!.split(" ")[0])
        .replace(/{{CODE}}/g, verificationCode);
      await this.mailService.sendMail("Systatus.Live <system@systatus.live>", savedUser.email!, "Bem-vindo(a) ao Systatus Live 👋", emailBody);

      await queryRunner.commitTransaction();

      return {
        message: "Usuário criado com sucesso."
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException("Falha ao registrar o usuário.");
    } finally {
      await queryRunner.release();
    }
  }

  @Patch("/codes")
  async verifyCode(@Body() body: any) {
    const findUser = await this.userRepository.findOne({
      where: {
        verified: false,
        verificationCode: body.code
      }
    })

    if (!findUser) {
      throw new UnauthorizedException("Código inválido.");
    }

    const userRepository = this.dataSource.getRepository(UserEntity);
    await userRepository.save({
      id: findUser.id,
      verified: true,
      verificationCode: null
    })

    const accessToken = this.authService.generateJWT({
      user: findUser.id
    });

    return {
      message: "Código validado com sucesso.",
      data: {
        access_token: accessToken
      }
    }
  }

  @Post("/codes")
  async sendCode(@Body() body: any) {
    const findUser = await this.userRepository.findOne({
      where: {
        email: body.email,
      }
    })

    const defaultMsg = "Se o usuário existir, um código de verificação irá ser enviado pelo e-mail.";

    if (!findUser) {
      return {
        message: defaultMsg
      }
    }

    if (findUser.verified) {
      throw new ForbiddenException("Ação não permitida.")
    }

    const emailBody = readFileSync(`${__dirname}/../assets/mail/VerifyAccountEmail.html`, "utf-8")
      .replace(/{{USERNAME}}/g, findUser.name!.split(" ")[0])
      .replace(/{{CODE}}/g, findUser.verificationCode!);
    await this.mailService.sendMail("Systatus.Live <system@systatus.live>", findUser.email!, "Bem-vindo(a) de volta ao Systatus Live 👋", emailBody);

    return {
      message: defaultMsg
    }
  }

  @Post("/signin")
  async signin(@Body() body: SignInOptionsDTO) {
    let findUser: UserEntity | null = null;
    let defaultMsg = "Senha incorreta ou usuário não existe.";

    switch (body.type) {
      case SignInTypeEnum.EMAIL_PASSWORD:
        findUser = await this.userRepository.findOne({
          where: {
            email: body.email
          }
        })

        if (!findUser || !findUser.password || !this.authService.bcryptCompareSync(findUser.password, body.password!)) {
          throw new UnauthorizedException(defaultMsg);
        }

        if (!findUser.verified) {
          const accessToken = this.authService.generateJWT({
            user: findUser!.id
          });

          return {
            message: "E-mail ainda não foi verificado.",
            data: {
              access_token: accessToken,
              verified: false
            }
          }
        }

        break;
      case SignInTypeEnum.GOOGLE:
        try {
          const oAuth2Client = new OAuth2Client();

          const decodedGoogleToken = await oAuth2Client.verifyIdToken({
            idToken: body.google?.credential!,
            audience: process.env.GOOGLE_OAUTH_CLIENT_ID
          });

          const googleAccount = decodedGoogleToken.getPayload();

          findUser = await this.userRepository.findOne({
            where: {
              email: googleAccount?.email!
            }
          })

          if (!findUser) {
            return {
              message: "",
              data: {
                signUpSignInFlow: true, // O "signUpSignInFlow" direcionará (web) o usuário para o signUp ao fazer o signIn com alguma rede social sem estar cadastrado
                name: googleAccount?.name,
                email: googleAccount?.email
              }
            }
          }
        } catch (error) {
          throw new UnauthorizedException(error.message);
        }

        break;
      default:
        throw new NotImplementedException("Método de login não é suportado.");
    }

    const accessToken = this.authService.generateJWT({
      user: findUser!.id
    });

    return {
      message: "Autorizado",
      data: {
        access_token: accessToken
      }
    }
  }

  @Get("/verify")
  @UseGuards(AuthGuard)
  async verifyToken(@Request() request: Request) {
    const findUser = await this.userRepository.findOne({
      where: {
        id: request["loggedUser"]
      }
    })

    return {
      message: "Autorizado",
      data: {
        id: findUser?.id,
        email: findUser?.email,
        verified: findUser?.verified
      }
    }
  }

  @Post("/forgot-passwords")
  async forgetPassword(@Body() body: any) {
    const findUser = await this.userRepository.findOne({
      where: {
        email: body.email,
      }
    })

    const defaultMsg = "Se o usuário existir, uma mensagem de recuperação será enviada para o e-mail.";

    if (!findUser) {
      return {
        message: defaultMsg
      }
    }

    const accessToken = this.authService.generateJWT({
      user: findUser!.id
    }, "1h");

    const emailBody = readFileSync(`${__dirname}/../assets/mail/ForgotPassword.html`, "utf-8")
      .replace(/{{USERNAME}}/g, findUser.name!.split(" ")[0])
      .replace(/{{LINK}}/g, `${process.env.WEB_URL}/auth/reset-password?token=${accessToken}`);
    await this.mailService.sendMail("Systatus.Live <system@systatus.live>", findUser.email!, "Redefinir Senha", emailBody);

    return {
      message: defaultMsg
    }
  }

  @Patch("/reset-passwords")
  @UseGuards(AuthGuard)
  async resetPassword(@Request() request: Request, @Body() body: any) {
    try {
      await this.userRepository.update(request["loggedUser"], {
        password: this.authService.bcryptHashSync(body.password)
      })

      return {
        message: "Senha atualizada com sucesso.",
      }
    } catch (error) {
      throw new InternalServerErrorException("Falha ao atualizar a senha.");
    }
  }

  @Get("/me")
  @UseGuards(AuthGuard)
  async me(@Request() request: Request) {
    const findUser = await this.userRepository.findOne({
      where: {
        id: request["loggedUser"]
      }
    })

    return {
      data: {
        id: findUser?.id,
        name: findUser?.name,
        email: findUser?.email,
        verified: findUser?.verified,
        createdAt: findUser?.createdAt,
        updatedAt: findUser?.updatedAt,
        avatar: findUser?.avatar,
        signinType: findUser?.password ? SignInTypeEnum.EMAIL_PASSWORD : SignInTypeEnum.SOCIAL
      }
    }
  }
}
