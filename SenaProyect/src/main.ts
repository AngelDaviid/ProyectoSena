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

  // === CORS MEJORADO ===
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(','). map((url) => url.trim())
    : [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://proyectosena-gkx1.onrender.com',
    ];

  app.enableCors({
    origin: (origin, callback) => {
      // ✅ Permitir requests sin origin (Postman, curl, mobile)
      if (!origin) return callback(null, true);

      // ✅ Verificar si el origin está permitido
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // ✅ En desarrollo, permitir localhost con cualquier puerto
      if (process.env. NODE_ENV !== 'production' && origin.includes('localhost')) {
        return callback(null, true);
      }

      console.warn(`❌ CORS blocked: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
    ], // ✅ Agregados más headers
    exposedHeaders: ['Authorization'], // ✅ Exponer header de autorización
    credentials: true,
    maxAge: 3600,
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
    . setTitle('API SenaConnect')
    .setDescription('API del proyecto SenaConnect')
    . setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule. createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // === SEGURIDAD ===
  app. use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false, // ✅ Desactivar CSP para desarrollo
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
        ! req.path.startsWith('/api') &&
        !req.path. startsWith('/uploads') &&
        !req.path. startsWith('/docs') &&
        !req.path. startsWith('/ws') &&
        !req.path. startsWith('/socket.io') &&
        !req.path. includes('. ')
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
  console.log(`📡 CORS habilitado para:`, allowedOrigins);
  console.log(`📚 Documentación disponible en http://localhost:${port}/docs`);
}

bootstrap();
