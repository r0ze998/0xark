export type GameStatus = 'Lobby' | 'CommitPhase' | 'RevealPhase' | 'Resolving' | 'Finished'

export type ActionType = 'Draw' | 'Steal' | 'Barrier' | 'Scout'

export interface Game {
  game_id: number
  host: string
  status: GameStatus
  round: number
  max_rounds: number
  player_count: number
  max_players: number
  cards_in_pool: number
  winner: string
  commit_count: number
  reveal_count: number
}

export interface PlayerState {
  game_id: number
  player: string
  player_index: number
  card_count: number
  steal_count: number
  barrier_count: number
  scout_count: number
  has_committed: boolean
  has_revealed: boolean
}

export interface PlayerCard {
  game_id: number
  player: string
  slot: number
  card_id: number
}

export const CARD_NAMES: Record<number, string> = {
  1: 'Crystal',
  2: 'Shadow',
  3: 'Flame',
  4: 'Storm',
  5: 'Void',
}

export const CARD_COLORS: Record<number, string> = {
  1: '#00d4ff',
  2: '#8b5cf6',
  3: '#ef4444',
  4: '#eab308',
  5: '#10b981',
}
