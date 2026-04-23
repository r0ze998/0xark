import { useState } from 'react'
import type { PlayerState } from '../dojo/models'

interface Props {
  myState: PlayerState
  opponents: PlayerState[]
  onCommit: (actionType: number, target: string) => void
  hasCommitted: boolean
}

export function ActionPanel({ myState, opponents, onCommit, hasCommitted }: Props) {
  const [selectedTarget, setSelectedTarget] = useState<string>(opponents[0]?.player || '')

  if (hasCommitted) {
    return (
      <div style={panelStyle}>
        <p style={{ color: '#eab308', textAlign: 'center' }}>
          Action committed. Waiting for others...
        </p>
      </div>
    )
  }

  const actions = [
    { type: 1, name: 'Draw', icon: '🎴', desc: 'Draw a card from pool', count: null, needsTarget: false },
    { type: 2, name: 'Steal', icon: '🗡️', desc: `Steal a card (${myState.steal_count} left)`, count: myState.steal_count, needsTarget: true },
    { type: 3, name: 'Barrier', icon: '🛡️', desc: `Block steals (${myState.barrier_count} left)`, count: myState.barrier_count, needsTarget: false },
    { type: 4, name: 'Scout', icon: '🔍', desc: `See target's hand (${myState.scout_count} left)`, count: myState.scout_count, needsTarget: true },
  ]

  return (
    <div style={panelStyle}>
      <p style={{ color: '#888', fontSize: 12, marginBottom: 8 }}>CHOOSE ACTION</p>

      {opponents.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ color: '#666', fontSize: 11 }}>Target: </label>
          <select
            value={selectedTarget}
            onChange={e => setSelectedTarget(e.target.value)}
            style={selectStyle}
          >
            {opponents.map(o => (
              <option key={o.player} value={o.player}>
                Player {o.player_index + 1} ({o.card_count} cards)
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {actions.map(a => {
          const disabled = a.count !== null && a.count <= 0
          return (
            <button
              key={a.type}
              disabled={disabled}
              onClick={() => onCommit(a.type, a.needsTarget ? selectedTarget : '0x0')}
              style={{
                ...actionBtnStyle,
                opacity: disabled ? 0.3 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              <span style={{ fontSize: 24 }}>{a.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 'bold' }}>{a.name}</span>
              <span style={{ fontSize: 10, color: '#888' }}>{a.desc}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const panelStyle: React.CSSProperties = {
  padding: 16, border: '1px solid #222', borderRadius: 8, background: '#0d0d14',
}

const selectStyle: React.CSSProperties = {
  padding: '4px 8px', background: '#111', border: '1px solid #333',
  color: '#fff', fontFamily: 'monospace', fontSize: 12,
}

const actionBtnStyle: React.CSSProperties = {
  padding: 12, border: '1px solid #333', borderRadius: 8,
  background: '#111', color: '#e0e0e0', cursor: 'pointer',
  fontFamily: 'monospace', display: 'flex', flexDirection: 'column',
  alignItems: 'center', gap: 4, transition: 'border-color 0.2s',
}
