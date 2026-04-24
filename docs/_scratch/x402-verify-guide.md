# x402 実機動作確認ガイド

**作成日**: 2026-04-24  
**対象**: `legacy/phase-c/x402/agent-broker.js` — Information Broker サーバー  
**Payment recipient (devnet)**: `DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R`

---

## 0. サーバーの現状

### どこで動いているか

| サーバー | ファイル | エンドポイント | 状態 |
|---------|---------|--------------|------|
| **Information Broker** | `legacy/phase-c/x402/agent-broker.js` | `/scout-peek`, `/agent-hire`, `/card-buy` | **ローカルのみ** — Fly.io config (`fly.toml`) はあるが未デプロイ |
| Multiplayer | `multiplayer/server.js` | `/x402/extra-action`, `/x402/scout-peek`, `/x402/counter-peek` | **ローカルのみ** — 別の x402 実装(polling方式) |

**Live URL (r0ze998.github.io/0xark) には統合されていない。**  
ゲームクライアント内の `x402FetchIntel()` は `X-Payment: local-dev-bypass` をハードコードしており、常にバイパス状態。実際の x402 cycle はブラウザからは実行されない。

**実機確認には Information Broker をローカル起動する必要がある。**

---

## 1. サーバー起動

```bash
cd /path/to/0xark/legacy/phase-c/x402

# 依存インストール (初回のみ)
npm install

# .env ファイル確認 (.env.example がテンプレート)
cat .env.example
# → BROKER_WALLET=DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R
# → SOLANA_RPC_URL=https://api.devnet.solana.com

# 起動
node agent-broker.js
# または
npm start
```

起動後に出力される内容:
```
0xARK x402 Information Broker v1.0
Listening on :3402
Recipient wallet: DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R
Network: https://api.devnet.solana.com

Dev bypass: X-Payment: local-dev-bypass
```

ヘルスチェック:
```bash
curl http://localhost:3402/health
# → {"ok":true,"uptime":...}

curl http://localhost:3402/status
# → エンドポイント一覧 + 料金表
```

---

## 2. 完全 402 サイクル — curl スクリプト

### 前提

- Solana CLI インストール済み (`solana --version`)
- devnet ウォレット (SOL残高あり) — 例: `~/.config/solana/id.json`
- Payment recipient: `DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R`

---

### 2-A. `/scout-peek` — 0.005 SOL

**概要**: 対象プレイヤーの on-chain PlayerState からカード情報を取得する。

```bash
# ── Step 1: Probe → 402 受信 ──────────────────────────────────────────────
curl -s -X POST http://localhost:3402/scout-peek \
  -H "Content-Type: application/json" \
  -d '{"game_id":703932,"target_pubkey":"<TARGET_PLAYER_PUBKEY>"}' \
  -v 2>&1 | grep -E "< HTTP|X-Payment-Required|{.*}"

# 期待される response:
# HTTP 402
# X-Payment-Required: {"protocol":"x402","network":"solana-devnet","amount":5000000,"currency":"SOL","recipient":"DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R","description":"Scout peek"}
# {"error":"Payment Required","x402":{...}}

# ── Step 2: SOL 送金 ─────────────────────────────────────────────────────
solana transfer DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R 0.005 \
  --url devnet \
  --fee-payer ~/.config/solana/id.json \
  --keypair ~/.config/solana/id.json \
  --allow-unfunded-recipient

# 出力例:
# Signature: 5Kd7a9bX...  ← これを次のステップで使う
TXSIG="<上記の Signature をここに貼る>"

# ── Step 3: X-Payment 付きで retry → 200 ────────────────────────────────
curl -s -X POST http://localhost:3402/scout-peek \
  -H "Content-Type: application/json" \
  -H "X-Payment: $TXSIG" \
  -d '{"game_id":703932,"target_pubkey":"<TARGET_PLAYER_PUBKEY>"}' \
  | jq .

# 期待される response:
# {
#   "ok": true,
#   "cards": [...],
#   "area": 1,
#   "card_count": 3,
#   "sig": "5Kd7a9bX..."
# }
```

> **注意**: `target_pubkey` に devnet 上で実際に PlayerState PDA を持つウォレットが必要。  
> ゲームをプレイした履歴のある pubkey を使う。存在しない場合は `"cards":[]` が返る。

---

### 2-B. `/agent-hire` — 0.05 SOL

**概要**: AI エージェントを自動プレイセッションとして雇う。

```bash
# ── Step 1: Probe ─────────────────────────────────────────────────────────
curl -s -X POST http://localhost:3402/agent-hire \
  -H "Content-Type: application/json" \
  -d '{"game_id":703932,"agent_id":0,"duration_seconds":3600,"hirer_pubkey":"<YOUR_PUBKEY>"}' \
  -v 2>&1 | grep -E "< HTTP|X-Payment-Required|error"

# HTTP 402 + X-Payment-Required: {"amount":50000000,"currency":"SOL",...}

# ── Step 2: 送金 (0.05 SOL) ──────────────────────────────────────────────
solana transfer DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R 0.05 \
  --url devnet \
  --keypair ~/.config/solana/id.json \
  --allow-unfunded-recipient
TXSIG="<Signature>"

# ── Step 3: Retry ──────────────────────────────────────────────────────────
curl -s -X POST http://localhost:3402/agent-hire \
  -H "Content-Type: application/json" \
  -H "X-Payment: $TXSIG" \
  -d '{"game_id":703932,"agent_id":0,"duration_seconds":3600,"hirer_pubkey":"<YOUR_PUBKEY>"}' \
  | jq .

# 期待される response:
# { "ok": true, "session_id": "...", "agent_id": 0, "expires_at": ... }
```

---

### 2-C. `/card-buy` — 0.01 SOL (⚠️ バグあり — 下記参照)

**概要**: P2P カードマーケット購入 (facilitator fee = 0.01 SOL)。

```bash
# ── Step 1: Probe ─────────────────────────────────────────────────────────
curl -s -X POST http://localhost:3402/card-buy \
  -H "Content-Type: application/json" \
  -d '{"card_id":5,"seller_pubkey":"<SELLER_PUBKEY>","buyer_pubkey":"<BUYER_PUBKEY>","price_lamports":50000000}' \
  -v 2>&1 | grep -E "< HTTP|X-Payment-Required|reason"

# HTTP 402

# ── Step 2: 送金 (0.01 SOL) ──────────────────────────────────────────────
solana transfer DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R 0.01 \
  --url devnet \
  --keypair ~/.config/solana/id.json \
  --allow-unfunded-recipient
TXSIG="<Signature>"

# ── Step 3: Retry ──────────────────────────────────────────────────────────
curl -s -X POST http://localhost:3402/card-buy \
  -H "Content-Type: application/json" \
  -H "X-Payment: $TXSIG" \
  -d '{"card_id":5,"seller_pubkey":"<SELLER_PUBKEY>","buyer_pubkey":"<BUYER_PUBKEY>","price_lamports":50000000}' \
  | jq .
```

⚠️ **既知バグ**: `agent-broker.js` 709行目に引数ミスがある:

```javascript
// 現状 (バグ):
const result = await verifySolPayment(payment, RECIPIENT_WALLET, CARD_BUY_MIN_LAMPORTS);
//                                               ^^^^^^^^^^^^^^^ 余計な引数 — minLamports として解釈される

// 正しくは:
const result = await verifySolPayment(payment, CARD_BUY_MIN_LAMPORTS);
```

`RECIPIENT_WALLET` (文字列) が `minLamports` に渡されて `NaN` になるため、verification が常に通過する。  
Pitch で見せるなら先に1行修正しておくことを推奨。

---

## 3. Replay Protection の確認

```bash
# 直前の Step 3 で使ったのと同じ TXSIG で再度リクエスト
TXSIG="<さっきと同じ署名>"

curl -s -X POST http://localhost:3402/scout-peek \
  -H "Content-Type: application/json" \
  -H "X-Payment: $TXSIG" \
  -d '{"game_id":703932,"target_pubkey":"<TARGET_PLAYER_PUBKEY>"}' \
  | jq .

# 期待される response (402):
# { "error": "Payment verification failed", "reason": "Signature already used" }
```

**確認できること**: 同一 signature を2回使うと 402 + `"Signature already used"` が返る。

**制限事項 (pitch 前に把握)**: Replay protection は in-memory `Set` なのでサーバー再起動でリセットされる。プロダクション版では Redis や DB への永続化が必要。

---

## 4. バランス差分の確認

送金前後でブローカーウォレットの残高差を確認:

```bash
# 送金前
solana balance DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R --url devnet

# 送金・x402 cycle 実行後
solana balance DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R --url devnet
```

または Solana Explorer で直接確認:  
`https://explorer.solana.com/address/DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R?cluster=devnet`

---

## 5. Pitch 動画で使える確認フロー (推奨順)

1. `curl /health` → サーバー起動確認
2. `curl /scout-peek` (no header) → **HTTP 402** + `X-Payment-Required` header 表示
3. `solana transfer 0.005 DPMPhn...` → **Solana Explorer で tx 確認**
4. `curl /scout-peek -H "X-Payment: <sig>"` → **HTTP 200** + カードデータ
5. 同 sig で再送 → **HTTP 402 "Signature already used"**
6. `solana balance DPMPhn...` → **+0.005 SOL 増加確認**

この順番で進めると「支払い → 情報取得 → replay reject → balance増加」が1フローで見せられる。

---

## 6. `/card-buy` バグ修正 (任意)

Pitch 前に修正するなら:

```bash
# agent-broker.js 709行目
# 変更前:
#   const result = await verifySolPayment(payment, RECIPIENT_WALLET, CARD_BUY_MIN_LAMPORTS);
# 変更後:
#   const result = await verifySolPayment(payment, CARD_BUY_MIN_LAMPORTS);
```

1行の修正。修正後は `/card-buy` も verification が正しく動く。

---

## 7. Fly.io へのデプロイ (本番環境が必要な場合)

```bash
cd legacy/phase-c/x402

# flyctl インストール済み前提
fly auth login
fly deploy

# Secrets 設定
fly secrets set BROKER_WALLET=DPMPhnVezSq5im35p4w3bC6XjpNZuuvCDVSAVxw4Q28R
fly secrets set SOLANA_RPC_URL=https://api.devnet.solana.com

# デプロイ後 URL
# https://oxark-agent-broker.fly.dev/health
```

デプロイすれば curl のベース URL を `http://localhost:3402` から  
`https://oxark-agent-broker.fly.dev` に変えるだけで全手順がそのまま使える。

---

## まとめ

| 確認項目 | 手段 | 期待結果 |
|---------|------|---------|
| 402 受信 | X-Payment なし curl | HTTP 402 + X-Payment-Required header |
| SOL 支払い | solana transfer | Solana Explorer で confirmed |
| 200 取得 | X-Payment: txsig curl | HTTP 200 + data |
| balance 増加 | solana balance | +0.005/0.05/0.01 SOL |
| replay reject | 同 sig で再送 | HTTP 402 "Signature already used" |
| /card-buy | バグ修正後に確認 | 上記と同様 |
