# 0xARK Multiplayer Server

WebSocket server for real-time multiplayer card battles.

## Quick Start

```bash
npm install
npm start
```

Server runs on `ws://localhost:3500`

## Protocol

### Client → Server

| Message | Description |
|---------|-------------|
| `{type:'create_room', name}` | Create a new room, become host |
| `{type:'join_room', roomId, name}` | Join existing room |
| `{type:'start_game'}` | Host starts the game (2+ players) |
| `{type:'move', x, y, area}` | Broadcast position update |
| `{type:'commit', hash}` | Submit action commit hash |
| `{type:'reveal', actionType, target, salt}` | Reveal committed action |
| `{type:'chat', message}` | Send chat message |

### Server → Client

| Message | Description |
|---------|-------------|
| `{type:'room_created', roomId, playerId}` | Room created successfully |
| `{type:'room_joined', roomId, playerId, players}` | Joined room with player list |
| `{type:'player_joined', player}` | Another player joined |
| `{type:'player_left', playerId}` | Player disconnected |
| `{type:'game_started', players}` | Game begins |
| `{type:'player_moved', playerId, x, y, area}` | Player position update |
| `{type:'all_committed', round}` | All players committed, begin reveal |
| `{type:'all_revealed', actions, round}` | All revealed, resolve round |
| `{type:'error', message}` | Error occurred |

## Room Flow

1. Player A creates room → gets room ID
2. Player B joins with room ID
3. Player A starts game
4. All players move, commit, reveal in sync
5. Game resolves on all clients identically
