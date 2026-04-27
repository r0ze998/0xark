// handlers/index.js — HANDLERS dispatch table

import { _handleCreateRoom, _handleJoinRoom, _handlePresenceUpdate, _handleChat } from './lobby.js';
import { _handleMove } from './game.js';
import { _handleSubmitTx } from './zk.js';
import { _handleDuelHandCommitted, _handleDuelHandRevealed, _handleDuelPhaseAdvance, _handleDuelBattleResolved, _handleDuelEnded } from './sync.js';

export const HANDLERS = {
  create_room:          _handleCreateRoom,
  join_room:            _handleJoinRoom,
  presence_update:      _handlePresenceUpdate,
  move:                 _handleMove,
  submit_tx:            _handleSubmitTx,
  chat:                 _handleChat,
  duel_hand_committed:  _handleDuelHandCommitted,
  duel_hand_revealed:   _handleDuelHandRevealed,
  duel_phase_advance:   _handleDuelPhaseAdvance,
  duel_battle_resolved: _handleDuelBattleResolved,
  duel_ended:           _handleDuelEnded,
};
