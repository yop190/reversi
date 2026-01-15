import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        // eslint-disable-next-line security/detect-unsafe-regex
        const allowedPatterns = [
          /^http:\/\/localhost(:\d+)?$/, // localhost with any port
          /^https:\/\/reversi\.lebrere\.fr$/, // custom domain
          /^https:\/\/.*\.azurecontainerapps\.io$/, // any Azure Container Apps
        ];

        const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
        callback(null, isAllowed);
      },
      credentials: true,
    },
  });

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🎮 Reversi Server running on port ${port}`);
  console.log(`📡 WebSocket server ready for connections`);
}

bootstrap();
