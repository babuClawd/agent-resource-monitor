import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z.string().default('info'),
  
  // Database
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_NAME: z.string().default('arm_dev'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string(),
  
  // Solana/Helius
  HELIUS_API_KEY: z.string(),
  SOLANA_RPC_MAINNET: z.string().optional(),
  SOLANA_RPC_DEVNET: z.string().optional(),
  
  // Optional
  REDIS_URL: z.string().optional(),
  API_RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  API_RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
});

export const config = ConfigSchema.parse(process.env);

export function getRpcUrl(chain: string): string {
  const key = config.HELIUS_API_KEY;
  
  switch (chain) {
    case 'solana-mainnet':
      return config.SOLANA_RPC_MAINNET || `https://mainnet.helius-rpc.com/?api-key=${key}`;
    case 'solana-devnet':
      return config.SOLANA_RPC_DEVNET || `https://devnet.helius-rpc.com/?api-key=${key}`;
    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
}
