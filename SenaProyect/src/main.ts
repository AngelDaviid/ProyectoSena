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

  // Servir archivos estáticos (uploads)
  app.useStaticAssets(join(__dirname, '..', 'uploads'), { prefix: '/uploads/' });

  // Servir el frontend (asegúrate el path corresponde con el build de React/Vite)
  const frontendDist = join(__dirname, '..', '..', 'frontend', 'dist'); // Ajusta el path si no corresponde
  if (existsSync(frontendDist)) {
    app.useStaticAssets(frontendDist, {
      prefix: '/',
    });

    // SPA fallback: devolver index.html para rutas desconocidas
    app.use((req, res, next) => {
      if (
        req.method === 'GET' &&
        !req.path.startsWith('/api') &&
        !req.path.startsWith('/uploads') &&
        !req.path.startsWith('/docs') &&
        !req.path.startsWith('/ws') &&
        !req.path.startsWith('/socket.io')
      ) {
        res.sendFile(join(frontendDist, 'index.html'));
      } else {
        next();
      }
    });
  }

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false,
    transformOptions: { enableImplicitConversion: true },
  }));

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const config = new DocumentBuilder()
    .setTitle('Blog API')
    .setDescription('API para manejar publicaciones con imágenes y categorías')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : ['http://localhost:5173'];

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  app.use(rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 1000,
    message: 'Demasiadas peticiones, intenta de nuevo más tarde',
    standardHeaders: true,
    legacyHeaders: false,
  }));

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
  console.log(`📁 Archivos estáticos disponibles en http://localhost:${port}/uploads`);
  if (existsSync(frontendDist)) {
    console.log(`🌐 Frontend servido desde ${frontendDist}`);
  }
}

bootstrap();
