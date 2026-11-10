import 'reflect-metadata';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { BackupController, BackupStore } from './backup';

@Controller('health')
class HealthController {
  @Get()
  check() {
    return { status: 'ok', service: 'treino-api' };
  }
}

@Module({ controllers: [HealthController, BackupController], providers: [BackupStore] })
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('v1');
  app.useBodyParser('json', { limit: '2mb' });
  if (process.env.WEB_ORIGIN) {
    app.enableCors({ origin: process.env.WEB_ORIGIN, methods: ['GET', 'POST'], allowedHeaders: ['Authorization', 'Content-Type'] });
  }
  await app.listen(Number(process.env.PORT ?? 3000));
}

void bootstrap();
