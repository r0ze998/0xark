// YKK-52 PR artifact: prove window.oxarkOnchain went 87 -> 76 by removing EXACTLY
// the 11 legacy Phase-C wrappers, nothing else added/removed.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const web3 = require('@solana/web3.js');
globalThis.solanaWeb3 = web3;
const EXPECT_REMOVED = ['claimPrize','claimPrizeMB','commitCard','createGame','depositStake','joinGame','resolveRound','revealCard','startGame','startGameMB','verifyZkProof'].sort();
async function surface(path){ globalThis.window={}; await import(pathToFileURL(path).href + `?t=${Math.random?0:0}`); return Object.keys(globalThis.window.oxarkOnchain).sort(); }
const OLD = await surface('/tmp/old-onchain/index.js');
const NEW = await surface('/Users/hiroprotagonist/0xark/solana/client/src/onchain/index.js');
const oldS=new Set(OLD), newS=new Set(NEW);
const removed=OLD.filter(k=>!newS.has(k)), added=NEW.filter(k=>!oldS.has(k));
console.log(`OLD surface: ${OLD.length}   NEW surface: ${NEW.length}`);
console.log(`removed (${removed.length}): ${removed.join(', ')}`);
console.log(`added   (${added.length}): ${added.join(', ')||'(none)'}`);
const ok = added.length===0 && JSON.stringify(removed.sort())===JSON.stringify(EXPECT_REMOVED) && NEW.length===76 && OLD.length===87;
console.log(ok ? '\n✓ EXACTLY the 11 legacy wrappers removed, zero additions (87 -> 76)' : '\n✗ MISMATCH vs expected 11');
process.exit(ok?0:1);
