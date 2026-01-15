import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { SetUsernamePayload, CreateRoomPayload, JoinRoomPayload, MakeMovePayload } from '../../../shared/game.types';
import { RoomService } from './room.service';
import { GameService } from './game.service';
import { PlayerService } from './player.service';
import { ScoreService } from '../score/score.service';
interface AuthenticatedSocket extends Socket {
    user?: {
        id: string;
        googleId: string;
        email: string;
        displayName: string;
    };
}
export declare class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private roomService;
    private gameService;
    private playerService;
    private jwtService;
    private scoreService;
    private configService;
    server: Server;
    private readonly logger;
    private readonly authEnabled;
    constructor(roomService: RoomService, gameService: GameService, playerService: PlayerService, jwtService: JwtService, scoreService: ScoreService, configService: ConfigService);
    private validateToken;
    handleConnection(client: AuthenticatedSocket): void;
    handleDisconnect(client: AuthenticatedSocket): void;
    handleSetUsername(client: Socket, payload: SetUsernamePayload): void;
    handleGetLobby(client: Socket): void;
    handleCreateRoom(client: Socket, payload: CreateRoomPayload): void;
    handleJoinRoom(client: Socket, payload: JoinRoomPayload): void;
    handleLeaveRoom(client: Socket): void;
    handleMakeMove(client: Socket, payload: MakeMovePayload): void;
    private recordGameScore;
    handlePassTurn(client: Socket): void;
    handleRequestHint(client: Socket): void;
    handleRestartGame(client: Socket): void;
    private broadcastLobbyUpdate;
    private broadcastRoomState;
    private getLobbyState;
    private sendError;
}
export {};
