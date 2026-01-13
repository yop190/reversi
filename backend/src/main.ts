import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: ['http://localhost:4200', 'http://localhost:4201', 'http://localhost'],
      credentials: true,
    },
  });
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🎮 Reversi Server running on http://localhost:${port}`);
}

bootstrap();
