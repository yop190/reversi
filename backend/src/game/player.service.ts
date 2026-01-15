import { Injectable } from '@nestjs/common';
import { PlayerInfo } from '../../../shared/game.types';

interface ExtendedPlayerInfo extends PlayerInfo {
  odataId?: string;
  odataEtag?: string;
  odataEditLink?: string;
  userId?: string; // Authenticated user ID
}

@Injectable()
export class PlayerService {
  private players: Map<string, ExtendedPlayerInfo> = new Map();

  createPlayer(socketId: string, username?: string, userId?: string): ExtendedPlayerInfo {
    const player: ExtendedPlayerInfo = {
      id: socketId,
      username: username || `Guest_${socketId.substring(0, 6)}`,
      isSpectator: true,
      userId: userId,
    };
    this.players.set(socketId, player);
    return player;
  }

  getPlayer(socketId: string): ExtendedPlayerInfo | undefined {
    return this.players.get(socketId);
  }

  setUsername(socketId: string, username: string): ExtendedPlayerInfo | undefined {
    const player = this.players.get(socketId);
    if (player) {
      player.username = username.trim().substring(0, 20) || player.username;
      return player;
    }
    return undefined;
  }

  removePlayer(socketId: string): ExtendedPlayerInfo | undefined {
    const player = this.players.get(socketId);
    this.players.delete(socketId);
    return player;
  }

  getOnlineCount(): number {
    return this.players.size;
  }

  getAllPlayers(): ExtendedPlayerInfo[] {
    return Array.from(this.players.values());
  }
}
