import { NestFactory } from '@nestjs/core';
import { ValidationPipe, RequestMethod } from '@nestjs/common';
import type { Application, NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

/** HTML + JSON landing for GET / — Express runs this before Nest routing (Render opens `/` in the browser). */
function attachApiRootPage(expressApp: Application, config: ConfigService) {
  expressApp.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      return next();
    }
    const path = req.path || req.url?.split('?')[0] || '';
    if (path !== '/') {
      return next();
    }
    const frontendUrl = config.get<string>('FRONTEND_URL')?.trim();
    const accept = req.headers.accept ?? '';
    if (accept.includes('text/html')) {
      const link = frontendUrl
        ? `<p><a href="${frontendUrl}">Open FinXpert app →</a></p>`
        : '<p>Set <code>FRONTEND_URL</code> on Render to your Vercel URL for a direct link.</p>';
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>FinXpert API</title><style>body{font-family:system-ui,sans-serif;max-width:40rem;margin:2rem auto;padding:0 1rem;line-height:1.5;color:#0f172a}code{background:#f1f5f9;padding:0 .2rem;border-radius:4px}a{color:#4f46e5}</style></head><body><h1>FinXpert API</h1><p>Backend is running. The web dashboard is not hosted on this URL.</p>${link}<p><a href="/health">Health</a> · API: <code>/api</code></p></body></html>`;
      res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(html);
      return;
    }
    res.status(200).json({
      service: 'FinXpert API',
      status: 'ok',
      message:
        'This host runs the backend only. Open your deployed Next.js app for the FinXpert UI.',
      frontend: frontendUrl || null,
      endpoints: {
        health: 'GET /health',
        api: 'GET /api/* (e.g. /api/dashboard/summary)',
      },
    });
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // 1. CORS — local dev, *.vercel.app, known prod URLs, CORS_ORIGINS, FRONTEND_URL
  const extraFromEnv = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const explicitAllow = new Set(
    [
      'http://localhost:3000',
      'http://localhost:3010',
      'http://localhost:3020',
      'http://127.0.0.1:3020',
      'http://127.0.0.1:3000',
      'https://fin-xpert-eight.vercel.app',
      'https://fin-xpert-nu.vercel.app',
      config.get<string>('FRONTEND_URL'),
      ...extraFromEnv,
    ].filter((o): o is string => Boolean(o)),
  );

  app.enableCors({
    origin: (origin, cb) => {
      if (!origin) {
        return cb(null, true);
      }
      if (explicitAllow.has(origin)) {
        return cb(null, true);
      }
      try {
        const host = new URL(origin).hostname;
        if (host === 'localhost' || host.endsWith('.vercel.app')) {
          return cb(null, true);
        }
      } catch {
        // ignore bad origin
      }
      return cb(null, false);
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // After CORS: landing page for GET / (Nest global prefix cannot reliably exclude `/`)
  attachApiRootPage(app.getHttpAdapter().getInstance() as Application, config);

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

  // No global JWT guard — public demo API (per-route @Public() where marked).

  // PORT CONFIGURATION
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
  const renderPublic = process.env.RENDER_EXTERNAL_URL?.replace(/\/$/, '');
  const apiHint = renderPublic
    ? `${renderPublic}/api`
    : `http://127.0.0.1:${port}/api`;
  console.log(`🚀 FinXpert API — ${apiHint}  (port ${port}, ${bound})`);
  console.log(
    `✅ CORS: explicit [${[...explicitAllow].join(', ')}] + *.vercel.app + localhost`,
  );
}

bootstrap().catch((err) => {
  console.error('FinXpert API failed to start:', err);
  process.exit(1);
});