import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import compression from 'compression';

async function bootstrap() {
    const logger = new Logger('Bootstrap');
    const httpsOptions = getHttpsOptions(logger);

    const app = await NestFactory.create(AppModule, {
        httpsOptions
    });

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

    const protocol = httpsOptions ? 'https' : 'http';
    logger.log(`Application is running on: ${protocol}://localhost:${port}`);
}

function getHttpsOptions(logger: Logger) {
    const keyPath = process.env.SSL_KEY_PATH;
    const certPath = process.env.SSL_CERT_PATH;

    if (keyPath && certPath) {
        try {
            const keyFile = path.resolve(process.cwd(), keyPath);
            const certFile = path.resolve(process.cwd(), certPath);

            if (fs.existsSync(keyFile) && fs.existsSync(certFile)) {
                logger.log(`SSL configuration found. Loading certificates...`);
                return {
                    key: fs.readFileSync(keyFile),
                    cert: fs.readFileSync(certFile)
                };
            } else {
                const missing: string[] = [];
                if (!fs.existsSync(keyFile)) missing.push(keyFile);
                if (!fs.existsSync(certFile)) missing.push(certFile);
                logger.warn(`SSL paths provided but files not found: ${missing.join(', ')}. Falling back to HTTP.`);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const errorStack = error instanceof Error ? error.stack : undefined;
            logger.error(`Error loading SSL certificates, falling back to HTTP. ${errorMessage}`, errorStack);
        }
    }

    return undefined;
}

bootstrap().catch((err) => {
    const logger = new Logger('Bootstrap');
    logger.error('Error starting application', err instanceof Error ? err.stack : err);
});
