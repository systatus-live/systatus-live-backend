import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../database/entities/UserEntity';
import { In, Repository } from 'typeorm';
import { SubscriptionEntity } from '../database/entities/SubscriptionEntity';
import { SubscriptionStatusEnum } from 'src/types/SubscriptionStatusEnum';

/**
 * Versão permissiva do AuthGuard para o endpoint de checkout.
 * Aceita ACTIVE, FREE e EXPIRED — o usuário precisa poder assinar mesmo com a assinatura vencida.
 */
@Injectable()
export class CheckoutGuard implements CanActivate {
  @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>
  @InjectRepository(SubscriptionEntity) private subscriptionRepository: Repository<SubscriptionEntity>

  constructor(private authService: AuthService) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException("Não autorizado.");
    }

    let jwtData: any = null;

    try {
      jwtData = await this.authService.verifyJWT(token);
    } catch {
      throw new UnauthorizedException("Não autorizado.");
    }

    const user = await this.userRepository.findOne({
      where: { id: jwtData.user },
      select: ["id"]
    });

    if (!user) {
      throw new UnauthorizedException("Usuário não encontrado ou não existe mais. Contate o suporte.");
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: {
        user_id: user.id,
        status: In([SubscriptionStatusEnum.ACTIVE, SubscriptionStatusEnum.FREE, SubscriptionStatusEnum.EXPIRED])
      },
      select: ["id", "plan_id"],
      order: { created_at: "DESC" }
    });

    request["loggedUser"] = jwtData.user;
    request["loggedSubscription"] = subscription?.id ?? null;
    request["loggedPlan"] = subscription?.plan_id ?? null;

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers["authorization"]?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
