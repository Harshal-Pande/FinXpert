import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // 1. DYNAMIC CORS CONFIGURATION
  // This allows local dev and your production Vercel deployment
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3010',
    'https://fin-xpert-eight.vercel.app', 
    config.get<string>('FRONTEND_URL'),
  ].filter((origin): origin is string => Boolean(origin));

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // 2. SETUP GLOBAL VALIDATION
  // Ensures incoming data matches our DTOs strictly
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // 3. SETUP GLOBAL AUTH GUARD
  const reflector = app.get(Reflector);
  // app.useGlobalGuards(new JwtAuthGuard(reflector)); // Uncomment when ready for JWT

  // 4. PORT CONFIGURATION
  // Render usually provides a PORT env var; we fallback to 3001
  const port = config.get<number>('PORT') || config.get<number>('port') || 3001;
  
  await app.listen(port, '0.0.0.0'); // Adding '0.0.0.0' helps Render binding
  console.log(`🚀 FinXpert API is live on port: ${port}`);
  console.log(`✅ Allowed Origins: ${allowedOrigins.join(', ')}`);
}

bootstrap();