// prover-worker.js — Circom Groth16 proof generation off the main thread
// Handles dungeon_position and card_commit circuits.
//
// Protocol:
//   main → worker: { id, type: 'prove', circuit, input, wasmPath, zkeyPath }
//   worker → main: { id, type: 'proof', proof, publicSignals }
//             or:  { id, type: 'error', message }
//   main → worker: { type: 'ping' }
//   worker → main: { type: 'pong' }

'use strict';

let _snarkjsReady = false;

// snarkjs must be importable as a script in the worker context.
// The main page must pass the correct path via the first 'init' message.
let _snarkjsPath = 'snarkjs.min.js';

self.onmessage = async function(e) {
  const msg = e.data;
  if (!msg) return;

  if (msg.type === 'ping') {
    self.postMessage({ type: 'pong', snarkjsReady: _snarkjsReady });
    return;
  }

  if (msg.type === 'init') {
    if (msg.snarkjsPath) _snarkjsPath = msg.snarkjsPath;
    try {
      importScripts(_snarkjsPath);
      _snarkjsReady = true;
      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'init_error', message: err.message });
    }
    return;
  }

  if (msg.type === 'prove') {
    const { id, circuit, input, wasmPath, zkeyPath } = msg;
    if (!_snarkjsReady) {
      self.postMessage({ id, type: 'error', message: 'snarkjs not loaded in worker — send init first' });
      return;
    }
    try {
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);
      self.postMessage({ id, type: 'proof', circuit, proof, publicSignals });
    } catch (err) {
      self.postMessage({ id, type: 'error', circuit, message: err.message || String(err) });
    }
    return;
  }

  if (msg.type === 'verify') {
    const { id, vk, proof, publicSignals } = msg;
    if (!_snarkjsReady) {
      self.postMessage({ id, type: 'error', message: 'snarkjs not loaded' });
      return;
    }
    try {
      const valid = await snarkjs.groth16.verify(vk, publicSignals, proof);
      self.postMessage({ id, type: 'verify_result', valid });
    } catch (err) {
      self.postMessage({ id, type: 'error', message: err.message || String(err) });
    }
    return;
  }
};
