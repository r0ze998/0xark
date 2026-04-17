import { useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { buildCreateGameTx, buildJoinGameTx, buildDepositStakeTx, fetchGameState, STATUS_LABELS } from '../lib/onchain';

interface LobbyPanelProps {
  onGameJoined: (gameId: bigint) => void;
}

type Step = 'idle' | 'creating' | 'joining' | 'staking' | 'done';

export function LobbyPanel({ onGameJoined }: LobbyPanelProps) {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const [gameIdInput, setGameIdInput] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState('');
  const [gameInfo, setGameInfo] = useState<Awaited<ReturnType<typeof fetchGameState>>>(null);

  const handleCreate = useCallback(async () => {
    if (!publicKey) { setError('Connect wallet first'); return; }
    setError('');
    setStep('creating');
    try {
      // Use timestamp-derived game ID for uniqueness
      const gameId = BigInt(Date.now());
      const tx = buildCreateGameTx(publicKey, gameId, 3);
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');

      // Notify game canvas
      window.dispatchEvent(new CustomEvent('game:created', {
        detail: { gameId: gameId.toString(), sig },
      }));
      setGameIdInput(gameId.toString());
      await refreshGameInfo(gameId);
      onGameJoined(gameId);
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed');
      setStep('idle');
    }
  }, [publicKey, connection, sendTransaction, onGameJoined]);

  const handleJoin = useCallback(async () => {
    if (!publicKey) { setError('Connect wallet first'); return; }
    if (!gameIdInput.trim()) { setError('Enter a game ID'); return; }
    setError('');
    setStep('joining');
    try {
      const gameId = BigInt(gameIdInput.trim());
      const tx = buildJoinGameTx(publicKey, gameId);
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');

      window.dispatchEvent(new CustomEvent('game:joined', {
        detail: { gameId: gameId.toString(), sig },
      }));
      await refreshGameInfo(gameId);
      onGameJoined(gameId);
      setStep('staking');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Join failed');
      setStep('idle');
    }
  }, [publicKey, gameIdInput, connection, sendTransaction, onGameJoined]);

  const handleStake = useCallback(async () => {
    if (!publicKey || !gameIdInput.trim()) return;
    setError('');
    setStep('staking');
    try {
      const gameId = BigInt(gameIdInput.trim());
      const tx = buildDepositStakeTx(publicKey, gameId);
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = publicKey;
      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'confirmed');

      window.dispatchEvent(new CustomEvent('game:staked', {
        detail: { gameId: gameId.toString(), sig, amount: '0.5 SOL' },
      }));
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Stake failed');
      setStep('idle');
    }
  }, [publicKey, gameIdInput, connection, sendTransaction]);

  async function refreshGameInfo(gameId: bigint) {
    try {
      const state = await fetchGameState(connection, gameId);
      setGameInfo(state);
    } catch { /* non-fatal */ }
  }

  if (!publicKey) return null;

  return (
    <div className="lobby-panel">
      <h2 className="lobby-title">⚓ 0xARK Lobby</h2>

      {gameInfo && (
        <div className="game-info">
          <div className="info-row"><span>Game ID</span><span>{gameInfo.gameId.toString()}</span></div>
          <div className="info-row"><span>Status</span><span className="status-badge">{STATUS_LABELS[gameInfo.status] ?? 'Unknown'}</span></div>
          <div className="info-row"><span>Round</span><span>{gameInfo.round}</span></div>
          <div className="info-row"><span>Players</span><span>{gameInfo.playerCount} / {gameInfo.maxPlayers}</span></div>
        </div>
      )}

      <div className="lobby-actions">
        <button
          className="btn btn-primary"
          onClick={handleCreate}
          disabled={step !== 'idle' || !publicKey}
        >
          {step === 'creating' ? 'Creating…' : '+ Create Game'}
        </button>

        <div className="join-row">
          <input
            className="game-id-input"
            placeholder="Game ID"
            value={gameIdInput}
            onChange={e => setGameIdInput(e.target.value)}
          />
          <button
            className="btn btn-secondary"
            onClick={handleJoin}
            disabled={(step !== 'idle' && step !== 'done') || !publicKey}
          >
            {step === 'joining' ? 'Joining…' : 'Join'}
          </button>
        </div>

        {step === 'staking' && (
          <button className="btn btn-stake" onClick={handleStake}>
            Deposit 0.5 SOL stake ⚡
          </button>
        )}
      </div>

      {error && <div className="error-msg">{error}</div>}
    </div>
  );
}
