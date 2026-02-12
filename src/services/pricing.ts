import { logger } from '../utils/logger';

interface PriceCache {
  price: number;
  timestamp: number;
}

const cache = new Map<string, PriceCache>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getSolPrice(): Promise<number> {
  const cached = cache.get('SOL');
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.price;
  }

  try {
    // Using CoinGecko API (free tier, no key required)
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
    );
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data: any = await response.json();
    const price = data.solana?.usd || 0;

    cache.set('SOL', { price, timestamp: Date.now() });
    return price;
  } catch (error) {
    logger.error({ error }, 'Failed to fetch SOL price');
    
    // Return cached price even if expired, or fallback
    const cached = cache.get('SOL');
    if (cached) {
      logger.warn('Using expired SOL price from cache');
      return cached.price;
    }
    
    return 0; // Fallback
  }
}

export async function getTokenPrice(mint: string): Promise<number> {
  // For now, only SOL is supported
  // In production, integrate with Jupiter Price API or similar
  if (mint === 'So11111111111111111111111111111111111111112') {
    return await getSolPrice();
  }
  
  return 0; // Unknown token
}

export function convertLamportsToUSD(lamports: bigint, solPrice: number): string {
  const sol = Number(lamports) / 1e9;
  return (sol * solPrice).toFixed(4);
}

export function formatBalance(balance: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const whole = balance / divisor;
  const fraction = balance % divisor;
  
  if (fraction === 0n) {
    return whole.toString();
  }
  
  const fractionStr = fraction.toString().padStart(decimals, '0');
  return `${whole}.${fractionStr}`.replace(/\.?0+$/, '');
}
