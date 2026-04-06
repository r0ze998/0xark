import { Account } from 'starknet'
import { DojoProvider } from '@dojoengine/core'
import { hash } from 'starknet'

const NAMESPACE = 'oxark'

export async function createGame(
  provider: DojoProvider, account: Account, maxPlayers: number,
): Promise<void> {
  await provider.execute(account as any, {
    contractName: 'game_actions',
    entrypoint: 'create_game',
    calldata: [maxPlayers],
  }, NAMESPACE)
}

export async function joinGame(
  provider: DojoProvider, account: Account, gameId: number,
): Promise<void> {
  await provider.execute(account as any, {
    contractName: 'game_actions',
    entrypoint: 'join_game',
    calldata: [gameId],
  }, NAMESPACE)
}

export async function startGame(
  provider: DojoProvider, account: Account, gameId: number,
): Promise<void> {
  await provider.execute(account as any, {
    contractName: 'game_actions',
    entrypoint: 'start_game',
    calldata: [gameId],
  }, NAMESPACE)
}

export async function commitAction(
  provider: DojoProvider, account: Account, gameId: number, actionHash: string,
): Promise<void> {
  await provider.execute(account as any, {
    contractName: 'round_actions',
    entrypoint: 'commit',
    calldata: [gameId, actionHash],
  }, NAMESPACE)
}

export async function revealAction(
  provider: DojoProvider, account: Account, gameId: number,
  actionType: number, target: string, salt: string,
): Promise<void> {
  await provider.execute(account as any, {
    contractName: 'round_actions',
    entrypoint: 'reveal',
    calldata: [gameId, actionType, target, salt],
  }, NAMESPACE)
}

// Action types: 1=Draw, 2=Steal, 3=Barrier, 4=Scout
export function computeActionHash(
  actionType: number, target: string, salt: string,
): string {
  const inner = hash.computePedersenHash(actionType.toString(), target)
  return hash.computePedersenHash(inner, salt)
}

export function generateSalt(): string {
  const bytes = new Uint8Array(31)
  crypto.getRandomValues(bytes)
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}
