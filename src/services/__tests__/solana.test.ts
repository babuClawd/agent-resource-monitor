/**
 * Unit tests for isValidSolanaAddress in solana service.
 *
 * This function is the first line of defense for all wallet-related API
 * endpoints — it's used directly in the Zod schema that validates the
 * POST /api/v1/wallets request body. A false negative silently accepts
 * invalid addresses and lets them reach the RPC layer.
 *
 * These tests cover valid addresses, common malformed inputs, and edge
 * cases. No network or DB required — isValidSolanaAddress is pure.
 *
 * Note: The config module is mocked to avoid requiring DB_PASSWORD and
 * HELIUS_API_KEY env vars at test time. The solana service imports config
 * at module load, but isValidSolanaAddress itself doesn't use it.
 */

// Mock the config module before any imports that trigger it
jest.mock('../../config', () => ({
  config: {
    NODE_ENV: 'test',
  },
  getRpcUrl: jest.fn().mockReturnValue('https://api.devnet.solana.com'),
}));

import { isValidSolanaAddress } from '../solana';

describe('isValidSolanaAddress', () => {
  // --- Valid addresses ---

  it('accepts a valid mainnet wallet address', () => {
    // Well-known Solana Foundation address
    expect(isValidSolanaAddress('GsbwXfJraMomNxBcpR3DBFLkRKGEBXhDSxfrLEmPGxK5')).toBe(true);
  });

  it('accepts the System Program address (all-ones in base58)', () => {
    // Canonical system program address
    expect(isValidSolanaAddress('11111111111111111111111111111111')).toBe(true);
  });

  it('accepts the Token Program address', () => {
    expect(isValidSolanaAddress('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')).toBe(true);
  });

  it('accepts the native SOL mint address', () => {
    expect(isValidSolanaAddress('So11111111111111111111111111111111111111112')).toBe(true);
  });

  it('accepts the Associated Token Program address', () => {
    expect(isValidSolanaAddress('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJe1bRS')).toBe(true);
  });

  // --- Invalid inputs ---

  it('rejects an empty string', () => {
    expect(isValidSolanaAddress('')).toBe(false);
  });

  it('rejects a string that is too short', () => {
    expect(isValidSolanaAddress('abc')).toBe(false);
  });

  it('rejects a string that is too long', () => {
    // Base58 addresses are 32–44 chars; this is clearly oversized
    expect(isValidSolanaAddress('A'.repeat(100))).toBe(false);
  });

  it('rejects a hex Ethereum-style address', () => {
    expect(isValidSolanaAddress('0x742d35Cc6634C0532925a3b844Bc454e4438f44e')).toBe(false);
  });

  it('rejects base58 with invalid characters (0 is not in base58 alphabet)', () => {
    // '0' (zero) is not in the base58 alphabet
    expect(isValidSolanaAddress('0000000000000000000000000000000000000000000')).toBe(false);
  });

  it('rejects a valid-looking string with a space', () => {
    expect(isValidSolanaAddress('GsbwXfJraMomNxBcpR3DBFLkRKGEBXhDSxfrLEmPG K5')).toBe(false);
  });

  it('rejects the string "undefined"', () => {
    expect(isValidSolanaAddress('undefined')).toBe(false);
  });

  it('rejects the string "null"', () => {
    expect(isValidSolanaAddress('null')).toBe(false);
  });
});
