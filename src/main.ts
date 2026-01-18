import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { VersioningType } from '@nestjs/common';
import { GlobalHttpExceptionFilter } from './http-exception.filter';
import requestIp from "request-ip";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({ origin: process.env.WEB_URL as string, methods: "GET,HEAD,PUT,PATCH,POST,DELETE" });
  app.use(helmet());
  app.use(requestIp.mw());
  app.enableVersioning({ type: VersioningType.URI });
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
