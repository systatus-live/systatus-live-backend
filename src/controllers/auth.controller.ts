import { Body, ConflictException, Controller, ForbiddenException, Get, InternalServerErrorException, NotFoundException, NotImplementedException, Param, Patch, Post, Request, UnauthorizedException, UseGuards } from '@nestjs/common';
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';
import { InjectRepository } from '@nestjs/typeorm';
import { readFileSync } from 'fs';
import { OAuth2Client } from "google-auth-library";
import momentTz from 'moment-timezone';
import { SubscriptionEntity } from 'src/database/entities/SubscriptionEntity';
import { SubscriptionStatusEnum } from 'src/types/SubscriptionStatusEnum';
import { DataSource, Repository } from 'typeorm';
import { AuthFlowEntity } from '../database/entities/AuthFlowEntity';
import { PlanEntity } from '../database/entities/PlanEntity';
import { UserEntity } from '../database/entities/UserEntity';
import { AuthGuard } from '../middlewares/auth.guard';
import { AuthService } from '../services/auth.service';
import { MailService } from '../services/mail.service';
import { PlanEnum } from '../types/PlanEnum';
import { SignInOptionsDTO } from '../types/SignInOptionsDTO';
import { SignInTypeEnum } from '../types/SignInTypeEnum';
import formatDate from '../utils/formatDate';

@UseGuards(ThrottlerGuard)
@Controller({
  version: "1",
  path: "/auth"
})
export class AuthController {
  @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>
  @InjectRepository(AuthFlowEntity) private authFlowRepository: Repository<AuthFlowEntity>
  @InjectRepository(SubscriptionEntity) private subscriptionRepository: Repository<SubscriptionEntity>
  @InjectRepository(PlanEntity) private planRepository: Repository<PlanEntity>

  constructor(
    private authService: AuthService,
    private dataSource: DataSource,
    private mailService: MailService,
  ) { }

  @Post("/signup")
  async signup(@Body() body: any) {
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
        accepted_terms: body.acceptTerms,
        discovery: body.discovery,
        verified: false,
        verification_code: verificationCode,
        avatar: null
      });
      await queryRunner.manager.save(UserEntity, savedUser);

      const emailBody = readFileSync(`${__dirname}/../assets/mail/NewUserEmail.html`, "utf-8")
        .replace(/{{USERNAME}}/g, savedUser.name!.split(" ")[0])
        .replace(/{{CODE}}/g, verificationCode);
      await this.mailService.sendMail("Systatus.Live <systatus@artcode.dev>", savedUser.email!, "Bem-vindo(a) ao Systatus Live 👋", emailBody);

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
  async verifyCode(@Request() request: Request, @Body() body: any) {
    const findUser = await this.userRepository.findOne({
      where: {
        verified: false,
        verification_code: body.code
      }
    })

    if (!findUser) {
      throw new UnauthorizedException("Código inválido.");
    }

    const plan = await this.planRepository.findOne({
      where: { name: PlanEnum.ANDORINHA },
      select: ["id"]
    });

    if (!plan) {
      throw new InternalServerErrorException("Falha ao verificar o código.");
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const dateFormat = "YYYY-MM-DD HH:mm:ssZ";
      const now = momentTz().tz("America/Sao_Paulo");

      await queryRunner.manager.save(UserEntity, {
        id: findUser.id,
        verified: true,
        verification_code: null
      });

      await queryRunner.manager.save(SubscriptionEntity, {
        user_id: findUser.id,
        plan_id: plan.id,
        status: SubscriptionStatusEnum.FREE,
        gateway_id: null,
        start_date: formatDate(now, dateFormat),
        end_date: null,
      });

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException("Falha ao verificar o código.");
    } finally {
      await queryRunner.release();
    }

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
      .replace(/{{CODE}}/g, findUser.verification_code!);
    await this.mailService.sendMail("Systatus.Live <systatus@artcode.dev>", findUser.email!, "Bem-vindo(a) de volta ao Systatus Live 👋", emailBody);

    return {
      message: defaultMsg
    }
  }

  @Post("/signin")
  async signin(@Request() request: Request, @Body() body: SignInOptionsDTO) {
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

  @SkipThrottle()
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
    await this.mailService.sendMail("Systatus.Live <systatus@artcode.dev>", findUser.email!, "Redefinir Senha", emailBody);

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

  @SkipThrottle()
  @Get("/me")
  @UseGuards(AuthGuard)
  async me(@Request() request: Request) {
    const [findUser, subscription, permissionList] = await Promise.all([
      this.userRepository.findOne({
        where: {
          id: request["loggedUser"]
        }
      }),
      this.subscriptionRepository.findOne({
        where: {
          id: request["loggedSubscription"]
        },
        select: ["status", "end_date"]
      }),
      this.authService.getPermissionList(request["loggedPlan"])
    ]);

    return {
      data: {
        id: findUser?.id,
        name: findUser?.name,
        email: findUser?.email,
        verified: findUser?.verified,
        createdAt: findUser?.created_at,
        updatedAt: findUser?.updated_at,
        avatar: findUser?.avatar,
        signinType: findUser?.password ? SignInTypeEnum.EMAIL_PASSWORD : SignInTypeEnum.SOCIAL,
        permissionList,
        subscription: {
          status: subscription?.status,
          endDate: subscription?.end_date
        }
      }
    }
  }

  @Get("/flows/:id")
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
