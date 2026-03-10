/**
 * Unit tests for pricing utility functions.
 *
 * These functions are pure (no I/O), so they are fast and deterministic —
 * ideal candidates for thorough unit test coverage.
 */

import { convertLamportsToUSD, formatBalance } from '../../services/pricing';

describe('convertLamportsToUSD', () => {
  it('converts 1 SOL (1e9 lamports) correctly', () => {
    expect(convertLamportsToUSD(BigInt(1_000_000_000), 100)).toBe('100.0000');
  });

  it('converts 0.5 SOL correctly', () => {
    expect(convertLamportsToUSD(BigInt(500_000_000), 100)).toBe('50.0000');
  });

  it('converts a small dust amount correctly', () => {
    // 5000 lamports = 0.000005 SOL; at $200 = $0.001
    expect(convertLamportsToUSD(BigInt(5000), 200)).toBe('0.0010');
  });

  it('returns 0.0000 when lamports is 0', () => {
    expect(convertLamportsToUSD(BigInt(0), 150)).toBe('0.0000');
  });

  it('returns 0.0000 when price is 0 (price feed unavailable)', () => {
    expect(convertLamportsToUSD(BigInt(1_000_000_000), 0)).toBe('0.0000');
  });
});

describe('formatBalance', () => {
  it('formats a whole-number token balance (no fraction)', () => {
    // 5 tokens with 6 decimals → "5"
    expect(formatBalance(BigInt(5_000_000), 6)).toBe('5');
  });

  it('formats a fractional token balance correctly', () => {
    // 1.5 tokens with 6 decimals
    expect(formatBalance(BigInt(1_500_000), 6)).toBe('1.5');
  });

  it('strips trailing zeros from the fractional part', () => {
    // 2.100000 → "2.1"
    expect(formatBalance(BigInt(2_100_000), 6)).toBe('2.1');
  });

  it('formats a SOL balance (9 decimals)', () => {
    // 1.23456789 SOL
    expect(formatBalance(BigInt(1_234_567_890), 9)).toBe('1.23456789');
  });

  it('returns "0" for a zero balance', () => {
    expect(formatBalance(BigInt(0), 6)).toBe('0');
  });

  it('pads the fractional part with leading zeros when needed', () => {
    // 0.000001 tokens with 6 decimals
    expect(formatBalance(BigInt(1), 6)).toBe('0.000001');
  });
});
