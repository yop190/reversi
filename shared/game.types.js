"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerEvents = exports.ClientEvents = exports.PlayerColor = exports.CellState = exports.BOARD_SIZE = void 0;
exports.BOARD_SIZE = 8;
var CellState;
(function (CellState) {
    CellState[CellState["Empty"] = 0] = "Empty";
    CellState[CellState["Black"] = 1] = "Black";
    CellState[CellState["White"] = 2] = "White";
})(CellState || (exports.CellState = CellState = {}));
var PlayerColor;
(function (PlayerColor) {
    PlayerColor["Black"] = "black";
    PlayerColor["White"] = "white";
})(PlayerColor || (exports.PlayerColor = PlayerColor = {}));
var ClientEvents;
(function (ClientEvents) {
    ClientEvents["SetUsername"] = "client:setUsername";
    ClientEvents["CreateRoom"] = "client:createRoom";
    ClientEvents["JoinRoom"] = "client:joinRoom";
    ClientEvents["LeaveRoom"] = "client:leaveRoom";
    ClientEvents["MakeMove"] = "client:makeMove";
    ClientEvents["PassTurn"] = "client:passTurn";
    ClientEvents["RequestHint"] = "client:requestHint";
    ClientEvents["RestartGame"] = "client:restartGame";
    ClientEvents["GetLobby"] = "client:getLobby";
})(ClientEvents || (exports.ClientEvents = ClientEvents = {}));
var ServerEvents;
(function (ServerEvents) {
    ServerEvents["Connected"] = "server:connected";
    ServerEvents["Error"] = "server:error";
    ServerEvents["LobbyUpdate"] = "server:lobbyUpdate";
    ServerEvents["RoomJoined"] = "server:roomJoined";
    ServerEvents["RoomLeft"] = "server:roomLeft";
    ServerEvents["GameStarted"] = "server:gameStarted";
    ServerEvents["GameStateUpdate"] = "server:gameStateUpdate";
    ServerEvents["PlayerJoined"] = "server:playerJoined";
    ServerEvents["PlayerLeft"] = "server:playerLeft";
    ServerEvents["GameOver"] = "server:gameOver";
    ServerEvents["HintResponse"] = "server:hintResponse";
    ServerEvents["TurnPassed"] = "server:turnPassed";
})(ServerEvents || (exports.ServerEvents = ServerEvents = {}));
//# sourceMappingURL=game.types.js.map