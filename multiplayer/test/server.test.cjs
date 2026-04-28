/**
 * 0xARK Multiplayer Server — Handler Tests
 *
 * Tests the HANDLERS dispatch table and each _handleXxx function in isolation.
 * server.js is an ES module that boots a live WS server on import, so all
 * handler logic is replicated here with the same signatures and inline mocks.
 *
 * Run: node multiplayer/test/server.test.js
 */

'use strict';

const assert = require('node:assert/strict');

// ─── Test runner ─────────────────────────────────────────────────────────────
let passed = 0, failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    failed++;
  }
}
function suite(name, fn) {
  console.log(`\n${name}`);
  fn();
}

// ─── Minimal infrastructure mocks ────────────────────────────────────────────

function makeWs(overrides = {}) {
  const sent = [];
  return {
    playerId:   overrides.playerId   ?? 'player-1',
    playerName: overrides.playerName ?? null,
    wallet:     overrides.wallet     ?? null,
    clan:       overrides.clan       ?? null,
    cardCount:  overrides.cardCount  ?? 0,
    season:     overrides.season     ?? 1,
    roomId:     overrides.roomId     ?? null,
    readyState: 1, // OPEN
    sent,
    send(data) { this.sent.push(JSON.parse(data)); },
    ...overrides,
  };
}

function makeRoom(hostWs, overrides = {}) {
  const room = {
    id:      overrides.id      ?? 'room-1',
    gameId:  overrides.gameId  ?? null,
    host:    overrides.host    ?? hostWs.playerId,
    players: overrides.players ?? new Map(),
    ...overrides,
  };
  return room;
}

// Module-level state (mirrors server.js closure scope)
function makeContext() {
  const rooms = new Map();

  function sanitizeClan(clan) {
    const VALID_CLANS = new Set(['black_flag','sovereign_bourse','hollow_blade','iron_circle','nameless_silk']);
    return (typeof clan === 'string' && VALID_CLANS.has(clan)) ? clan : null;
  }

  function player(ws, x, y) {
    return { id: ws.playerId, name: ws.playerName, wallet: ws.wallet,
             clan: ws.clan, card_count: ws.cardCount, season: ws.season, ws, x, y, area: 0 };
  }

  function serializePlayers(room) {
    return Array.from(room.players.values()).map(
      ({ id, name, wallet, clan, card_count, season, x, y, area }) =>
        ({ id, name, wallet, clan, card_count, season, position: { x, y }, area })
    );
  }

  function send(ws, msg) {
    if (ws.readyState === 1) ws.send(JSON.stringify(msg));
  }

  function broadcast(room, msg, excludeId) {
    const data = JSON.stringify(msg);
    room.players.forEach((p) => {
      if (p.id !== excludeId && p.ws.readyState === 1) p.ws.send(data);
    });
  }

  const ZK_VISIBLE_RADIUS = 3;
  function broadcastProximity(room, moverId, msg) {
    const mover = room.players.get(moverId);
    if (!mover) return;
    const data = JSON.stringify(msg);
    room.players.forEach((p) => {
      if (p.id === moverId || p.ws.readyState !== 1) return;
      const inTown = mover.area === 0 && p.area === 0;
      const dist = Math.abs(mover.x - p.x) + Math.abs(mover.y - p.y);
      if (inTown || (mover.area === p.area && dist <= ZK_VISIBLE_RADIUS)) p.ws.send(data);
    });
  }

  function generateRoomId() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }

  // ── Handler functions (matching server.js) ──────────────────────────────────

  function _handleCreateRoom(ws, msg) {
    const roomId = generateRoomId();
    ws.playerName = typeof msg.name === 'string' ? msg.name.slice(0, 24) : 'Host';
    ws.wallet     = typeof msg.wallet === 'string' ? msg.wallet.slice(0, 44) : null;
    ws.clan       = sanitizeClan(msg.clan);
    ws.cardCount  = typeof msg.card_count === 'number' ? Math.max(0, msg.card_count | 0) : 0;
    ws.season     = typeof msg.season === 'number' ? msg.season | 0 : 1;
    ws.roomId     = roomId;
    const room = { id: roomId, gameId: msg.gameId ?? null, host: ws.playerId, players: new Map() };
    room.players.set(ws.playerId, player(ws, 15, 13));
    rooms.set(roomId, room);
    send(ws, { type: 'room_created', roomId, gameId: room.gameId, playerId: ws.playerId });
  }

  function _handleJoinRoom(ws, msg) {
    const room = rooms.get(msg.roomId);
    if (!room) { send(ws, { type: 'error', message: 'Room not found' }); return; }
    ws.playerName = typeof msg.name === 'string' ? msg.name.slice(0, 24) : `Player ${room.players.size + 1}`;
    ws.wallet     = typeof msg.wallet === 'string' ? msg.wallet.slice(0, 44) : null;
    ws.clan       = sanitizeClan(msg.clan);
    ws.cardCount  = typeof msg.card_count === 'number' ? Math.max(0, msg.card_count | 0) : 0;
    ws.season     = typeof msg.season === 'number' ? msg.season | 0 : 1;
    ws.roomId     = msg.roomId;
    room.players.set(ws.playerId, player(ws, 20, 15));
    const playerList = serializePlayers(room);
    send(ws, { type: 'room_joined', roomId: msg.roomId, gameId: room.gameId, playerId: ws.playerId, players: playerList });
    broadcast(room, {
      type: 'player_joined',
      player: { id: ws.playerId, name: ws.playerName, wallet: ws.wallet,
                clan: ws.clan, card_count: ws.cardCount, season: ws.season,
                position: { x: 20, y: 15 } },
    }, ws.playerId);
  }

  function _handlePresenceUpdate(ws, msg) {
    const room = ws.roomId ? rooms.get(ws.roomId) : null;
    if (!room) return;
    if (msg.clan !== undefined) ws.clan = sanitizeClan(msg.clan);
    if (typeof msg.card_count === 'number') ws.cardCount = Math.max(0, msg.card_count | 0);
    const p = room.players.get(ws.playerId);
    if (p) { p.clan = ws.clan; p.card_count = ws.cardCount; }
    broadcast(room, { type: 'presence_update', wallet: ws.wallet, clan: ws.clan, card_count: ws.cardCount });
  }

  function _handleMove(ws, msg) {
    const room = ws.roomId ? rooms.get(ws.roomId) : null;
    if (!room) return;
    const p = room.players.get(ws.playerId);
    if (!p) return;
    const nx = typeof msg.x === 'number' ? Math.max(0, Math.min(79, msg.x | 0)) : p.x;
    const ny = typeof msg.y === 'number' ? Math.max(0, Math.min(79, msg.y | 0)) : p.y;
    const na = typeof msg.area === 'number' ? Math.max(0, Math.min(5, msg.area | 0)) : p.area;
    p.x = nx; p.y = ny; p.area = na;
    broadcastProximity(room, ws.playerId, { type: 'player_moved', playerId: ws.playerId, x: p.x, y: p.y, area: p.area });
  }

  function _handleChat(ws, msg) {
    const room = ws.roomId ? rooms.get(ws.roomId) : null;
    if (!room) return;
    if (typeof msg.message !== 'string') return;
    const message = msg.message.slice(0, 200);
    broadcast(room, { type: 'chat', playerId: ws.playerId, name: ws.playerName, message });
  }

  function _handleDuelHandCommitted(ws, msg) {
    const room = ws.roomId ? rooms.get(ws.roomId) : null;
    if (!room) return;
    const duelId = typeof msg.duel_id === 'string' ? msg.duel_id.slice(0, 64) : null;
    const round  = typeof msg.round === 'number' ? Math.max(1, Math.min(5, msg.round | 0)) : null;
    const commitmentHex = typeof msg.commitment_hex === 'string' ? msg.commitment_hex.slice(0, 64) : null;
    if (!duelId || round === null || !commitmentHex) return;
    broadcast(room, { type: 'duel_hand_committed', playerId: ws.playerId, duel_id: duelId, round, commitment_hex: commitmentHex }, ws.playerId);
  }

  function _handleDuelHandRevealed(ws, msg) {
    const room = ws.roomId ? rooms.get(ws.roomId) : null;
    if (!room) return;
    const duelId  = typeof msg.duel_id === 'string' ? msg.duel_id.slice(0, 64) : null;
    const round   = typeof msg.round === 'number' ? Math.max(1, Math.min(5, msg.round | 0)) : null;
    const cardIds = Array.isArray(msg.card_ids) ? msg.card_ids.map(x => (x | 0) & 0xffff).slice(0, 10) : null;
    if (!duelId || round === null || !cardIds) return;
    broadcast(room, { type: 'duel_hand_revealed', playerId: ws.playerId, duel_id: duelId, round, card_ids: cardIds }, ws.playerId);
  }

  function _handleDuelPhaseAdvance(ws, msg) {
    const room = ws.roomId ? rooms.get(ws.roomId) : null;
    if (!room) return;
    if (room.host !== ws.playerId) return;
    const duelId = typeof msg.duel_id === 'string' ? msg.duel_id.slice(0, 64) : null;
    const phase  = typeof msg.phase === 'string' ? msg.phase.slice(0, 16) : null;
    const round  = typeof msg.round === 'number' ? Math.max(1, Math.min(5, msg.round | 0)) : null;
    if (!duelId || !phase || round === null) return;
    broadcast(room, { type: 'duel_phase_advance', duel_id: duelId, phase, round });
  }

  function _handleDuelBattleResolved(ws, msg) {
    const room = ws.roomId ? rooms.get(ws.roomId) : null;
    if (!room) return;
    if (room.host !== ws.playerId) return;
    const duelId  = typeof msg.duel_id === 'string' ? msg.duel_id.slice(0, 64) : null;
    const round   = typeof msg.round === 'number' ? Math.max(1, Math.min(5, msg.round | 0)) : null;
    const p1Delta = typeof msg.p1_hp_delta === 'number' ? msg.p1_hp_delta | 0 : 0;
    const p2Delta = typeof msg.p2_hp_delta === 'number' ? msg.p2_hp_delta | 0 : 0;
    if (!duelId || round === null) return;
    broadcast(room, { type: 'duel_battle_resolved', duel_id: duelId, round, p1_hp_delta: p1Delta, p2_hp_delta: p2Delta });
  }

  function _handleDuelEnded(ws, msg) {
    const room = ws.roomId ? rooms.get(ws.roomId) : null;
    if (!room) return;
    if (room.host !== ws.playerId) return;
    const duelId = typeof msg.duel_id === 'string' ? msg.duel_id.slice(0, 64) : null;
    const winner = typeof msg.winner === 'string' ? msg.winner.slice(0, 44) : null;
    if (!duelId) return;
    broadcast(room, { type: 'duel_ended', duel_id: duelId, winner });
  }

  const HANDLERS = {
    create_room:          _handleCreateRoom,
    join_room:            _handleJoinRoom,
    presence_update:      _handlePresenceUpdate,
    move:                 _handleMove,
    chat:                 _handleChat,
    duel_hand_committed:  _handleDuelHandCommitted,
    duel_hand_revealed:   _handleDuelHandRevealed,
    duel_phase_advance:   _handleDuelPhaseAdvance,
    duel_battle_resolved: _handleDuelBattleResolved,
    duel_ended:           _handleDuelEnded,
  };

  async function handleMessage(ws, msg) {
    const h = HANDLERS[msg.type];
    if (h) await h(ws, msg);
  }

  return { rooms, HANDLERS, handleMessage,
           _handleCreateRoom, _handleJoinRoom, _handlePresenceUpdate, _handleMove,
           _handleChat, _handleDuelHandCommitted, _handleDuelHandRevealed,
           _handleDuelPhaseAdvance, _handleDuelBattleResolved, _handleDuelEnded,
           sanitizeClan, player, send };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

suite('HANDLERS dispatch table', () => {
  test('contains all 10 expected message types', () => {
    const { HANDLERS } = makeContext();
    const expected = [
      'create_room','join_room','presence_update','move','chat',
      'duel_hand_committed','duel_hand_revealed','duel_phase_advance',
      'duel_battle_resolved','duel_ended',
    ];
    expected.forEach(k => assert.ok(typeof HANDLERS[k] === 'function', `missing: ${k}`));
  });

  test('unknown message type is a no-op (no throw)', async () => {
    const { handleMessage } = makeContext();
    const ws = makeWs();
    await handleMessage(ws, { type: '__unknown__' });
    assert.equal(ws.sent.length, 0);
  });

  test('known type dispatches (create_room sends room_created)', async () => {
    const { handleMessage } = makeContext();
    const ws = makeWs();
    await handleMessage(ws, { type: 'create_room', name: 'Alice' });
    assert.equal(ws.sent[0].type, 'room_created');
  });
});

suite('_handleCreateRoom', () => {
  test('creates a room in the rooms Map', () => {
    const { rooms, _handleCreateRoom } = makeContext();
    const ws = makeWs();
    _handleCreateRoom(ws, { name: 'Alice', gameId: 'g1' });
    assert.equal(rooms.size, 1);
  });

  test('sends room_created with roomId and playerId', () => {
    const { _handleCreateRoom } = makeContext();
    const ws = makeWs({ playerId: 'p1' });
    _handleCreateRoom(ws, { name: 'Bob' });
    assert.equal(ws.sent[0].type, 'room_created');
    assert.ok(ws.sent[0].roomId);
    assert.equal(ws.sent[0].playerId, 'p1');
  });

  test('sets ws fields from msg', () => {
    const { _handleCreateRoom } = makeContext();
    const ws = makeWs();
    _handleCreateRoom(ws, { name: 'Carol', wallet: 'wallet123', clan: 'black_flag', card_count: 5, season: 2 });
    assert.equal(ws.playerName, 'Carol');
    assert.equal(ws.wallet, 'wallet123');
    assert.equal(ws.clan, 'black_flag');
    assert.equal(ws.cardCount, 5);
    assert.equal(ws.season, 2);
  });

  test('invalid clan is sanitized to null', () => {
    const { _handleCreateRoom } = makeContext();
    const ws = makeWs();
    _handleCreateRoom(ws, { name: 'X', clan: '__evil__' });
    assert.equal(ws.clan, null);
  });

  test('playerName defaults to Host when name missing', () => {
    const { _handleCreateRoom } = makeContext();
    const ws = makeWs();
    _handleCreateRoom(ws, {});
    assert.equal(ws.playerName, 'Host');
  });

  test('player name is capped at 24 chars', () => {
    const { _handleCreateRoom } = makeContext();
    const ws = makeWs();
    _handleCreateRoom(ws, { name: 'A'.repeat(50) });
    assert.equal(ws.playerName.length, 24);
  });
});

suite('_handleJoinRoom', () => {
  test('sends error when room not found', () => {
    const { _handleJoinRoom } = makeContext();
    const ws = makeWs();
    _handleJoinRoom(ws, { roomId: 'NOPE' });
    assert.equal(ws.sent[0].type, 'error');
    assert.equal(ws.sent[0].message, 'Room not found');
  });

  test('sends room_joined and broadcasts player_joined', () => {
    const ctx = makeContext();
    const host = makeWs({ playerId: 'host' });
    ctx._handleCreateRoom(host, { name: 'Host' });
    const roomId = host.sent[0].roomId;

    const joiner = makeWs({ playerId: 'joiner' });
    ctx._handleJoinRoom(joiner, { roomId, name: 'Joiner' });

    assert.equal(joiner.sent[0].type, 'room_joined');
    assert.equal(joiner.sent[0].playerId, 'joiner');
    // Host should receive player_joined
    assert.equal(host.sent[1].type, 'player_joined');
    assert.equal(host.sent[1].player.id, 'joiner');
  });

  test('adds joiner to room.players', () => {
    const ctx = makeContext();
    const host = makeWs({ playerId: 'host' });
    ctx._handleCreateRoom(host, { name: 'Host' });
    const roomId = host.sent[0].roomId;
    const room = ctx.rooms.get(roomId);

    const joiner = makeWs({ playerId: 'joiner' });
    ctx._handleJoinRoom(joiner, { roomId, name: 'Joiner' });
    assert.equal(room.players.size, 2);
  });

  test('room_joined includes player list', () => {
    const ctx = makeContext();
    const host = makeWs({ playerId: 'host' });
    ctx._handleCreateRoom(host, { name: 'Host' });
    const roomId = host.sent[0].roomId;

    const joiner = makeWs({ playerId: 'joiner' });
    ctx._handleJoinRoom(joiner, { roomId, name: 'Joiner' });
    const msg = joiner.sent[0];
    assert.ok(Array.isArray(msg.players));
    assert.equal(msg.players.length, 2);
  });
});

suite('_handlePresenceUpdate', () => {
  test('no-op when player has no room', () => {
    const { _handlePresenceUpdate } = makeContext();
    const ws = makeWs({ roomId: null });
    _handlePresenceUpdate(ws, { clan: 'black_flag', card_count: 5 });
    assert.equal(ws.sent.length, 0);
  });

  test('updates ws clan and cardCount', () => {
    const ctx = makeContext();
    const host = makeWs({ playerId: 'host' });
    ctx._handleCreateRoom(host, { name: 'Host' });
    const roomId = host.sent[0].roomId;

    host.sent.length = 0;
    ctx._handlePresenceUpdate(host, { clan: 'iron_circle', card_count: 12 });
    assert.equal(host.clan, 'iron_circle');
    assert.equal(host.cardCount, 12);
  });

  test('broadcasts presence_update to room', () => {
    const ctx = makeContext();
    const host = makeWs({ playerId: 'host' });
    ctx._handleCreateRoom(host, { name: 'Host' });
    const roomId = host.sent[0].roomId;
    const joiner = makeWs({ playerId: 'joiner' });
    ctx._handleJoinRoom(joiner, { roomId, name: 'Joiner' });

    host.sent.length = 0;
    joiner.sent.length = 0;
    ctx._handlePresenceUpdate(host, { clan: 'iron_circle', card_count: 3 });
    // joiner should receive the presence_update broadcast
    assert.equal(joiner.sent[0].type, 'presence_update');
    assert.equal(joiner.sent[0].clan, 'iron_circle');
  });

  test('invalid clan sanitized to null in presence_update', () => {
    const ctx = makeContext();
    const host = makeWs({ playerId: 'host', clan: 'black_flag' });
    ctx._handleCreateRoom(host, { name: 'Host' });
    ctx._handlePresenceUpdate(host, { clan: 'bad_clan' });
    assert.equal(host.clan, null);
  });
});

suite('_handleMove', () => {
  test('no-op when player not in room', () => {
    const { _handleMove } = makeContext();
    const ws = makeWs({ roomId: null });
    _handleMove(ws, { x: 10, y: 10, area: 0 });
    assert.equal(ws.sent.length, 0);
  });

  test('clamps x/y to 0-79', () => {
    const ctx = makeContext();
    const host = makeWs({ playerId: 'host' });
    ctx._handleCreateRoom(host, { name: 'Host' });
    const roomId = host.sent[0].roomId;
    const room = ctx.rooms.get(roomId);
    const p = room.players.get('host');

    ctx._handleMove(host, { x: -5, y: 200, area: 0 });
    assert.equal(p.x, 0);
    assert.equal(p.y, 79);
  });

  test('clamps area to 0-5', () => {
    const ctx = makeContext();
    const host = makeWs({ playerId: 'host' });
    ctx._handleCreateRoom(host, { name: 'Host' });
    const roomId = host.sent[0].roomId;
    const room = ctx.rooms.get(roomId);
    const p = room.players.get('host');

    ctx._handleMove(host, { x: 10, y: 10, area: 99 });
    assert.equal(p.area, 5);
  });

  test('ZK proximity: town (area 0) broadcast reaches all players', () => {
    const ctx = makeContext();
    const host = makeWs({ playerId: 'host' });
    ctx._handleCreateRoom(host, { name: 'Host' });
    const roomId = host.sent[0].roomId;
    const joiner = makeWs({ playerId: 'joiner' });
    ctx._handleJoinRoom(joiner, { roomId, name: 'Joiner' });

    host.sent.length = 0;
    joiner.sent.length = 0;
    ctx._handleMove(host, { x: 5, y: 5, area: 0 });
    // Both in area 0 (town) — joiner receives player_moved
    assert.equal(joiner.sent[0].type, 'player_moved');
  });

  test('ZK proximity: dungeon area — far player does not receive move', () => {
    const ctx = makeContext();
    const host = makeWs({ playerId: 'host' });
    ctx._handleCreateRoom(host, { name: 'Host' });
    const roomId = host.sent[0].roomId;
    const joiner = makeWs({ playerId: 'joiner' });
    ctx._handleJoinRoom(joiner, { roomId, name: 'Joiner' });

    const room = ctx.rooms.get(roomId);
    // Force both into dungeon area 1, far apart
    room.players.get('host').area = 1;
    room.players.get('joiner').area = 1;
    room.players.get('host').x = 0;   room.players.get('host').y = 0;
    room.players.get('joiner').x = 50; room.players.get('joiner').y = 50;

    joiner.sent.length = 0;
    // Move host within area 1 — still far from joiner
    ctx._handleMove(host, { x: 1, y: 1, area: 1 });
    assert.equal(joiner.sent.length, 0);
  });
});

suite('_handleChat', () => {
  test('broadcasts chat to room', () => {
    const ctx = makeContext();
    const host = makeWs({ playerId: 'host' });
    ctx._handleCreateRoom(host, { name: 'Host' });
    const roomId = host.sent[0].roomId;
    const joiner = makeWs({ playerId: 'joiner' });
    ctx._handleJoinRoom(joiner, { roomId, name: 'Joiner' });

    joiner.sent.length = 0;
    ctx._handleChat(host, { message: 'hello' });
    assert.equal(joiner.sent[0].type, 'chat');
    assert.equal(joiner.sent[0].message, 'hello');
    assert.equal(joiner.sent[0].playerId, 'host');
  });

  test('caps message at 200 chars', () => {
    const ctx = makeContext();
    const host = makeWs({ playerId: 'host' });
    ctx._handleCreateRoom(host, { name: 'Host' });
    const roomId = host.sent[0].roomId;
    const joiner = makeWs({ playerId: 'joiner' });
    ctx._handleJoinRoom(joiner, { roomId, name: 'Joiner' });

    joiner.sent.length = 0;
    ctx._handleChat(host, { message: 'X'.repeat(500) });
    assert.equal(joiner.sent[0].message.length, 200);
  });

  test('no-op when message is not a string', () => {
    const ctx = makeContext();
    const host = makeWs({ playerId: 'host' });
    ctx._handleCreateRoom(host, { name: 'Host' });
    const roomId = host.sent[0].roomId;
    const joiner = makeWs({ playerId: 'joiner' });
    ctx._handleJoinRoom(joiner, { roomId, name: 'Joiner' });

    joiner.sent.length = 0;
    ctx._handleChat(host, { message: 12345 });
    assert.equal(joiner.sent.length, 0);
  });
});

suite('Duel protocol — commitment / reveal', () => {
  function setupDuel(ctx) {
    const host = makeWs({ playerId: 'host' });
    ctx._handleCreateRoom(host, { name: 'Host' });
    const roomId = host.sent[0].roomId;
    const opponent = makeWs({ playerId: 'opponent' });
    ctx._handleJoinRoom(opponent, { roomId, name: 'Opp' });
    host.sent.length = 0;
    opponent.sent.length = 0;
    return { host, opponent, roomId };
  }

  test('duel_hand_committed: relays commitment to opponent only', () => {
    const ctx = makeContext();
    const { host, opponent } = setupDuel(ctx);
    ctx._handleDuelHandCommitted(host, {
      duel_id: 'duel-abc', round: 1, commitment_hex: 'deadbeef00112233',
    });
    assert.equal(opponent.sent[0].type, 'duel_hand_committed');
    assert.equal(opponent.sent[0].commitment_hex, 'deadbeef00112233');
    assert.equal(host.sent.length, 0); // not sent back to sender
  });

  test('duel_hand_committed: no-op when fields missing', () => {
    const ctx = makeContext();
    const { host, opponent } = setupDuel(ctx);
    ctx._handleDuelHandCommitted(host, { duel_id: 'abc' }); // missing round + hex
    assert.equal(opponent.sent.length, 0);
  });

  test('duel_hand_revealed: relays card_ids sanitized to uint16', () => {
    const ctx = makeContext();
    const { host, opponent } = setupDuel(ctx);
    ctx._handleDuelHandRevealed(host, {
      duel_id: 'duel-xyz', round: 2, card_ids: [1, 5, 65537], // 65537 → 1 after & 0xffff
    });
    assert.equal(opponent.sent[0].type, 'duel_hand_revealed');
    assert.equal(opponent.sent[0].card_ids[2], 1); // 65537 & 0xffff = 1
  });

  test('duel_hand_revealed: capped at 10 cards', () => {
    const ctx = makeContext();
    const { host, opponent } = setupDuel(ctx);
    ctx._handleDuelHandRevealed(host, {
      duel_id: 'duel-xyz', round: 1, card_ids: Array.from({ length: 20 }, (_, i) => i),
    });
    assert.equal(opponent.sent[0].card_ids.length, 10);
  });
});

suite('Duel protocol — host-only ops', () => {
  function setupDuel(ctx) {
    const host = makeWs({ playerId: 'host' });
    ctx._handleCreateRoom(host, { name: 'Host' });
    const roomId = host.sent[0].roomId;
    const opponent = makeWs({ playerId: 'opponent' });
    ctx._handleJoinRoom(opponent, { roomId, name: 'Opp' });
    host.sent.length = 0;
    opponent.sent.length = 0;
    return { host, opponent, roomId };
  }

  test('duel_phase_advance: host can advance', () => {
    const ctx = makeContext();
    const { host, opponent } = setupDuel(ctx);
    ctx._handleDuelPhaseAdvance(host, { duel_id: 'd1', phase: 'battle', round: 1 });
    assert.equal(opponent.sent[0].type, 'duel_phase_advance');
    assert.equal(opponent.sent[0].phase, 'battle');
  });

  test('duel_phase_advance: non-host is rejected', () => {
    const ctx = makeContext();
    const { host, opponent } = setupDuel(ctx);
    ctx._handleDuelPhaseAdvance(opponent, { duel_id: 'd1', phase: 'battle', round: 1 });
    assert.equal(host.sent.length, 0);
  });

  test('duel_battle_resolved: host broadcasts hp deltas', () => {
    const ctx = makeContext();
    const { host, opponent } = setupDuel(ctx);
    ctx._handleDuelBattleResolved(host, { duel_id: 'd1', round: 1, p1_hp_delta: -10, p2_hp_delta: -5 });
    assert.equal(opponent.sent[0].type, 'duel_battle_resolved');
    assert.equal(opponent.sent[0].p1_hp_delta, -10);
    assert.equal(opponent.sent[0].p2_hp_delta, -5);
  });

  test('duel_battle_resolved: non-host is rejected', () => {
    const ctx = makeContext();
    const { host, opponent } = setupDuel(ctx);
    ctx._handleDuelBattleResolved(opponent, { duel_id: 'd1', round: 1, p1_hp_delta: -10, p2_hp_delta: 0 });
    assert.equal(host.sent.length, 0);
  });

  test('duel_ended: host broadcasts winner', () => {
    const ctx = makeContext();
    const { host, opponent } = setupDuel(ctx);
    ctx._handleDuelEnded(host, { duel_id: 'd1', winner: 'host-wallet' });
    assert.equal(opponent.sent[0].type, 'duel_ended');
    assert.equal(opponent.sent[0].winner, 'host-wallet');
  });

  test('duel_ended: no-op without duelId', () => {
    const ctx = makeContext();
    const { host, opponent } = setupDuel(ctx);
    ctx._handleDuelEnded(host, { winner: 'host-wallet' }); // missing duel_id
    assert.equal(opponent.sent.length, 0);
  });

  test('duel_ended: non-host is rejected', () => {
    const ctx = makeContext();
    const { host, opponent } = setupDuel(ctx);
    ctx._handleDuelEnded(opponent, { duel_id: 'd1', winner: 'opponent-wallet' });
    assert.equal(host.sent.length, 0);
  });
});

suite('sanitizeClan', () => {
  test('valid clans pass through', () => {
    const ctx = makeContext();
    // Test by passing valid clan through create_room
    const ws = makeWs();
    ctx._handleCreateRoom(ws, { clan: 'hollow_blade' });
    assert.equal(ws.clan, 'hollow_blade');
  });

  test('invalid clan becomes null', () => {
    const ctx = makeContext();
    const ws = makeWs();
    ctx._handleCreateRoom(ws, { clan: 'pirates' });
    assert.equal(ws.clan, null);
  });

  test('null clan stays null', () => {
    const ctx = makeContext();
    const ws = makeWs();
    ctx._handleCreateRoom(ws, { clan: null });
    assert.equal(ws.clan, null);
  });
});

// ─── Async test runner (for x402 tests) ──────────────────────────────────────

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    failed++;
  }
}

// ─── x402 replay prevention + endpoint binding context ───────────────────────

const MEMO_PROGRAM_IDS = new Set([
  'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo',
  'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
]);

function makeX402Context() {
  const usedSigs   = new Map();
  const LAMPORTS   = 1_000_000_000;
  const MAX_AGE_MS = 60_000;
  const SIG_TTL_MS = 120_000;

  function extractMemo(tx) {
    const message = tx?.transaction?.message;
    if (!message) return null;
    const accountKeys  = message.staticAccountKeys ?? message.accountKeys ?? [];
    const instructions = message.compiledInstructions ?? message.instructions ?? [];
    for (const ix of instructions) {
      const key = accountKeys[ix.programIdIndex];
      if (!key) continue;
      const programId = typeof key.toBase58 === 'function' ? key.toBase58() : String(key);
      if (!MEMO_PROGRAM_IDS.has(programId)) continue;
      const raw = ix.data;
      if (raw == null) continue;
      if (Buffer.isBuffer(raw))      return raw.toString('utf8');
      if (raw instanceof Uint8Array) return Buffer.from(raw).toString('utf8');
      if (typeof raw === 'string')   return raw;
    }
    return null;
  }

  function validateMemo(memoStr, requestPath) {
    if (!memoStr) return { ok: false, error: 'memo required' };
    const match = memoStr.match(/^endpoint:([^;]+);nonce:(.+)$/);
    if (!match) return { ok: false, error: 'invalid memo format' };
    const [, endpoint, nonce] = match;
    if (endpoint !== requestPath) return { ok: false, error: 'endpoint mismatch' };
    if (nonce.length < 8)         return { ok: false, error: 'invalid nonce' };
    return { ok: true };
  }

  // mockEntries: [{ sig, blockTimeSecs, err, receivedLamports, tx? }]
  // opts: { requireMemo?, now? }  (nowOverride moved into opts for clarity)
  function makeVerify(mockEntries, opts = {}) {
    const requireMemo = opts.requireMemo ?? false;
    return async function _verifyX402Payment(playerPubkeyStr, amountSol, requestPath) {
      const expectedLamports = Math.floor(amountSol * LAMPORTS);
      const now = opts.now ?? Date.now();
      for (const entry of mockEntries) {
        if (!entry.blockTimeSecs || entry.err) continue;
        if (now - entry.blockTimeSecs * 1000 > MAX_AGE_MS) continue;
        if (usedSigs.has(entry.sig)) return { ok: false, error: 'signature already used' };
        if (requireMemo) {
          const memoCheck = validateMemo(extractMemo(entry.tx ?? null), requestPath);
          if (!memoCheck.ok) return { ok: false, error: memoCheck.error };
        }
        if (entry.receivedLamports >= expectedLamports) {
          usedSigs.set(entry.sig, now + SIG_TTL_MS);
          return { ok: true, sig: entry.sig, received: entry.receivedLamports };
        }
      }
      return { ok: false, error: 'Payment not detected' };
    };
  }

  function gcUsedSigs(nowOverride) {
    const now = nowOverride ?? Date.now();
    usedSigs.forEach((expiry, sig) => { if (expiry < now) usedSigs.delete(sig); });
  }

  return { usedSigs, makeVerify, gcUsedSigs };
}

// Build a minimal mock transaction with an optional memo instruction.
// programId defaults to SPL Memo v2.
function makeMockTx(opts = {}) {
  const memoStr   = opts.memoStr   ?? null;
  const programId = opts.programId ?? 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
  return {
    meta: { preBalances: [0, 0, 0], postBalances: [0, 5_000_000, 0] },
    transaction: {
      message: {
        accountKeys: [
          { toBase58: () => 'player' },
          { toBase58: () => 'TREASURY' },
          { toBase58: () => programId },
        ],
        instructions: memoStr
          ? [{ programIdIndex: 2, accounts: [], data: Buffer.from(memoStr, 'utf8') }]
          : [],
      },
    },
  };
}

// ─── HTTP rate limit context ──────────────────────────────────────────────────

function makeRateLimitContext(opts = {}) {
  const rateLimits    = new Map();
  const HTTP_RATE_MAX    = opts.max    ?? 20;
  const HTTP_RATE_WINDOW = opts.window ?? 60_000;

  function checkHttpRateLimit(ip, now = Date.now()) {
    let entry = rateLimits.get(ip);
    if (!entry || now - entry.windowStart >= HTTP_RATE_WINDOW) {
      entry = { count: 0, windowStart: now };
      rateLimits.set(ip, entry);
    }
    entry.count++;
    if (entry.count > HTTP_RATE_MAX) {
      const retryAfter = Math.ceil((HTTP_RATE_WINDOW - (now - entry.windowStart)) / 1000);
      return { limited: true, retryAfter };
    }
    return { limited: false };
  }

  return { rateLimits, checkHttpRateLimit };
}

// ─── x402 header context ──────────────────────────────────────────────────────

function makeX402HeaderContext(opts = {}) {
  const TREASURY_ADDR  = opts.treasury ?? 'TREASURY_PUBKEY_123';
  const SOLANA_NETWORK = opts.network  ?? 'devnet';
  const LAMPORTS       = 1_000_000_000;

  function buildPaymentRequiredHeaders(amountSol) {
    const amountLamports = Math.floor(amountSol * LAMPORTS);
    const paymentRequired = Buffer.from(JSON.stringify({
      version: 'x402-v2',
      accepts: [{ scheme: 'solana-transfer', network: SOLANA_NETWORK, amount: String(amountLamports), payTo: TREASURY_ADDR }],
    })).toString('base64');
    return {
      'PAYMENT-REQUIRED':    paymentRequired,
      'X-Payment-Recipient': TREASURY_ADDR,
      'X-Payment-Amount':    String(amountLamports),
      'X-Payment-Network':   SOLANA_NETWORK,
    };
  }

  return { buildPaymentRequiredHeaders, TREASURY_ADDR, SOLANA_NETWORK };
}

// ─── x402 tests + final summary ───────────────────────────────────────────────

(async () => {
  console.log('\nx402 replay prevention');

  await asyncTest('new sig is accepted and recorded in usedSigs', async () => {
    const { usedSigs, makeVerify } = makeX402Context();
    const nowSecs = Math.floor(Date.now() / 1000);
    const verify = makeVerify([{ sig: 'sig-aaa', blockTimeSecs: nowSecs, err: null, receivedLamports: 5_000_000 }]);
    const result = await verify('playerPk', 0.005);
    assert.equal(result.ok, true);
    assert.equal(result.sig, 'sig-aaa');
    assert.equal(usedSigs.has('sig-aaa'), true);
  });

  await asyncTest('same sig on second call returns already-used error', async () => {
    const { makeVerify } = makeX402Context();
    const nowSecs = Math.floor(Date.now() / 1000);
    const verify = makeVerify([{ sig: 'sig-bbb', blockTimeSecs: nowSecs, err: null, receivedLamports: 5_000_000 }]);
    await verify('playerPk', 0.005);                   // first call — accepted
    const result = await verify('playerPk', 0.005);    // second call — replay
    assert.equal(result.ok, false);
    assert.equal(result.error, 'signature already used');
  });

  await asyncTest('GC removes entries past their expiry', async () => {
    const { usedSigs, gcUsedSigs } = makeX402Context();
    usedSigs.set('sig-expired', Date.now() - 1);  // already expired
    gcUsedSigs();
    assert.equal(usedSigs.has('sig-expired'), false);
  });

  await asyncTest('different sig is not blocked by a prior used sig', async () => {
    const { usedSigs, makeVerify } = makeX402Context();
    const nowSecs = Math.floor(Date.now() / 1000);
    // Pre-mark an unrelated sig as used
    usedSigs.set('sig-unrelated', Date.now() + 120_000);
    // Fresh payment arrives with a different sig
    const verify = makeVerify([{ sig: 'sig-fresh', blockTimeSecs: nowSecs, err: null, receivedLamports: 5_000_000 }]);
    const result = await verify('playerPk', 0.005);
    assert.equal(result.ok, true);
    assert.equal(result.sig, 'sig-fresh');
  });

  console.log('\nHTTP rate limiting');

  await asyncTest('20 requests pass, 21st is rate limited (429)', async () => {
    const { checkHttpRateLimit } = makeRateLimitContext({ max: 20, window: 60_000 });
    const now = Date.now();
    for (let i = 0; i < 20; i++) {
      const r = checkHttpRateLimit('1.2.3.4', now);
      assert.equal(r.limited, false, `request ${i + 1} should pass`);
    }
    const r21 = checkHttpRateLimit('1.2.3.4', now);
    assert.equal(r21.limited, true);
  });

  await asyncTest('Retry-After is correct seconds remaining in window', async () => {
    const WINDOW = 60_000;
    const { checkHttpRateLimit } = makeRateLimitContext({ max: 1, window: WINDOW });
    const now = Date.now();
    checkHttpRateLimit('1.2.3.4', now);           // 1st — passes
    const r = checkHttpRateLimit('1.2.3.4', now + 10_000); // 2nd — limited, 50s elapsed
    assert.equal(r.limited, true);
    // retryAfter = ceil((60000 - 10000) / 1000) = 50
    assert.equal(r.retryAfter, 50);
  });

  await asyncTest('after window expires requests are allowed again', async () => {
    const { checkHttpRateLimit } = makeRateLimitContext({ max: 1, window: 60_000 });
    const now = Date.now();
    checkHttpRateLimit('1.2.3.4', now);                 // 1st — passes, window starts
    const blocked = checkHttpRateLimit('1.2.3.4', now); // 2nd — limited
    assert.equal(blocked.limited, true);
    // 61s later — new window
    const after = checkHttpRateLimit('1.2.3.4', now + 61_000);
    assert.equal(after.limited, false);
  });

  await asyncTest('different IP is not affected by another IP being limited', async () => {
    const { checkHttpRateLimit } = makeRateLimitContext({ max: 1, window: 60_000 });
    const now = Date.now();
    checkHttpRateLimit('1.1.1.1', now);
    checkHttpRateLimit('1.1.1.1', now); // 1.1.1.1 is now limited
    const other = checkHttpRateLimit('2.2.2.2', now);
    assert.equal(other.limited, false);
  });

  console.log('\nx402 payment headers');

  await asyncTest('PAYMENT-REQUIRED header decodes to valid x402-v2 JSON', async () => {
    const { buildPaymentRequiredHeaders, TREASURY_ADDR } = makeX402HeaderContext();
    const headers = buildPaymentRequiredHeaders(0.005);
    const decoded = JSON.parse(Buffer.from(headers['PAYMENT-REQUIRED'], 'base64').toString('utf8'));
    assert.equal(decoded.version, 'x402-v2');
    assert.ok(Array.isArray(decoded.accepts) && decoded.accepts.length > 0);
    assert.equal(decoded.accepts[0].payTo, TREASURY_ADDR);
    assert.equal(decoded.accepts[0].scheme, 'solana-transfer');
    assert.equal(decoded.accepts[0].amount, '5000000'); // 0.005 SOL
  });

  await asyncTest('X-Payment-Recipient matches TREASURY_ADDR', async () => {
    const { buildPaymentRequiredHeaders, TREASURY_ADDR } = makeX402HeaderContext({ treasury: 'MY_TREASURY_KEY' });
    const headers = buildPaymentRequiredHeaders(0.01);
    assert.equal(headers['X-Payment-Recipient'], 'MY_TREASURY_KEY');
  });

  await asyncTest('X-Payment-Amount is correct lamports string', async () => {
    const { buildPaymentRequiredHeaders } = makeX402HeaderContext();
    const headers = buildPaymentRequiredHeaders(0.01);
    assert.equal(headers['X-Payment-Amount'], '10000000'); // 0.01 SOL = 10_000_000 lamports
  });

  await asyncTest('X-Payment-Network reflects SOLANA_NETWORK', async () => {
    const { buildPaymentRequiredHeaders } = makeX402HeaderContext({ network: 'mainnet-beta' });
    const headers = buildPaymentRequiredHeaders(0.003);
    assert.equal(headers['X-Payment-Network'], 'mainnet-beta');
  });

  console.log('\nx402 endpoint binding (memo)');

  await asyncTest('requireMemo=false: tx without memo still passes (regression)', async () => {
    const { makeVerify } = makeX402Context();
    const nowSecs = Math.floor(Date.now() / 1000);
    const verify = makeVerify(
      [{ sig: 'sig-no-memo', blockTimeSecs: nowSecs, err: null, receivedLamports: 5_000_000, tx: makeMockTx() }],
      { requireMemo: false },
    );
    const result = await verify('playerPk', 0.005, '/x402/scout-peek');
    assert.equal(result.ok, true);
  });

  await asyncTest('requireMemo=true: valid memo (SPL Memo v2) passes', async () => {
    const { makeVerify } = makeX402Context();
    const nowSecs = Math.floor(Date.now() / 1000);
    const memo = 'endpoint:/x402/scout-peek;nonce:a1b2c3d4';
    const verify = makeVerify(
      [{ sig: 'sig-v2', blockTimeSecs: nowSecs, err: null, receivedLamports: 5_000_000,
         tx: makeMockTx({ memoStr: memo, programId: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr' }) }],
      { requireMemo: true },
    );
    const result = await verify('playerPk', 0.005, '/x402/scout-peek');
    assert.equal(result.ok, true);
  });

  await asyncTest('requireMemo=true: valid memo (SPL Memo v1 legacy) passes', async () => {
    const { makeVerify } = makeX402Context();
    const nowSecs = Math.floor(Date.now() / 1000);
    const memo = 'endpoint:/x402/counter-peek;nonce:z9y8x7w6';
    const verify = makeVerify(
      [{ sig: 'sig-v1', blockTimeSecs: nowSecs, err: null, receivedLamports: 3_000_000,
         tx: makeMockTx({ memoStr: memo, programId: 'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo' }) }],
      { requireMemo: true },
    );
    const result = await verify('playerPk', 0.003, '/x402/counter-peek');
    assert.equal(result.ok, true);
  });

  await asyncTest('requireMemo=true: tx without memo → memo required', async () => {
    const { makeVerify } = makeX402Context();
    const nowSecs = Math.floor(Date.now() / 1000);
    const verify = makeVerify(
      [{ sig: 'sig-nomemo', blockTimeSecs: nowSecs, err: null, receivedLamports: 5_000_000,
         tx: makeMockTx() }],  // no memoStr → empty instructions
      { requireMemo: true },
    );
    const result = await verify('playerPk', 0.005, '/x402/scout-peek');
    assert.equal(result.ok, false);
    assert.equal(result.error, 'memo required');
  });

  await asyncTest('requireMemo=true: malformed memo ("foo:bar") → invalid memo format', async () => {
    const { makeVerify } = makeX402Context();
    const nowSecs = Math.floor(Date.now() / 1000);
    const verify = makeVerify(
      [{ sig: 'sig-badmemo', blockTimeSecs: nowSecs, err: null, receivedLamports: 5_000_000,
         tx: makeMockTx({ memoStr: 'foo:bar' }) }],
      { requireMemo: true },
    );
    const result = await verify('playerPk', 0.005, '/x402/scout-peek');
    assert.equal(result.ok, false);
    assert.equal(result.error, 'invalid memo format');
  });

  await asyncTest('requireMemo=true: endpoint mismatch → endpoint mismatch error', async () => {
    const { makeVerify } = makeX402Context();
    const nowSecs = Math.floor(Date.now() / 1000);
    // Payment memo says scout-peek but client is hitting counter-peek
    const memo = 'endpoint:/x402/scout-peek;nonce:a1b2c3d4';
    const verify = makeVerify(
      [{ sig: 'sig-mismatch', blockTimeSecs: nowSecs, err: null, receivedLamports: 3_000_000,
         tx: makeMockTx({ memoStr: memo }) }],
      { requireMemo: true },
    );
    const result = await verify('playerPk', 0.003, '/x402/counter-peek');
    assert.equal(result.ok, false);
    assert.equal(result.error, 'endpoint mismatch');
  });

  await asyncTest('requireMemo=true: nonce < 8 chars → invalid nonce', async () => {
    const { makeVerify } = makeX402Context();
    const nowSecs = Math.floor(Date.now() / 1000);
    const memo = 'endpoint:/x402/scout-peek;nonce:ab';  // only 2 chars
    const verify = makeVerify(
      [{ sig: 'sig-shortnonce', blockTimeSecs: nowSecs, err: null, receivedLamports: 5_000_000,
         tx: makeMockTx({ memoStr: memo }) }],
      { requireMemo: true },
    );
    const result = await verify('playerPk', 0.005, '/x402/scout-peek');
    assert.equal(result.ok, false);
    assert.equal(result.error, 'invalid nonce');
  });

  console.log('\n────────────────────────────────────────────');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
