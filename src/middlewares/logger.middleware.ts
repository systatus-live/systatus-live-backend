import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from 'src/services/auth.service';
import { RequestLogEntity } from 'src/database/entities/RequestLogEntity';
import { RequestLogStatusEnum } from 'src/types/RequestLogStatusEnum';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LoggerMiddleware.name);

  constructor(
    private authService: AuthService,
    @InjectRepository(RequestLogEntity) private requestLogRepository: Repository<RequestLogEntity>,
  ) { }

  use(request: Request, response: Response, next: NextFunction) {
    const startTime = Date.now();
    const ip = request["clientIp"];
    const userAgent = request.headers["x-user-agent"] || request.headers["user-agent"] || "Desconhecido";

    let userId: string | null = null;
    if (request.headers.authorization) {
      try {
        const decoded = this.authService.decodeJWT(request.headers.authorization.split(" ")[1]) as any;
        userId = decoded?.user ?? null;
      } catch (_) { }
    }

    this.logger.log({
      route: `${request.method} ${request.url}`,
      ip: ip,
      agent: userAgent,
      userId: userId,
    });

    response.on("finish", () => {
      try {
        const duration_api = Date.now() - startTime;

        const clientStartHeader = request.headers["x-request-start-app"];
        const duration_client = clientStartHeader ? Math.max(0, Math.round(Date.now() - parseFloat(clientStartHeader as string))) : 0;

        let payload: string | null = null;
        if (request.body && Object.keys(request.body).length > 0) {
          payload = this.authService.aesEncrypt(JSON.stringify(request.body));
        }

        this.requestLogRepository.save({
          user_id: userId,
          method: request.method,
          endpoint: request.url,
          payload: payload,
          status: response.statusCode.toString(),
          duration_client: duration_client,
          duration_api: duration_api,
          aplication: userAgent,
          platform: request.headers["x-platform"],
          version: request.headers["x-app-version"],
          ip: ip,
        } as RequestLogEntity);
      } catch (error) {
        this.logger.error("Erro ao registrar request log: " + error.message);
      }
    });

    next();
  }
}
