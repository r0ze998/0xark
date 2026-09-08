// Small byte codec for signatures/instruction data. The browser Web3 IIFE does
// not expose its internal bs58 dependency; do not rely on solanaWeb3.bs58.
const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function encodeBase58(bytes) {
  let n = 0n, text = '', zeros = 0;
  for (const byte of bytes) n = n * 256n + BigInt(byte);
  while (n > 0n) { text = alphabet[Number(n % 58n)] + text; n /= 58n; }
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  return '1'.repeat(zeros) + text;
}
export function decodeBase58(text) {
  if (typeof text !== 'string' || text.length > 128) throw new Error('Invalid base58 value');
  let n = 0n, zeros = 0;
  for (const char of text) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) throw new Error('Invalid base58 character');
    n = n * 58n + BigInt(digit);
  }
  const bytes = [];
  while (n > 0n) { bytes.push(Number(n % 256n)); n /= 256n; }
  while (zeros < text.length && text[zeros] === '1') zeros++;
  return Uint8Array.from([...new Array(zeros).fill(0), ...bytes.reverse()]);
}
