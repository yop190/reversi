import { PlayerInfo } from '../../../shared/game.types';
export declare class PlayerService {
    private players;
    createPlayer(socketId: string): PlayerInfo;
    getPlayer(socketId: string): PlayerInfo | undefined;
    setUsername(socketId: string, username: string): PlayerInfo | undefined;
    removePlayer(socketId: string): PlayerInfo | undefined;
    getOnlineCount(): number;
    getAllPlayers(): PlayerInfo[];
}
