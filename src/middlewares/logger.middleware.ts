import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from 'src/services/auth.service';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggerMiddleware.name);

  constructor(
    private authService: AuthService,
  ) { }

  use(request: Request, response: Response, next: NextFunction) {
    const ip = request["clientIp"];
    const userAgent = request.headers["x-user-agent"] || request.headers["user-agent"] || "Desconhecido";

    let auth = {};
    if (request.headers.authorization) {
      try {
        auth = this.authService.decodeJWT(request.headers.authorization.split(" ")[1]);
      } catch (_) { }
    }

    this.logger.log({
      route: `${request.method} ${request.url}`,
      ip: ip,
      agent: userAgent,
      auth: JSON.stringify(auth)
    });
    next();
  }
}