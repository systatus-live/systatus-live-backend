import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { ConsoleLogger, VersioningType } from '@nestjs/common';
import { GlobalHttpExceptionFilter } from './http-exception.filter';
import requestIp from "request-ip";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: new ConsoleLogger({
      prefix: "Default",
    })
  });

  app.enableCors({
    origin: [process.env.WEB_URL],
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true
  });
  app.use(helmet());
  app.use(requestIp.mw());
  app.enableVersioning({ type: VersioningType.URI });
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
