import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { MailService } from './services/mail.service';
import { CronService } from './services/cron.service';
import { VersioningType } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors();
  app.use(helmet());
  app.enableVersioning({
    type: VersioningType.URI
  });
  
  await app.listen(process.env.PORT ?? 3000);

  // E-mail
  const mailService = new MailService()
  mailService.configure();

  if (process.env.ENV != "DEV") {
    new MailService().verify();
  }

  // Agenda
  new CronService().configure();
}

bootstrap();
