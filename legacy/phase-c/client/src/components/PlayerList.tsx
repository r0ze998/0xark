import type { PlayerState } from '../dojo/models'

interface Props {
  players: PlayerState[]
  myAddress: string
}

export function PlayerList({ players, myAddress }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ color: '#888', fontSize: 12 }}>PLAYERS</span>
      {players.map(p => {
        const isMe = p.player === myAddress
        return (
          <div
            key={p.player}
            style={{
              padding: '8px 12px', border: `1px solid ${isMe ? '#00d4ff' : '#222'}`,
              borderRadius: 6, background: isMe ? '#00d4ff08' : '#111',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <div>
              <span style={{ color: isMe ? '#00d4ff' : '#ccc', fontSize: 13 }}>
                Player {p.player_index + 1} {isMe && '(you)'}
              </span>
              <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
                {p.player.slice(0, 6)}...{p.player.slice(-4)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, color: '#eab308' }}>{p.card_count} cards</div>
              <div style={{ fontSize: 10, color: '#555' }}>
                {p.steal_count}S {p.barrier_count}B {p.scout_count}Sc
              </div>
              <div style={{ fontSize: 10 }}>
                {p.has_committed && <span style={{ color: '#10b981' }}>committed </span>}
                {p.has_revealed && <span style={{ color: '#a855f7' }}>revealed</span>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
