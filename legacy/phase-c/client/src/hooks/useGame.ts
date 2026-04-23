import { useState, useCallback, useRef } from 'react'
import { setupDojo, type DojoSetup } from '../dojo/setup'
import type { Game, PlayerState, PlayerCard } from '../dojo/models'
import * as calls from '../dojo/contractCalls'

export type Phase = 'lobby' | 'committing' | 'revealing' | 'finished'

export interface PendingAction {
  actionType: number
  target: string
  salt: string
  hash: string
}

export function useGame() {
  const [dojo] = useState<DojoSetup>(() => setupDojo())
  const [gameId, setGameId] = useState<number | null>(null)
  const [game, setGame] = useState<Game | null>(null)
  const [players, setPlayers] = useState<PlayerState[]>([])
  const [myCards, setMyCards] = useState<PlayerCard[]>([])
  const [myState, setMyState] = useState<PlayerState | null>(null)
  const [phase, setPhase] = useState<Phase>('lobby')
  const [error, setError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [logs, setLogs] = useState<string[]>([])

  const pendingRef = useRef(pendingAction)
  pendingRef.current = pendingAction

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev.slice(-49), msg])
  }, [])

  const handleError = useCallback((err: unknown, context: string) => {
    const msg = err instanceof Error ? err.message : String(err)
    setError(`${context}: ${msg}`)
    addLog(`Error: ${context} — ${msg}`)
  }, [addLog])

  // === Game Lifecycle ===

  const doCreateGame = useCallback(async (maxPlayers: number) => {
    try {
      setError(null)
      await calls.createGame(dojo.provider, dojo.account, maxPlayers)
      // For now, assume game_id = 1 (first game)
      setGameId(1)
      addLog('Game created')
    } catch (e) { handleError(e, 'Create game') }
  }, [dojo, addLog, handleError])

  const doJoinGame = useCallback(async (gid: number) => {
    try {
      setError(null)
      await calls.joinGame(dojo.provider, dojo.account, gid)
      setGameId(gid)
      addLog(`Joined game ${gid}`)
    } catch (e) { handleError(e, 'Join game') }
  }, [dojo, addLog, handleError])

  const doStartGame = useCallback(async () => {
    if (!gameId) return
    try {
      setError(null)
      await calls.startGame(dojo.provider, dojo.account, gameId)
      addLog('Game started!')
    } catch (e) { handleError(e, 'Start game') }
  }, [dojo, gameId, addLog, handleError])

  // === Actions ===

  const doCommit = useCallback(async (actionType: number, target: string) => {
    if (!gameId) return
    try {
      setError(null)
      const salt = calls.generateSalt()
      const hash = calls.computeActionHash(actionType, target, salt)
      await calls.commitAction(dojo.provider, dojo.account, gameId, hash)
      const pending = { actionType, target, salt, hash }
      setPendingAction(pending)
      // Persist to localStorage for crash recovery
      localStorage.setItem(`0xark_pending_${gameId}`, JSON.stringify(pending))
      const actionNames = ['', 'Draw', 'Steal', 'Barrier', 'Scout']
      addLog(`Committed: ${actionNames[actionType]}`)
    } catch (e) { handleError(e, 'Commit') }
  }, [dojo, gameId, addLog, handleError])

  const doReveal = useCallback(async () => {
    if (!gameId) return
    const action = pendingRef.current
    if (!action) {
      // Try to recover from localStorage
      const saved = localStorage.getItem(`0xark_pending_${gameId}`)
      if (!saved) {
        setError('No pending action to reveal')
        return
      }
      const recovered = JSON.parse(saved) as PendingAction
      setPendingAction(recovered)
      try {
        await calls.revealAction(
          dojo.provider, dojo.account, gameId,
          recovered.actionType, recovered.target, recovered.salt,
        )
        localStorage.removeItem(`0xark_pending_${gameId}`)
        setPendingAction(null)
        addLog('Revealed action')
      } catch (e) { handleError(e, 'Reveal') }
      return
    }
    try {
      setError(null)
      await calls.revealAction(
        dojo.provider, dojo.account, gameId,
        action.actionType, action.target, action.salt,
      )
      localStorage.removeItem(`0xark_pending_${gameId}`)
      setPendingAction(null)
      addLog('Revealed action')
    } catch (e) { handleError(e, 'Reveal') }
  }, [dojo, gameId, addLog, handleError])

  return {
    dojo,
    gameId, setGameId,
    game, setGame,
    players, setPlayers,
    myCards, setMyCards,
    myState, setMyState,
    phase, setPhase,
    error,
    pendingAction,
    logs,
    doCreateGame,
    doJoinGame,
    doStartGame,
    doCommit,
    doReveal,
    addLog,
  }
}
