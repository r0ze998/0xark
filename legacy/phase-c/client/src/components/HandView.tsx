import type { PlayerCard } from '../dojo/models'
import { CARD_NAMES, CARD_COLORS } from '../dojo/models'

interface Props {
  cards: PlayerCard[]
  totalTypes: number
}

export function HandView({ cards, totalTypes }: Props) {
  const uniqueTypes = new Set(cards.filter(c => c.card_id > 0).map(c => c.card_id))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#888', fontSize: 12 }}>YOUR HAND</span>
        <span style={{ color: uniqueTypes.size === totalTypes ? '#10b981' : '#eab308', fontSize: 14 }}>
          {uniqueTypes.size}/{totalTypes}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {Array.from({ length: totalTypes }, (_, i) => {
          const card = cards.find(c => c.slot === i)
          const cardId = card?.card_id || 0
          const filled = cardId > 0
          return (
            <div
              key={i}
              style={{
                width: 64, height: 88,
                border: `2px solid ${filled ? CARD_COLORS[cardId] || '#333' : '#222'}`,
                borderRadius: 8,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: filled ? `${CARD_COLORS[cardId]}15` : '#111',
                transition: 'all 0.3s',
              }}
            >
              {filled ? (
                <>
                  <span style={{ fontSize: 24 }}>
                    {['', '💎', '🌑', '🔥', '⚡', '🌀'][cardId]}
                  </span>
                  <span style={{ fontSize: 10, color: CARD_COLORS[cardId], marginTop: 4 }}>
                    {CARD_NAMES[cardId]}
                  </span>
                </>
              ) : (
                <span style={{ color: '#333', fontSize: 20 }}>?</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
