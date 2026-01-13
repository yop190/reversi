import { RoomInfo, RoomSummary, PlayerInfo, PlayerColor, GameState } from '../../../shared/game.types';
import { GameService } from './game.service';
interface Room extends RoomInfo {
    playerSockets: Map<string, PlayerColor>;
}
export declare class RoomService {
    private gameService;
    private rooms;
    private playerRooms;
    private roomIdCounter;
    constructor(gameService: GameService);
    private generateRoomId;
    createRoom(roomName: string, creator: PlayerInfo): Room;
    getRoom(roomId: string): Room | undefined;
    getAllRooms(): Room[];
    getRoomSummaries(): RoomSummary[];
    getPlayerRoom(socketId: string): Room | undefined;
    joinRoom(roomId: string, player: PlayerInfo): {
        success: boolean;
        room?: Room;
        color?: PlayerColor;
        isSpectator: boolean;
        error?: string;
    };
    leaveRoom(socketId: string): {
        room?: Room;
        wasPlayer: boolean;
    };
    getPlayerColor(socketId: string, roomId: string): PlayerColor | undefined;
    updateGameState(roomId: string, gameState: GameState): boolean;
    restartGame(roomId: string): GameState | null;
    findOrCreateRoom(player: PlayerInfo): Room;
    toRoomInfo(room: Room): RoomInfo;
}
export {};
