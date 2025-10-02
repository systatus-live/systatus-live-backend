import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { AuthService } from '../../services/auth.service';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from 'src/database/entities/UserEntity';
import { Repository } from 'typeorm';

@Injectable()
export class AuthGuard implements CanActivate {
  @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>

  constructor(
    private authService: AuthService,
    private i18nService: I18nService
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException(this.i18nService.translate("translate.httpStatus.unauthorized"));
    }

    try {
      const payload = await this.authService.verifyJWT(token);
      request["loggedUser"] = payload.user;
    } catch (error) {
      throw new UnauthorizedException(this.i18nService.translate("translate.httpStatus.unauthorized"));
    }

    const findUser = await this.userRepository.findOne({
      where: {
        id: request["loggedUser"]
      }
    })

    if (!findUser) {
      throw new UnauthorizedException(this.i18nService.translate("translate.httpStatus.unauthorized"));
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers["authorization"]?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}