import { Injectable } from '@nestjs/common';
import { PlayerInfo } from '../../../shared/game.types';

@Injectable()
export class PlayerService {
  private players: Map<string, PlayerInfo> = new Map();

  createPlayer(socketId: string): PlayerInfo {
    const player: PlayerInfo = {
      id: socketId,
      username: `Guest_${socketId.substring(0, 6)}`,
      isSpectator: true,
    };
    this.players.set(socketId, player);
    return player;
  }

  getPlayer(socketId: string): PlayerInfo | undefined {
    return this.players.get(socketId);
  }

  setUsername(socketId: string, username: string): PlayerInfo | undefined {
    const player = this.players.get(socketId);
    if (player) {
      player.username = username.trim().substring(0, 20) || player.username;
      return player;
    }
    return undefined;
  }

  removePlayer(socketId: string): PlayerInfo | undefined {
    const player = this.players.get(socketId);
    this.players.delete(socketId);
    return player;
  }

  getOnlineCount(): number {
    return this.players.size;
  }

  getAllPlayers(): PlayerInfo[] {
    return Array.from(this.players.values());
  }
}
