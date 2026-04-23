interface Props {
  winner: string
  myAddress: string
  round: number
}

export function GameOver({ winner, myAddress, round }: Props) {
  const isMe = winner === myAddress
  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.85)', zIndex: 100,
    }}>
      <div style={{
        padding: 48, border: `2px solid ${isMe ? '#10b981' : '#ef4444'}`,
        borderRadius: 16, background: '#0a0a0f', textAlign: 'center',
        maxWidth: 400,
      }}>
        <p style={{ fontSize: 48, marginBottom: 16 }}>
          {isMe ? '🏆' : '💀'}
        </p>
        <h2 style={{ color: isMe ? '#10b981' : '#ef4444', fontSize: 24, marginBottom: 8 }}>
          {isMe ? 'YOU WIN!' : 'GAME OVER'}
        </h2>
        <p style={{ color: '#888', fontSize: 14 }}>
          {isMe
            ? `Collected all 5 cards in ${round} rounds!`
            : `Winner: ${winner.slice(0, 10)}...`
          }
        </p>
      </div>
    </div>
  )
}
