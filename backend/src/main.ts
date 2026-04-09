import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // 1. ENABLE CORS for local frontend ports and optional env override.
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3010',
    config.get<string>('FRONTEND_URL'),
  ].filter((origin): origin is string => Boolean(origin));

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 2. Setup Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // 3. Setup Global Auth Guard
  const reflector = app.get(Reflector);
  //app.useGlobalGuards(new JwtAuthGuard(reflector));

  const port = config.get<number>('port') ?? 3001;
  await app.listen(port);
  console.log(`FinXpert API running on http://localhost:${port}`);
}

bootstrap();