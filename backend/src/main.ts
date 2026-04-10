import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, RequestMethod } from '@nestjs/common';
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
    'http://localhost:3020',
    'http://127.0.0.1:3020',
    'http://127.0.0.1:3000',
    'https://fin-xpert-eight.vercel.app',
    config.get<string>('FRONTEND_URL'),
  ].filter((origin): origin is string => Boolean(origin));

  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
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
  const port = Number(config.get('PORT') ?? config.get('port') ?? 3001) || 3001;
  // Dev: omit host so Node binds IPv6 (::) when available — fixes browsers resolving
  // "localhost" to ::1 while the API was only on 0.0.0.0 (IPv4).
  const listenHost =
    config.get<string>('LISTEN_HOST') ??
    config.get<string>('listenHost') ??
    (process.env.NODE_ENV === 'production' ? '0.0.0.0' : undefined);

  try {
    if (listenHost) {
      await app.listen(port, listenHost);
    } else {
      await app.listen(port);
    }
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException;
    if (e?.code === 'EADDRINUSE') {
      console.error(
        `\n❌ Port ${port} is already in use. Another process (often Next.js) must not use the API port.\n` +
          `   Run the frontend on 3020: cd frontend && npm run dev\n`,
      );
    }
    throw err;
  }
  const bound = listenHost ?? '(default, IPv4+IPv6 where supported)';
  console.log(`🚀 FinXpert API is live on http://127.0.0.1:${port}/api  (bound ${bound})`);
  console.log(`✅ Allowed Origins: ${allowedOrigins.join(', ')}`);
}

bootstrap().catch((err) => {
  console.error('FinXpert API failed to start:', err);
  process.exit(1);
});