import type { Game, PlayerState, PlayerCard } from '../dojo/models'
import { HandView } from './HandView'
import { ActionPanel } from './ActionPanel'
import { RevealPhase } from './RevealPhase'
import { PlayerList } from './PlayerList'
import { GameOver } from './GameOver'

interface Props {
  game: Game
  myState: PlayerState
  myCards: PlayerCard[]
  players: PlayerState[]
  myAddress: string
  logs: string[]
  onCommit: (actionType: number, target: string) => void
  onReveal: () => void
}

export function GameBoard({ game, myState, myCards, players, myAddress, logs, onCommit, onReveal }: Props) {
  const opponents = players.filter(p => p.player !== myAddress)
  const isCommitPhase = game.status === 'CommitPhase'
  const isRevealPhase = game.status === 'RevealPhase'
  const isFinished = game.status === 'Finished'

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0f', color: '#e0e0e0',
      fontFamily: 'monospace', padding: 16,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 0', borderBottom: '1px solid #222', marginBottom: 16,
      }}>
        <h1 style={{ fontSize: 20, color: '#00d4ff', margin: 0 }}>0xARK</h1>
        <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
          <span style={{ color: '#888' }}>Round {game.round}/{game.max_rounds}</span>
          <span style={{ color: '#555' }}>Pool: {game.cards_in_pool}</span>
          <span style={{
            color: isCommitPhase ? '#eab308' : isRevealPhase ? '#a855f7' : '#10b981',
          }}>
            {game.status}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Left column: Hand + Actions */}
        <div style={{ flex: 1, minWidth: 320, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <HandView cards={myCards} totalTypes={5} />

          {isCommitPhase && (
            <ActionPanel
              myState={myState}
              opponents={opponents}
              onCommit={onCommit}
              hasCommitted={myState.has_committed}
            />
          )}

          {isRevealPhase && (
            <RevealPhase
              hasRevealed={myState.has_revealed}
              revealCount={game.reveal_count}
              playerCount={game.player_count}
              onReveal={onReveal}
            />
          )}
        </div>

        {/* Right column: Players + Log */}
        <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <PlayerList players={players} myAddress={myAddress} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ color: '#888', fontSize: 12 }}>LOG</span>
            <div style={{
              height: 200, overflowY: 'auto', padding: 8,
              border: '1px solid #222', borderRadius: 6, background: '#0a0a0f',
              fontSize: 11, color: '#666',
            }}>
              {logs.map((log, i) => (
                <div key={i} style={{ marginBottom: 2 }}>{log}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isFinished && (
        <GameOver
          winner={game.winner}
          myAddress={myAddress}
          round={game.round}
        />
      )}
    </div>
  )
}
