# x402 Live Deploy Handoff — v-phd-x402-live

**作成日**: 2026-04-24  
**Tag**: `v-phd-x402-live`

---

## 完了した変更

### 1. `/card-buy` verify バグ fix ✅

`legacy/phase-c/x402/agent-broker.js` 709行目:

```diff
- const result = await verifySolPayment(payment, RECIPIENT_WALLET, CARD_BUY_MIN_LAMPORTS);
+ const result = await verifySolPayment(payment, CARD_BUY_MIN_LAMPORTS);
```

`RECIPIENT_WALLET` を第2引数に誤って渡していたため verify が常に通過 (誰でも無料で card 取得可能な exploit) → 修正済み。

---

### 2. ブラウザクライアント local-dev-bypass 削除 + Fly.io URL へ切り替え ✅

**`solana/client/src/04-state.js`**:
```diff
- const X402_DEFAULT_URL='http://localhost:3402';
+ const X402_DEFAULT_URL='https://oxark-agent-broker.fly.dev';
```

```diff
  async function x402FetchIntel(endpoint){
    if(!x402Available)return null;
    try{
-     const r=await fetch(x402ServerUrl+endpoint,{
-       headers:{'X-Payment':'local-dev-bypass'},
-       signal:AbortSignal.timeout(3000)
-     });
+     const r=await fetch(x402ServerUrl+endpoint,{
+       signal:AbortSignal.timeout(3000)
+     });
      if(r.ok)return await r.json();
+     // 402 = payment required; return null so callers degrade gracefully
      return null;
    }catch(e){return null;}
  }
```

**`solana/client/src/08-duel-scene.js`** — `_triggerScoutPeek`:
- Phantom wallet 接続時: `window.x402.scoutPeek(gameId, target, wallet, conn)` → 実際の SOL 送金 (0.005 SOL) → retry with `X-Payment: <txsig>`
- Wallet 未接続 / エラー時: `_x402Mock` (demo mode) にフォールバック

`index.html` (game client) を rebuild 済み。

---

### 3. Fly.io deploy — **r0ze が実行する必要あり**

flyctl は未認証のため、r0ze が以下を実行してください:

```bash
# Step 1: Fly.io 認証 (ブラウザが開く)
~/.fly/bin/flyctl auth login

# Step 2: デプロイ
cd /path/to/0xark/legacy/phase-c/x402
~/.fly/bin/flyctl deploy

# Step 3: Secrets 設定 (r0ze の devnet wallet pubkey に変更推奨)
~/.fly/bin/flyctl secrets set \
  BROKER_WALLET=DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R \
  SOLANA_RPC_URL=https://api.devnet.solana.com

# BROKER_WALLET は支払いを受け取る devnet アドレス。
# r0ze 自身のウォレットに変えることで Pitch 中の送金先が自分のアドレスになる。
```

---

## デプロイ後の確認 (curl)

**公開 URL**: `https://oxark-agent-broker.fly.dev`

```bash
BASE="https://oxark-agent-broker.fly.dev"

# ── ヘルスチェック ───────────────────────────────────────────────────────
curl $BASE/health
# → {"ok":true,"uptime":...}

# ── エンドポイント一覧 ──────────────────────────────────────────────────
curl $BASE/status | jq .

# ── POST /scout-peek — Step 1: probe → 402 ──────────────────────────────
curl -s -X POST $BASE/scout-peek \
  -H "Content-Type: application/json" \
  -d '{"game_id":703932,"target_pubkey":"<YOUR_DEVNET_PUBKEY>"}' \
  -v 2>&1 | grep -E "< HTTP|X-Payment-Required|error"
# → HTTP 402
# → X-Payment-Required: {"protocol":"x402","amount":5000000,"currency":"SOL","recipient":"DPMPhn..."}

# ── SOL 送金 ────────────────────────────────────────────────────────────
solana transfer DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R 0.005 \
  --url devnet --keypair ~/.config/solana/id.json --allow-unfunded-recipient
# → Signature: <TXSIG>

# ── POST /scout-peek — Step 2: retry with sig → 200 ────────────────────
curl -s -X POST $BASE/scout-peek \
  -H "Content-Type: application/json" \
  -H "X-Payment: <TXSIG>" \
  -d '{"game_id":703932,"target_pubkey":"<YOUR_DEVNET_PUBKEY>"}' | jq .
# → {"ok":true,"cards":[...],...}

# ── Replay rejection ────────────────────────────────────────────────────
curl -s -X POST $BASE/scout-peek \
  -H "Content-Type: application/json" \
  -H "X-Payment: <TXSIG>" \
  -d '{"game_id":703932,"target_pubkey":"<YOUR_DEVNET_PUBKEY>"}' | jq .
# → {"error":"Payment verification failed","reason":"Signature already used"}

# ── POST /agent-hire — probe ─────────────────────────────────────────────
curl -s -X POST $BASE/agent-hire \
  -H "Content-Type: application/json" \
  -d '{"game_id":703932,"agent_id":0,"duration_seconds":3600,"hirer_pubkey":"<YOUR_PUBKEY>"}' \
  -v 2>&1 | grep -E "< HTTP|X-Payment-Required"
# → HTTP 402 + X-Payment-Required: {"amount":50000000,...}

# ── POST /card-buy — probe ───────────────────────────────────────────────
curl -s -X POST $BASE/card-buy \
  -H "Content-Type: application/json" \
  -d '{"card_id":5,"seller_pubkey":"<S>","buyer_pubkey":"<B>","price_lamports":50000000}' \
  -v 2>&1 | grep -E "< HTTP|X-Payment-Required"
# → HTTP 402 (verify は修正済み、実際の 0.01 SOL 送金後に通過)
```

---

## ブラウザでの Scout Peek 動作確認

1. r0ze998.github.io/0xark を開く
2. Phantom Wallet で devnet に接続
3. ゲームに入り Duel を開始
4. SCOUT ボタンをクリック
5. → "Approve 0.005 SOL in wallet…" トースト表示
6. → Phantom が SOL 送金の承認ダイアログを表示
7. 承認 → `X-Payment: <txsig>` で broker に retry
8. → "Peeked: `<CardName>`!" トースト + カード表示

Wallet 未接続の場合は `_x402Mock` (multiplayer server demo mode) にフォールバック。

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `legacy/phase-c/x402/agent-broker.js` | `/card-buy` verify バグ fix (1行) |
| `solana/client/src/04-state.js` | `X402_DEFAULT_URL` → Fly.io URL, `x402FetchIntel` bypass 削除 |
| `solana/client/src/08-duel-scene.js` | `_triggerScoutPeek` → 実 x402 cycle |
| `solana/client/index.html` | rebuild (29 modules) |
| `index.html` (repo root) | rebuild (GitHub Pages 配信用) |

---

## 技術メモ

- `x402FetchIntel` (intel shop) は bypass 削除後、支払いなしで broker に probe → 402 で null 返却 → UI が gracefully degrade (intel overlay 非表示)。Pitch の network tab で 402 response が見える。
- Scout Peek の real x402 path は `window.x402.scoutPeek` (`02-x402.js`) を呼ぶ。probe → SOL 送金 (Phantom sign) → retry with `X-Payment` signature。
- `DS.gameId` が 0 / `DS.opponentPubkey` が null の場合でも broker への payment verification は SOL 受領を確認するだけなので通過する。on-chain PlayerState が無ければ `cards: []` が返る (reveal はローカル hand データを使用)。
