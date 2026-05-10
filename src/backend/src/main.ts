import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';

async function bootstrap() {
    const logger = new Logger('Bootstrap');

    const app = await NestFactory.create(AppModule);

    app.enableCors({
        origin: true,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
        allowedHeaders: 'Content-Type, Accept, Authorization, X-Impersonate'
    });

    // Response Compression with Gzip, Deflate and Brotli support
    app.use(compression());

    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

    const config = new DocumentBuilder()
        .setTitle('Legacy Calendar API')
        .setDescription('The legacy calendar server API description')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    const port = process.env.PORT ?? 3000;
    await app.listen(port);

    logger.log(`Application is running on: http://localhost:${port}`);
}

bootstrap().catch((err) => {
    const logger = new Logger('Bootstrap');
    logger.error('Error starting application', err instanceof Error ? err.stack : err);
});
