// ═══════════════════════════════════════════════════════════════════════════
// MODULE: 09-victory-scene.js
// T-D13-D: M4 Victory / Defeat screen per UI_SPEC v2.0 Section 4.
//
// Scene key: 'duel_victory'
// Entry:  triggerVictoryScene(duelResult)  — called from 08-duel-scene.js
// Render: drawVictoryScene()               — called from 09-game-loop.js
// Input:  handleVictoryInput(px, py)       — called from 10-input.js
// Exit:   _exitVictoryScene()              — fades to lobby
//
// duelResult shape:
//   { won, hallTier, ante, roundsPlayed, finalWinnerHP, finalLoserHP,
//     totalDamageDealt, cardsDestroyed, shardsEarned, cardCountBefore,
//     transferredCards, transferTxHash, transferFallback }
// ═══════════════════════════════════════════════════════════════════════════

// ── State ─────────────────────────────────────────────────────────────────
let VS = null;        // victory scene state
let _vsFrame = 0;     // frame counter since scene init (for animations)

// ── Constants ─────────────────────────────────────────────────────────────
const VS_CARD_ANIM_DURATION = 50;  // frames for card fly-in
const VS_COUNTER_DURATION   = 30;  // frames for card-count roll
const VS_CONTINUE_BX = W - 95, VS_CONTINUE_BY = H - 22;
const VS_CONTINUE_BW = 88, VS_CONTINUE_BH = 16;

// ── Entry point ────────────────────────────────────────────────────────────
/**
 * Called at duel end to kick off the Victory / Defeat scene.
 * @param {Object} duelResult  — see header for shape
 */
function triggerVictoryScene(duelResult) {
  VS = {
    won:              duelResult.won,
    hallTier:         duelResult.hallTier || 0,
    ante:             duelResult.ante     || 0,
    roundsPlayed:     duelResult.roundsPlayed     || 0,
    finalWinnerHP:    duelResult.finalWinnerHP     || 0,
    finalLoserHP:     duelResult.finalLoserHP      || 0,
    totalDamageDealt: duelResult.totalDamageDealt  || 0,
    shardsEarned:     duelResult.shardsEarned      || 0,
    cardCountBefore:  duelResult.cardCountBefore   || 0,
    // NFT transfer result
    transferredCards: duelResult.transferredCards  || [],   // [{ card_id, name }]
    transferTxHash:   duelResult.transferTxHash    || null,
    transferFallback: duelResult.transferFallback  || null, // null | { amount_sol }
    // UI animation state
    cardAnimFrame:    0,
    counterStart:     duelResult.cardCountBefore   || 0,
    counterTarget:    (duelResult.cardCountBefore  || 0) +
                      (duelResult.won ? (duelResult.transferredCards || []).length : 0),
    counterCurrent:   duelResult.cardCountBefore   || 0,
    confetti:         _makeConfetti(60),
    phase:            'animate',  // 'animate' | 'idle'
  };
  _vsFrame = 0;

  fadeOut(function () {
    sc = 'duel_victory';
    fadeIn();
  });
}

// ── Confetti helper ────────────────────────────────────────────────────────
function _makeConfetti(n) {
  var arr = [];
  for (var i = 0; i < n; i++) {
    arr.push({
      x:  Math.random() * W,
      y:  -Math.random() * H,
      vx: (Math.random() - 0.5) * 0.8,
      vy: 0.5 + Math.random() * 1.2,
      r:  1 + Math.random() * 2,
      color: ['#ffd700','#ff9900','#ffe04b','#ffffff','#40e080'][Math.floor(Math.random() * 5)],
    });
  }
  return arr;
}

// ── Main render ────────────────────────────────────────────────────────────
function drawVictoryScene() {
  if (!VS) return;
  _vsFrame++;

  var won       = VS.won;
  var cardAnim  = Math.min(1, VS.cardAnimFrame / VS_CARD_ANIM_DURATION);

  // ── Background
  g.fillStyle = won ? '#0a1a10' : '#120808';
  g.fillRect(0, 0, W, H);

  // ── Subtle grid texture
  g.strokeStyle = won ? 'rgba(64,224,128,0.04)' : 'rgba(224,64,64,0.04)';
  g.lineWidth = 0.5;
  for (var gx = 0; gx < W; gx += 20) { g.beginPath(); g.moveTo(gx,0); g.lineTo(gx,H); g.stroke(); }
  for (var gy = 0; gy < H; gy += 20) { g.beginPath(); g.moveTo(0,gy); g.lineTo(W,gy); g.stroke(); }

  // ── Confetti (winner only)
  if (won) _drawConfetti();

  // ── Top banner
  _drawBanner(won);

  // ── Cards collected counter
  _drawCardCounter();

  // ── Transferred cards animation
  _drawTransferredCards(cardAnim);

  // ── Reward panels
  _drawRewardPanels();

  // ── TX panel
  _drawTxPanel();

  // ── Continue button
  _drawContinueButton();

  // Advance animation state
  if (VS.cardAnimFrame < VS_CARD_ANIM_DURATION) VS.cardAnimFrame++;
  if (_vsFrame > VS_CARD_ANIM_DURATION) {
    var t = Math.min(1, (_vsFrame - VS_CARD_ANIM_DURATION) / VS_COUNTER_DURATION);
    VS.counterCurrent = Math.round(
      VS.counterStart + (VS.counterTarget - VS.counterStart) * t
    );
  }
}

// ── Banner ─────────────────────────────────────────────────────────────────
function _drawBanner(won) {
  var pulse   = 0.8 + 0.2 * Math.sin(_vsFrame * 0.1);
  var bannerY = 20;

  // Glow
  var glow = g.createRadialGradient(W / 2, bannerY, 0, W / 2, bannerY, 80);
  glow.addColorStop(0, won ? 'rgba(96,224,128,0.18)' : 'rgba(224,80,64,0.18)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, W, 44);

  var text  = won ? 'VICTORY' : 'DEFEAT';
  var color = won ? `rgba(${Math.round(96*pulse)},224,${Math.round(96*pulse)},1)` : '#c05040';

  g.save();
  g.font      = 'bold 18px monospace';
  g.textAlign = 'center';
  g.textBaseline = 'middle';

  // Drop shadow
  g.fillStyle = 'rgba(0,0,0,0.8)';
  g.fillText(text, W / 2 + 1, bannerY + 1);
  g.fillStyle = color;
  g.fillText(text, W / 2, bannerY);

  g.font = '6px monospace';
  g.fillStyle = '#506070';
  var hallNames = ['BRONZE', 'SILVER', 'GOLD'];
  g.fillText((hallNames[VS.hallTier] || 'BRONZE') + ' HALL — DUEL COMPLETE', W / 2, bannerY + 13);
  g.restore();
}

// ── Cards collected counter ────────────────────────────────────────────────
function _drawCardCounter() {
  var y = 46;
  g.save();
  g.font = '7px monospace';
  g.textAlign = 'center';
  g.textBaseline = 'top';

  var delta   = VS.counterTarget - VS.counterStart;
  var sign    = delta > 0 ? '+' : (delta < 0 ? '' : '+');
  var deltaStr = delta !== 0 ? ` (${sign}${delta})` : '';
  var txt  = 'Cards Collected: ' + VS.counterStart + ' \u2192 ' +
             VS.counterCurrent + deltaStr;

  g.fillStyle = '#6080a0';
  g.fillText(txt, W / 2, y);
  g.restore();
}

// ── Transferred cards animation ────────────────────────────────────────────
function _drawTransferredCards(t) {
  var cards   = VS.transferredCards;
  var cardY0  = 62;   // start Y
  var cardH   = 60;
  var cardW   = 44;
  var count   = Math.min(cards.length, 2);
  var fallback = VS.transferFallback;

  g.save();
  g.textAlign = 'center';
  g.textBaseline = 'middle';

  if (count === 0 && fallback) {
    // Fallback: shop credit
    g.font = '7px monospace';
    g.fillStyle = '#a0b8c8';
    g.fillText('Shop credit awarded', W / 2, cardY0 + cardH / 2);
    g.font = 'bold 9px monospace';
    g.fillStyle = '#ffd700';
    g.fillText(fallback.amount_sol.toFixed(3) + ' SOL', W / 2, cardY0 + cardH / 2 + 14);
    g.restore();
    return;
  }

  if (count === 0) {
    g.font = '6px monospace';
    g.fillStyle = '#506070';
    g.fillText('No cards transferred', W / 2, cardY0 + cardH / 2);
    g.restore();
    return;
  }

  var spacing = cardW + 12;
  var startX  = W / 2 - (count - 1) * spacing / 2;

  for (var i = 0; i < count; i++) {
    var card   = cards[i];
    var cx     = startX + i * spacing;
    var eased  = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    // Cards fly from right edge (opponent side) to final position
    var cx0    = VS.won ? W + 20 : cx; // winner: cards fly from right
    var cx1    = cx;
    var drawnX = cx0 + (cx1 - cx0) * eased;
    var drawnY = cardY0 + (1 - eased) * 30;

    // Card frame
    g.save();
    g.shadowColor  = '#ffd700';
    g.shadowBlur   = 6 + 4 * Math.sin(_vsFrame * 0.15);
    g.strokeStyle  = '#c8960a';
    g.fillStyle    = '#0a1422';
    g.lineWidth    = 1.5;
    _roundRect(drawnX - cardW / 2, drawnY, cardW, cardH, 3);
    g.fill();
    g.stroke();
    g.shadowBlur = 0;
    g.restore();

    // Card ID or name
    g.font = '5px monospace';
    g.fillStyle = '#80a0c0';
    g.fillText('CARD', drawnX, drawnY + 8);
    g.font = 'bold 11px monospace';
    g.fillStyle = '#ffffff';
    g.fillText('#' + (card.card_id || '?'), drawnX, drawnY + 22);
    if (card.name) {
      g.font = '5px monospace';
      g.fillStyle = '#a0b8c0';
      g.fillText(card.name.slice(0, 8), drawnX, drawnY + 32);
    }

    // "NEW" badge (after animation settles)
    if (t > 0.85 && VS.won) {
      var badgeAlpha = (t - 0.85) / 0.15;
      g.fillStyle = 'rgba(255,215,0,' + badgeAlpha + ')';
      g.fillRect(drawnX - 10, drawnY - 6, 20, 9);
      g.font = 'bold 5px monospace';
      g.fillStyle = '#000';
      g.fillText('NEW', drawnX, drawnY - 1);
    }

    // Chain trail from opponent area
    if (t < 0.9 && t > 0.1) {
      g.save();
      g.strokeStyle = 'rgba(255,215,0,' + (1 - t) * 0.4 + ')';
      g.lineWidth   = 1;
      g.setLineDash([3, 4]);
      g.beginPath();
      g.moveTo(W - 10, cardY0 + cardH / 2);
      g.lineTo(drawnX, drawnY + cardH / 2);
      g.stroke();
      g.setLineDash([]);
      g.restore();
    }
  }

  g.restore();
}

// ── Round rect helper ──────────────────────────────────────────────────────
function _roundRect(x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y);
  g.arcTo(x + w, y, x + w, y + r, r);
  g.lineTo(x + w, y + h - r);
  g.arcTo(x + w, y + h, x + w - r, y + h, r);
  g.lineTo(x + r, y + h);
  g.arcTo(x, y + h, x, y + h - r, r);
  g.lineTo(x, y + r);
  g.arcTo(x, y, x + r, y, r);
  g.closePath();
}

// ── Reward panels ──────────────────────────────────────────────────────────
function _drawRewardPanels() {
  var panelY  = 140;
  var panelH  = 54;
  var panelX  = 16;
  var panelW  = W - 32;
  var won     = VS.won;

  // Panel background
  g.fillStyle = 'rgba(12,22,32,0.85)';
  _roundRect(panelX, panelY, panelW, panelH, 3);
  g.fill();
  g.strokeStyle = won ? '#1e4430' : '#3a1818';
  g.lineWidth   = 1;
  _roundRect(panelX, panelY, panelW, panelH, 3);
  g.stroke();

  var cols   = [panelX + 18, panelX + panelW * 0.3, panelX + panelW * 0.57, panelX + panelW * 0.78];
  var row1Y  = panelY + 14;
  var row2Y  = panelY + 32;

  // Labels
  g.font      = '5px monospace';
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillStyle    = '#506070';
  g.fillText('ANTE',     cols[0], row1Y - 6);
  g.fillText('XP',       cols[1], row1Y - 6);
  g.fillText('SHARDS',   cols[2], row1Y - 6);
  g.fillText('ROUNDS',   cols[3], row1Y - 6);

  // Values
  g.font      = 'bold 9px monospace';
  var anteSign = won ? '+' : '-';
  var anteColor = won ? '#40e080' : '#e06040';
  g.fillStyle  = anteColor;
  g.fillText(anteSign + (VS.ante / 1e9).toFixed(3) + ' SOL', cols[0], row1Y + 5);

  var xp = won ? 250 : 50;
  g.fillStyle = '#60b0ff';
  g.fillText('+' + xp + ' XP', cols[1], row1Y + 5);

  g.fillStyle = '#ffd700';
  g.fillText(VS.shardsEarned + '/5', cols[2], row1Y + 5);

  g.fillStyle = '#a0b8c8';
  g.fillText(VS.roundsPlayed + '/5', cols[3], row1Y + 5);

  // HP row
  g.font      = '5px monospace';
  g.fillStyle = '#506070';
  g.fillText('HP FINAL:', cols[0], row2Y);
  g.font      = '7px monospace';
  g.fillStyle = '#40e080';
  g.fillText(VS.finalWinnerHP + ' / ' + VS.finalLoserHP, cols[0] + 38, row2Y);

  // Damage row
  g.font      = '5px monospace';
  g.fillStyle = '#506070';
  g.fillText('DMG DEALT:', cols[1] + 2, row2Y);
  g.font      = '7px monospace';
  g.fillStyle = '#ff8040';
  g.fillText(VS.totalDamageDealt, cols[1] + 46, row2Y);
}

// ── TX panel ───────────────────────────────────────────────────────────────
function _drawTxPanel() {
  var y   = 202;
  var h   = 22;
  var x   = 16;
  var w   = W - 32;

  g.fillStyle = 'rgba(8,16,24,0.9)';
  _roundRect(x, y, w, h, 2);
  g.fill();
  g.strokeStyle = '#1a2a3a';
  g.lineWidth   = 0.5;
  _roundRect(x, y, w, h, 2);
  g.stroke();

  g.textBaseline = 'middle';
  var midY = y + h / 2;

  if (VS.transferTxHash) {
    var hash    = VS.transferTxHash;
    var short   = hash.slice(0, 4) + '…' + hash.slice(-4);

    // Green checkmark
    g.font      = '8px monospace';
    g.fillStyle = '#40e080';
    g.textAlign = 'left';
    g.fillText('✓', x + 6, midY);

    g.font      = '6px monospace';
    g.fillStyle = '#60a0c0';
    g.fillText('TX: ' + short, x + 18, midY);

    // Store hash rect for click detection
    VS._txHashRect = { x: x + 18, y: y, w: 80, h };

    g.font      = '5px monospace';
    g.fillStyle = '#304050';
    g.textAlign = 'right';
    g.fillText('[Solscan ↗]', x + w - 6, midY);
    VS._solscanRect = { x: x + w - 60, y, w: 56, h };

  } else if (VS.transferFallback) {
    g.font      = '6px monospace';
    g.fillStyle = '#a08040';
    g.textAlign = 'center';
    g.fillText('Shop credit awarded — transfer deferred', W / 2, midY);

  } else {
    g.font      = '6px monospace';
    g.fillStyle = '#405060';
    g.textAlign = 'center';
    g.fillText('Transfer pending…', W / 2, midY);
  }

  g.textAlign = 'left';
}

// ── Continue button ────────────────────────────────────────────────────────
function _drawContinueButton() {
  var bx   = VS_CONTINUE_BX;
  var by   = VS_CONTINUE_BY;
  var bw   = VS_CONTINUE_BW;
  var bh   = VS_CONTINUE_BH;
  var pulse = _vsFrame % 40 < 20;

  g.fillStyle  = pulse ? '#1a3828' : '#101e14';
  _roundRect(bx, by, bw, bh, 2);
  g.fill();
  g.strokeStyle = '#40a060';
  g.lineWidth   = 1;
  _roundRect(bx, by, bw, bh, 2);
  g.stroke();

  g.font         = 'bold 7px monospace';
  g.fillStyle    = '#60e080';
  g.textAlign    = 'center';
  g.textBaseline = 'middle';
  var label = VS.won ? 'CONTINUE \u2192' : 'RETURN TO LOBBY \u2192';
  g.fillText(label, bx + bw / 2, by + bh / 2);
  g.textAlign = 'left';
}

// ── Confetti ───────────────────────────────────────────────────────────────
function _drawConfetti() {
  if (!VS.won) return;
  var alpha = Math.min(1, _vsFrame / 20) * Math.max(0, 1 - (_vsFrame - 120) / 60);
  if (alpha <= 0) return;
  VS.confetti.forEach(function (p) {
    p.x += p.vx;
    p.y += p.vy;
    if (p.y > H + 4) { p.y = -4; p.x = Math.random() * W; }
    g.fillStyle = p.color;
    g.globalAlpha = alpha;
    g.fillRect(p.x, p.y, p.r, p.r);
  });
  g.globalAlpha = 1;
}

// ── Input handler ──────────────────────────────────────────────────────────
function handleVictoryInput(px, py) {
  if (!VS) return;

  // Solscan link
  if (VS._solscanRect && VS.transferTxHash) {
    var sr = VS._solscanRect;
    if (px >= sr.x && px <= sr.x + sr.w && py >= sr.y && py <= sr.y + sr.h) {
      window.open(
        'https://solscan.io/tx/' + VS.transferTxHash + '?cluster=devnet',
        '_blank',
        'noopener'
      );
      return;
    }
  }

  // Continue button
  var bx = VS_CONTINUE_BX, by = VS_CONTINUE_BY;
  var bw = VS_CONTINUE_BW, bh = VS_CONTINUE_BH;
  if (px >= bx && px <= bx + bw && py >= by && py <= by + bh) {
    _exitVictoryScene();
  }
}

// ── Exit ───────────────────────────────────────────────────────────────────
function _exitVictoryScene() {
  VS = null;
  _vsFrame = 0;
  fadeOut(function () {
    sc = 'lobby';
    exitDuelScene();
    fadeIn();
  });
}

// ── Card selection helper (T-D13-B) ────────────────────────────────────────
/**
 * Deterministic card selection for NFT transfer on duel win.
 * Per GDD v2.0 Section 5.5 — called when duel resolves.
 *
 * @param {Array}  loserCards    [{card_id, mint, name, rarity}]
 * @param {Array}  winnerCards   [{card_id, mint, name}]
 * @param {string} duelId        duel PDA pubkey string (used as RNG seed)
 * @param {string} winnerPubkey  base58 pubkey (used as RNG seed)
 * @param {number} hallTier      0=bronze, 1=silver, 2=gold
 * @returns {{ cards: Array, fallback: Object|null }}
 */
function selectTransferCards(loserCards, winnerCards, duelId, winnerPubkey, hallTier) {
  var winnerCardIds = new Set(winnerCards.map(function (c) { return c.card_id; }));

  // T-D13-B2: Exclude Legendaries (rarity=5) unless Gold Hall
  var eligible = loserCards.filter(function (c) {
    if (c.rarity >= 5 && hallTier < 2) return false; // not Gold Hall — skip Legendaries
    return !winnerCardIds.has(c.card_id);             // skip duplicates
  });

  if (eligible.length === 0) {
    return {
      cards:    [],
      fallback: { amount_sol: 0.024, reason: 'all_duplicates' },
    };
  }

  // Deterministic RNG seeded by duelId + winnerPubkey
  var seed = _hashStr(duelId + winnerPubkey);
  var rng  = _seedRng(seed);

  var remaining = eligible.slice();
  var selected  = [];
  for (var i = 0; i < 2 && remaining.length > 0; i++) {
    var idx = Math.floor(rng() * remaining.length);
    selected.push(remaining.splice(idx, 1)[0]);
  }

  // T-D13-B3: 1-card fallback
  var fallback = null;
  if (selected.length === 1) {
    fallback = { amount_sol: 0.012, reason: 'only_one_eligible' };
  }

  return { cards: selected, fallback };
}

// Simple deterministic hash → seed
function _hashStr(s) {
  var h = 0x811c9dc5;
  for (var i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h;
}

// Mulberry32 PRNG
function _seedRng(seed) {
  var s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    var t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
