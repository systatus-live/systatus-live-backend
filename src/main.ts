import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors();
  app.use(helmet());
  app.enableVersioning({
    type: VersioningType.URI
  });
  
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
