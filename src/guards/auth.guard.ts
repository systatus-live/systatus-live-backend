import { CanActivate, ExecutionContext, Injectable, Request, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserEntity } from '../database/entities/UserEntity';
import { DataSource } from 'typeorm';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private datasource: DataSource
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException("Unauthorized.");
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);

      const userRepository = this.datasource.getRepository(UserEntity);
      const findUser = await userRepository.findOne({
        where: {
          id: payload.user
        }
      })

       request.headers["logged_user_id"] = findUser.id;
    } catch (error) {
      throw new UnauthorizedException("Unauthorized. Please try to log in again.");
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers["authorization"]?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
