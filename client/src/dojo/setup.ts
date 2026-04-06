import { DojoProvider } from '@dojoengine/core'
import { Account, RpcProvider } from 'starknet'

const RPC_URL = import.meta.env.VITE_RPC_URL || 'http://localhost:5050'
const TORII_URL = import.meta.env.VITE_TORII_URL || 'http://localhost:8080'
const WORLD_ADDRESS = import.meta.env.VITE_WORLD_ADDRESS || '0x0'

// Default katana dev account
const DEV_ACCOUNT = '0x127fd5f1fe78a71f8bcd1fec63e3fe2f0486b6ecd5c86a0466c3a21fa5cfcec'
const DEV_PRIVATE_KEY = '0xc5b2fcab997346f3ea1c00b002ecf6f382c5f9c9659a3894eb783c5320f912'

export interface DojoSetup {
  provider: DojoProvider
  account: Account
  toriiUrl: string
  worldAddress: string
  rpcProvider: RpcProvider
}

export function setupDojo(): DojoSetup {
  const rpcProvider = new RpcProvider({ nodeUrl: RPC_URL })
  const provider = new DojoProvider(WORLD_ADDRESS, rpcProvider as any)
  const account = new Account(rpcProvider, DEV_ACCOUNT, DEV_PRIVATE_KEY)

  return {
    provider,
    account,
    toriiUrl: TORII_URL,
    worldAddress: WORLD_ADDRESS,
    rpcProvider,
  }
}
