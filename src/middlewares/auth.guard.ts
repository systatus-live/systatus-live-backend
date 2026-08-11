import { CanActivate, ExecutionContext, ForbiddenException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import momentTz from 'moment-timezone';
import { AuthService } from '../services/auth.service';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../database/entities/UserEntity';
import { In, Repository } from 'typeorm';
import { SubscriptionEntity } from '../database/entities/SubscriptionEntity';
import { SubscriptionStatusEnum } from 'src/types/SubscriptionStatusEnum';
import { AuthFlowEntity } from 'src/database/entities/AuthFlowEntity';

@Injectable()
export class AuthGuard implements CanActivate {
  @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>
  @InjectRepository(SubscriptionEntity) private subscriptionRepository: Repository<SubscriptionEntity>
  @InjectRepository(AuthFlowEntity) private authFlowRepository: Repository<AuthFlowEntity>

  constructor(
    private authService: AuthService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException("Não autorizado.");
    }

    let jwtData: any = null;

    try {
      jwtData = await this.authService.verifyJWT(token);
    } catch (error) {
      throw new UnauthorizedException("Não autorizado.");
    }

    const user = await this.userRepository.findOne({
      where: {
        id: jwtData.user
      },
      select: ["id", "verified", "email"]
    })

    if (!user) {
      throw new UnauthorizedException("Usuário não encontrado ou não existe mais. Contate o suporte.");
    }

    if (!user.verified) {
      const authFlow = await this.authFlowRepository.save({
        object: JSON.stringify({
          email: user?.email,
          needVerifyFlow: true
        })
      })
      throw new HttpException({
        needVerifyFlow: true, // O "needVerifyFlow" direcionará (web) o usuário para a verificação de token (por ex.: usuário fechou o OTP e tentou logar depois)
        authFlowId: authFlow.id
      }, HttpStatus.FORBIDDEN);
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: {
        user_id: user.id,
        status: In([SubscriptionStatusEnum.ACTIVE, SubscriptionStatusEnum.FREE, SubscriptionStatusEnum.EXPIRED])
      },
      select: ["id", "plan_id", "status", "end_date"],
      order: {
        created_at: "DESC"
      }
    })

    if (!subscription) {
      throw new ForbiddenException("Assinatura não encontrada. Contate o suporte.")
    }

    if (subscription.status === SubscriptionStatusEnum.EXPIRED) {
      // TODO
    }

    request["loggedUser"] = jwtData.user;
    request["loggedSubscription"] = subscription.id;
    request["loggedPlan"] = subscription.plan_id;

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers["authorization"]?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}