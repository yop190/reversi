import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SetUsernamePayload, CreateRoomPayload, JoinRoomPayload, MakeMovePayload } from '../../../shared/game.types';
import { RoomService } from './room.service';
import { GameService } from './game.service';
import { PlayerService } from './player.service';
export declare class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private roomService;
    private gameService;
    private playerService;
    server: Server;
    constructor(roomService: RoomService, gameService: GameService, playerService: PlayerService);
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleSetUsername(client: Socket, payload: SetUsernamePayload): void;
    handleGetLobby(client: Socket): void;
    handleCreateRoom(client: Socket, payload: CreateRoomPayload): void;
    handleJoinRoom(client: Socket, payload: JoinRoomPayload): void;
    handleLeaveRoom(client: Socket): void;
    handleMakeMove(client: Socket, payload: MakeMovePayload): void;
    handlePassTurn(client: Socket): void;
    handleRequestHint(client: Socket): void;
    handleRestartGame(client: Socket): void;
    private broadcastLobbyUpdate;
    private broadcastRoomState;
    private getLobbyState;
    private sendError;
}
