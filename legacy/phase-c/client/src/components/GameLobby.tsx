import { useState } from 'react'

interface Props {
  onCreateGame: (maxPlayers: number) => void
  onJoinGame: (gameId: number) => void
  onStartGame: () => void
  gameId: number | null
  playerCount: number
  maxPlayers: number
  isHost: boolean
}

export function GameLobby({ onCreateGame, onJoinGame, onStartGame, gameId, playerCount, maxPlayers, isHost }: Props) {
  const [joinId, setJoinId] = useState('')

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 24,
      background: '#0a0a0f', color: '#e0e0e0', fontFamily: 'monospace',
    }}>
      <h1 style={{ fontSize: 48, color: '#00d4ff', letterSpacing: 4 }}>0xARK</h1>
      <p style={{ color: '#666', maxWidth: 400, textAlign: 'center' }}>
        ZK card-stealing PvP. Collect all 5 cards to win. Steal, scout, or defend.
      </p>

      {!gameId ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <button onClick={() => onCreateGame(2)} style={btnStyle}>
            Create Game (2 players)
          </button>
          <button onClick={() => onCreateGame(3)} style={btnStyle}>
            Create Game (3 players)
          </button>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input
              value={joinId}
              onChange={e => setJoinId(e.target.value)}
              placeholder="Game ID"
              style={inputStyle}
            />
            <button onClick={() => onJoinGame(Number(joinId))} style={btnStyle}>
              Join
            </button>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#00d4ff', fontSize: 18 }}>Game #{gameId}</p>
          <p style={{ color: '#888' }}>{playerCount}/{maxPlayers} players</p>
          {isHost && playerCount >= 2 && (
            <button onClick={onStartGame} style={{ ...btnStyle, marginTop: 16, background: '#00d4ff', color: '#000' }}>
              Start Game
            </button>
          )}
          {!isHost && <p style={{ color: '#666', marginTop: 12 }}>Waiting for host to start...</p>}
        </div>
      )}
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '10px 24px', border: '1px solid #00d4ff', background: 'transparent',
  color: '#00d4ff', cursor: 'pointer', fontFamily: 'monospace', fontSize: 14,
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px', border: '1px solid #333', background: '#111',
  color: '#fff', fontFamily: 'monospace', fontSize: 14, width: 80,
}
