/**
 * Unit tests for pricing service utility functions.
 *
 * These tests cover the pure helper functions (convertLamportsToUSD, formatBalance)
 * that are critical for correct balance display. No network or DB required.
 */

import { convertLamportsToUSD, formatBalance } from '../pricing';

describe('convertLamportsToUSD', () => {
  it('converts 1 SOL (1e9 lamports) at a given price', () => {
    expect(convertLamportsToUSD(1_000_000_000n, 100)).toBe('100.0000');
  });

  it('converts 0 lamports to 0 USD', () => {
    expect(convertLamportsToUSD(0n, 150)).toBe('0.0000');
  });

  it('returns zero when SOL price is 0 (fallback state)', () => {
    expect(convertLamportsToUSD(1_000_000_000n, 0)).toBe('0.0000');
  });

  it('handles fractional SOL amounts correctly', () => {
    // 0.5 SOL = 500_000_000 lamports
    expect(convertLamportsToUSD(500_000_000n, 200)).toBe('100.0000');
  });

  it('respects 4 decimal places in output', () => {
    // 1 lamport at price 100 → 1e-9 * 100 = 1e-7 → rounds to 0.0000
    expect(convertLamportsToUSD(1n, 100)).toBe('0.0000');
  });
});

describe('formatBalance', () => {
  it('formats whole number balance (no fraction)', () => {
    // 5 SOL with 9 decimals
    expect(formatBalance(5_000_000_000n, 9)).toBe('5');
  });

  it('formats fractional balance', () => {
    // 1.5 SOL
    expect(formatBalance(1_500_000_000n, 9)).toBe('1.5');
  });

  it('strips trailing zeros from fractional part', () => {
    // 1.50 should be 1.5
    expect(formatBalance(1_500_000_000n, 9)).toBe('1.5');
  });

  it('handles zero balance', () => {
    expect(formatBalance(0n, 9)).toBe('0');
  });

  it('formats SPL token with 6 decimals (USDC-style)', () => {
    // 10 USDC = 10_000_000 units with 6 decimals
    expect(formatBalance(10_000_000n, 6)).toBe('10');
  });

  it('formats SPL token fractional amount', () => {
    // 1.25 USDC
    expect(formatBalance(1_250_000n, 6)).toBe('1.25');
  });

  it('handles very small amounts', () => {
    // 0.000001 USDC (1 unit with 6 decimals)
    expect(formatBalance(1n, 6)).toBe('0.000001');
  });
});
