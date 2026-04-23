import { useGame } from './hooks/useGame'
import { GameLobby } from './components/GameLobby'
import { GameBoard } from './components/GameBoard'
import type { PlayerState } from './dojo/models'

export default function App() {
  const g = useGame()

  // If no game, show lobby
  if (!g.gameId || !g.game) {
    return (
      <GameLobby
        onCreateGame={g.doCreateGame}
        onJoinGame={g.doJoinGame}
        onStartGame={g.doStartGame}
        gameId={g.gameId}
        playerCount={g.game?.player_count ?? 0}
        maxPlayers={g.game?.max_players ?? 2}
        isHost={true}
      />
    )
  }

  // If game exists but not started, show lobby with game info
  if (g.game.status === 'Lobby') {
    return (
      <GameLobby
        onCreateGame={g.doCreateGame}
        onJoinGame={g.doJoinGame}
        onStartGame={g.doStartGame}
        gameId={g.gameId}
        playerCount={g.game.player_count}
        maxPlayers={g.game.max_players}
        isHost={g.game.host === g.dojo.account.address}
      />
    )
  }

  // Game in progress
  const myState: PlayerState = g.myState || {
    game_id: g.gameId, player: g.dojo.account.address,
    player_index: 0, card_count: 0,
    steal_count: 3, barrier_count: 2, scout_count: 1,
    has_committed: false, has_revealed: false,
  }

  return (
    <GameBoard
      game={g.game}
      myState={myState}
      myCards={g.myCards}
      players={g.players}
      myAddress={g.dojo.account.address}
      logs={g.logs}
      onCommit={g.doCommit}
      onReveal={g.doReveal}
    />
  )
}
