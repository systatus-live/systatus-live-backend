import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../services/auth.service';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../../database/entities/UserEntity';
import { Repository } from 'typeorm';
import { SubscriptionEntity } from '../../database/entities/SubscriptionEntity';

@Injectable()
export class AuthGuard implements CanActivate {
  @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>
  @InjectRepository(SubscriptionEntity) private subscriptionRepository: Repository<SubscriptionEntity>

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
        id: request["loggedUser"]
      },
      select: ["id"]
    })

    if (!user) {
      throw new UnauthorizedException("Usuário não encontrado ou não existe mais. Contate o suporte.");
    }

    const subscription = await this.subscriptionRepository.findOne({
      where: {
        userId: user.id,
        active: true
      },
      select: ["id", "planId"]
    })

    if (!subscription) {
      throw new ForbiddenException("Assinatura não encontrada. Contate o suporte.")
    }

    request["loggedUser"] = jwtData.user;
    request["loggedSubscription"] = subscription.id;
    request["loggedPlan"] = subscription.planId;

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers["authorization"]?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}