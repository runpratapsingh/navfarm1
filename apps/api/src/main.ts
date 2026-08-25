import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import express from 'express';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  const uploadsDir = resolve(process.env.UPLOADS_DIR || 'apps/api/uploads');
  mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(uploadsDir));

  const apiPrefix = (process.env.API_PREFIX || 'api/v1').replace(/^\/+|\/+$/g, '');
  const docsPath = (process.env.API_DOCS_PATH || 'api/docs').replace(/^\/+|\/+$/g, '');
  const corsOrigins = process.env.CORS_ORIGINS
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const isLoopbackOrigin = (origin: string) => {
    try {
      const url = new URL(origin);
      return (
        (url.protocol === 'http:' || url.protocol === 'https:') &&
        (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
      );
    } catch {
      return false;
    }
  };

  // Set global API prefix
  app.setGlobalPrefix(apiPrefix);
  
  // Use global validation pipes
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: { enableImplicitConversion: true },
  }));

  // Global exception filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Enable CORS for frontend integration
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'x-tenant-id',
      'x-company-id',
      'x-active-company-id',
      'Origin',
      'X-Requested-With',
    ],
  });

  // Configure Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('NAVFarm ERP API')
    .setDescription(
      `## Multi-Tenant Multi-Vertical Agricultural ERP Engine
      
      Welcome to the NAVFarm API documentation. This platform manages farm verticals from rearing to harvest/slaughter, automated double-entry bookkeeping, and SaaS tenant subscription isolation.
      
      ### Security & Headers
      * **Authentication**: Use the authorization token returned by \`/auth/login\` in the Authorization header: \`Bearer <token>\`.
      * **Multi-Tenancy**: All requests to operational endpoints must include the **\`x-tenant-id\`** header indicating the active tenant UUID context.`,
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  
  const customOptions = {
    customSiteTitle: 'NAVFarm ERP API Documentation',
    customCss: `
      .swagger-ui {
        background-color: #0b0f19;
        color: #c9d1d9;
      }
      .swagger-ui .topbar {
        background-color: #111827;
        border-bottom: 2px solid #1F4E79;
      }
      .swagger-ui .info .title {
        color: #f9fafb;
      }
      .swagger-ui .info p, .swagger-ui .info li, .swagger-ui .info td, .swagger-ui .info a {
        color: #9ca3af;
      }
      .swagger-ui .scheme-container {
        background-color: #111827;
        box-shadow: none;
        border: 1px solid #1f2937;
      }
      .swagger-ui select {
        background-color: #1f2937;
        color: #f9fafb;
        border: 1px solid #374151;
      }
      .swagger-ui input[type=text] {
        background-color: #1f2937;
        color: #f9fafb;
        border: 1px solid #374151;
      }
      .swagger-ui .opblock.opblock-get {
        background: rgba(16, 185, 129, 0.05);
        border-color: #10b981;
      }
      .swagger-ui .opblock.opblock-post {
        background: rgba(59, 130, 246, 0.05);
        border-color: #3b82f6;
      }
      .swagger-ui .opblock.opblock-put {
        background: rgba(245, 158, 11, 0.05);
        border-color: #f59e0b;
      }
      .swagger-ui .opblock.opblock-delete {
        background: rgba(239, 68, 68, 0.05);
        border-color: #ef4444;
      }
      .swagger-ui .opblock .opblock-summary-operation-id, .swagger-ui .opblock .opblock-summary-path, .swagger-ui .opblock .opblock-summary-path__deprecated {
        color: #f3f4f6;
      }
      .swagger-ui .opblock-description-wrapper p, .swagger-ui .opblock-external-docs-wrapper p, .swagger-ui .opblock-title_normal p {
        color: #9ca3af;
      }
      .swagger-ui .tabli button {
        color: #9ca3af;
      }
      .swagger-ui .tabli.active button {
        color: #3b82f6;
      }
      .swagger-ui .response-col_status {
        color: #f9fafb;
      }
      .swagger-ui table thead tr td, .swagger-ui table thead tr th {
        color: #9ca3af;
      }
      .swagger-ui .dialog-ux .modal-ux {
        background-color: #111827;
        border: 1px solid #374151;
      }
      .swagger-ui .dialog-ux .modal-ux-header {
        border-bottom: 1px solid #374151;
      }
      .swagger-ui .dialog-ux .modal-ux-header h3 {
        color: #f9fafb;
      }
      .swagger-ui .dialog-ux .modal-ux-content {
        color: #9ca3af;
      }
      .swagger-ui .btn {
        background-color: #1f2937;
        color: #f9fafb;
        border: 1px solid #374151;
      }
      .swagger-ui .btn.authorize {
        background-color: #10b981;
        color: #fff;
        border-color: #10b981;
      }
    `,
  };

  SwaggerModule.setup(docsPath, app, document, customOptions);

  const port = process.env.PORT ?? 2877;
  await app.listen(port);
  Logger.log(`NAVFarm API: http://localhost:${port}/${apiPrefix}`);
  Logger.log(`Swagger: http://localhost:${port}/${docsPath}`);
}
void bootstrap();
