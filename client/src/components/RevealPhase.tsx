interface Props {
  hasRevealed: boolean
  revealCount: number
  playerCount: number
  onReveal: () => void
}

export function RevealPhase({ hasRevealed, revealCount, playerCount, onReveal }: Props) {
  return (
    <div style={{
      padding: 16, border: '1px solid #222', borderRadius: 8,
      background: '#0d0d14', textAlign: 'center',
    }}>
      <p style={{ color: '#a855f7', fontSize: 14, marginBottom: 12 }}>
        REVEAL PHASE — {revealCount}/{playerCount} revealed
      </p>
      {!hasRevealed ? (
        <button onClick={onReveal} style={revealBtnStyle}>
          Reveal Action
        </button>
      ) : (
        <p style={{ color: '#666' }}>Waiting for others to reveal...</p>
      )}
    </div>
  )
}

const revealBtnStyle: React.CSSProperties = {
  padding: '12px 32px', border: '2px solid #a855f7', background: '#a855f710',
  color: '#a855f7', cursor: 'pointer', fontFamily: 'monospace',
  fontSize: 16, fontWeight: 'bold', borderRadius: 8,
}
