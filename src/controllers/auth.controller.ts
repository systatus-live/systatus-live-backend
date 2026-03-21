import { Body, ConflictException, Controller, ForbiddenException, Get, InternalServerErrorException, NotFoundException, NotImplementedException, Param, Patch, Post, Request, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InjectRepository } from '@nestjs/typeorm';
import { readFileSync } from 'fs';
import { OAuth2Client } from "google-auth-library";
import { SubscriptionService } from 'src/services/subscription.service';
import { DataSource, Repository } from 'typeorm';
import { AuthFlowEntity } from '../database/entities/AuthFlowEntity';
import { PlanEntity } from '../database/entities/PlanEntity';
import { UserEntity } from '../database/entities/UserEntity';
import { AuthGuard } from '../guards/auth/auth.guard';
import { AuthService } from '../services/auth.service';
import { MailService } from '../services/mail.service';
import { PlanEnum } from '../types/PlanEnum';
import { SignInOptionsDTO } from '../types/SignInOptionsDTO';
import { SignInTypeEnum } from '../types/SignInTypeEnum';

@Controller({
  version: "1",
  path: "/auth"
})
export class AuthController {
  @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>
  @InjectRepository(AuthFlowEntity) private authFlowRepository: Repository<AuthFlowEntity>
  @InjectRepository(PlanEntity) private planRepository: Repository<PlanEntity>

  constructor(
    private authService: AuthService,
    private dataSource: DataSource,
    private mailService: MailService,
    private subscriptionService: SubscriptionService
  ) { }

  @Post("/signup")
  @Throttle({})
  async signup(@Request() request: Request, @Body() body: any) {
    await this.authService.verifyCaptcha(request.headers["captcha"]).catch(error => {
      throw new ForbiddenException(error.message);
    })

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
        password: body.password ? this.authService.bcryptHashSync(body.password) : null,
        acceptedTerms: body.acceptTerms,
        discovery: body.discovery,
        verified: false,
        verificationCode: verificationCode,
        avatar: null
      });
      await queryRunner.manager.save(UserEntity, savedUser);

      const plan = await this.planRepository.findOne({
        where: {
          name: PlanEnum.ANDORINHA
        }
      })

      if (!plan) {
        throw new Error("Plano não encontrado. Contate o suporte.");
      }

      await this.subscriptionService.createSubscription(queryRunner, savedUser.id, plan.id);

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
  @Throttle({})
  async verifyCode(@Request() request: Request, @Body() body: any) {
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

    await this.authService.authLog(findUser.id, request).catch(error => console.log(`[Auth log error]: ${error.message}`));

    return {
      message: "Código validado com sucesso.",
      data: {
        access_token: accessToken
      }
    }
  }

  @Post("/codes")
  @Throttle({})
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
  @Throttle({})
  async signin(@Request() request: Request, @Body() body: SignInOptionsDTO) {
    let findUser: UserEntity | null = null;
    let defaultMsg = "Senha incorreta ou usuário não existe.";

    switch (body.type) {
      case SignInTypeEnum.EMAIL_PASSWORD:
        await this.authService.verifyCaptcha(request.headers["captcha"]).catch(error => {
          throw new ForbiddenException(error.message);
        })

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
          }).catch(_ => {
            throw new Error("Falha ao validar a conta. Contate o suporte.");
          });

          const googleAccount = decodedGoogleToken.getPayload();

          findUser = await this.userRepository.findOne({
            where: {
              email: googleAccount?.email!
            }
          })

          if (!findUser) {
            const authFlow = await this.authFlowRepository.save({
              object: JSON.stringify({
                name: googleAccount?.name,
                email: googleAccount?.email,
                signUpSignInFlow: true
              })
            })
            return {
              message: "Cadastro necessário.",
              data: {
                signUpSignInFlow: true, // O "signUpSignInFlow" direcionará (web) o usuário para o signUp ao fazer o signIn com alguma rede social sem estar cadastrado
                authFlowId: authFlow.id
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

    await this.authService.authLog(findUser.id, request).catch(error => console.log(`[Auth log error]: ${error.message}`));

    return {
      message: "Autorizado",
      data: {
        access_token: accessToken
      }
    }
  }

  @Get("/verify")
  @UseGuards(AuthGuard)
  @Throttle({})
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
  @Throttle({})
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
  @Throttle({})
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
  @Throttle({})
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

  @Get("/flows/:id")
  @Throttle({})
  async getFlowId(@Param("id") flowId: string) {
    const findAuthFlow = await this.authFlowRepository.findOne({
      where: {
        id: flowId
      }
    })

    if (!findAuthFlow) {
      throw new NotFoundException("Flow não encontrado.");
    }

    return JSON.parse(findAuthFlow.object);
  }
}
