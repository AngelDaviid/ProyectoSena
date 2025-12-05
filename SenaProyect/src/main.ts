import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { existsSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // === UPLOADS ===
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // === CORS ===
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((url) => url.trim())
    : ['http://localhost:5173'];

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // === VALIDACIÓN ===
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  // === SWAGGER ===
  const config = new DocumentBuilder()
    .setTitle('API SenaConnect')
    .setDescription('API del proyecto SenaConnect')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // === SEGURIDAD ===
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.use(
    rateLimit({
      windowMs: 1 * 60 * 1000,
      max: 1000,
      message: 'Demasiadas peticiones, intenta más tarde',
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  // === SERVIR FRONTEND SOLO SI EXISTE EL BUILD ===
  const frontendDist = join(__dirname, '..', '..', 'frontend', 'dist');

  if (existsSync(frontendDist)) {
    console.log('➡️ Producción detectada: sirviendo frontend desde dist/');

    app.useStaticAssets(frontendDist);

    // Fallback para SPA
    app.use((req, res, next) => {
      if (
        req.method === 'GET' &&
        !req.path.startsWith('/api') &&
        !req.path.startsWith('/uploads') &&
        !req.path.startsWith('/docs') &&
        !req.path.startsWith('/ws') &&
        !req.path.startsWith('/socket.io') &&
        !req.path.includes('.') // evita tratar assets como rutas
      ) {
        res.sendFile(join(frontendDist, 'index.html'));
      } else {
        next();
      }
    });
  } else {
    console.log('➡️ Modo desarrollo: NO se sirve frontend');
  }

  // === PORT ===
  const port = process.env.PORT || 3001;
  await app.listen(port);

  console.log(`🚀 Backend corriendo en http://localhost:${port}`);
}

bootstrap();
