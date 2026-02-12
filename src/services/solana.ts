import { Connection, PublicKey, ParsedAccountData } from '@solana/web3.js';
import { getRpcUrl } from '../config';
import { logger } from '../utils/logger';

const connections = new Map<string, Connection>();

export function getConnection(chain: string): Connection {
  if (!connections.has(chain)) {
    const rpcUrl = getRpcUrl(chain);
    connections.set(chain, new Connection(rpcUrl, 'confirmed'));
  }
  return connections.get(chain)!;
}

export async function fetchWalletBalance(
  address: string,
  chain: string
): Promise<{ sol: bigint; tokens: Array<{ mint: string; balance: bigint; decimals: number }> }> {
  try {
    const connection = getConnection(chain);
    const pubkey = new PublicKey(address);

    // Get SOL balance
    const solBalance = BigInt(await connection.getBalance(pubkey));

    // Get SPL token accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    });

    const tokens = tokenAccounts.value.map((account) => {
      const data = account.account.data as ParsedAccountData;
      const info = data.parsed.info;
      return {
        mint: info.mint,
        balance: BigInt(info.tokenAmount.amount),
        decimals: info.tokenAmount.decimals,
      };
    });

    return { sol: solBalance, tokens };
  } catch (error) {
    logger.error({ error, address, chain }, 'Failed to fetch wallet balance');
    throw error;
  }
}

export async function fetchTransactionHistory(
  address: string,
  chain: string,
  limit: number = 100
): Promise<any[]> {
  try {
    const connection = getConnection(chain);
    const pubkey = new PublicKey(address);

    const signatures = await connection.getSignaturesForAddress(pubkey, { limit });

    return signatures;
  } catch (error) {
    logger.error({ error, address, chain }, 'Failed to fetch transaction history');
    throw error;
  }
}

export async function parseTransaction(signature: string, chain: string) {
  try {
    const connection = getConnection(chain);
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      throw new Error('Transaction not found');
    }

    return {
      signature,
      blockTime: tx.blockTime ? new Date(tx.blockTime * 1000) : null,
      fee: tx.meta?.fee || 0,
      computeUnitsUsed: tx.meta?.computeUnitsConsumed || null,
      success: tx.meta?.err === null,
    };
  } catch (error) {
    logger.error({ error, signature, chain }, 'Failed to parse transaction');
    throw error;
  }
}

export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}
