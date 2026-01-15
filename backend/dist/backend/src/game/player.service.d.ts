import { PlayerInfo } from '../../../shared/game.types';
interface ExtendedPlayerInfo extends PlayerInfo {
    odataId?: string;
    odataEtag?: string;
    odataEditLink?: string;
    userId?: string;
}
export declare class PlayerService {
    private players;
    createPlayer(socketId: string, username?: string, userId?: string): ExtendedPlayerInfo;
    getPlayer(socketId: string): ExtendedPlayerInfo | undefined;
    setUsername(socketId: string, username: string): ExtendedPlayerInfo | undefined;
    removePlayer(socketId: string): ExtendedPlayerInfo | undefined;
    getOnlineCount(): number;
    getAllPlayers(): ExtendedPlayerInfo[];
}
export {};
