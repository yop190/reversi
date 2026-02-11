import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GameGateway } from './game/game.gateway';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { ScoreModule } from './score/score.module';
import { GameModule } from './game/game.module';
import { McpModule } from './mcp/mcp.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    AuthModule,
    ScoreModule,
    GameModule,
    McpModule,
  ],
  controllers: [HealthController],
  providers: [GameGateway],
})
export class AppModule { }
