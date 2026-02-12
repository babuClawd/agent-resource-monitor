import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/client';
import { Wallet, ApiResponse, BalanceSnapshot, Transaction } from '../types';
import {
  fetchWalletBalance,
  fetchTransactionHistory,
  isValidSolanaAddress,
} from '../services/solana';
import { getSolPrice, convertLamportsToUSD, formatBalance } from '../services/pricing';
import { logger } from '../utils/logger';

const router = Router();

const AddWalletSchema = z.object({
  address: z.string().refine(isValidSolanaAddress, 'Invalid Solana address'),
  chain: z.enum(['solana-mainnet', 'solana-devnet']).default('solana-devnet'),
  label: z.string().max(100).optional(),
});

/**
 * POST /api/v1/wallets
 * Add a wallet to monitoring
 */
router.post('/', async (req: Request, res: Response) => {
  if (!req.agent) {
    res.status(401).json({ success: false, error: 'Unauthorized' } as ApiResponse);
    return;
  }

  try {
    const body = AddWalletSchema.parse(req.body);

    // Check if wallet already exists for this agent
    const existing = await query<Wallet>(
      'SELECT id FROM wallets WHERE agent_id = $1 AND address = $2 AND chain = $3',
      [req.agent.id, body.address, body.chain]
    );

    if (existing.length > 0) {
      res.status(409).json({
        success: false,
        error: 'Wallet already being monitored',
      } as ApiResponse);
      return;
    }

    // Verify wallet exists on-chain before adding
    try {
      await fetchWalletBalance(body.address, body.chain);
    } catch (error) {
      res.status(400).json({
        success: false,
        error: 'Could not fetch wallet from blockchain',
      } as ApiResponse);
      return;
    }

    // Insert wallet
    const wallets = await query<Wallet>(
      `INSERT INTO wallets (agent_id, address, chain, label)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.agent.id, body.address, body.chain, body.label || null]
    );

    logger.info(
      { walletId: wallets[0].id, address: body.address },
      'Wallet added to monitoring'
    );

    res.status(201).json({
      success: true,
      data: wallets[0],
    } as ApiResponse<Wallet>);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid input',
        message: error.errors.map((e) => e.message).join(', '),
      } as ApiResponse);
      return;
    }

    logger.error({ error }, 'Failed to add wallet');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
});

/**
 * GET /api/v1/wallets
 * List agent's wallets
 */
router.get('/', async (req: Request, res: Response) => {
  if (!req.agent) {
    res.status(401).json({ success: false, error: 'Unauthorized' } as ApiResponse);
    return;
  }

  try {
    const { chain } = req.query;

    let queryText = 'SELECT * FROM wallets WHERE agent_id = $1 AND is_active = true';
    const params: any[] = [req.agent.id];

    if (chain) {
      queryText += ' AND chain = $2';
      params.push(chain);
    }

    queryText += ' ORDER BY created_at DESC';

    const wallets = await query<Wallet>(queryText, params);

    res.json({
      success: true,
      data: wallets,
    } as ApiResponse<Wallet[]>);
  } catch (error) {
    logger.error({ error }, 'Failed to list wallets');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
});

/**
 * GET /api/v1/wallets/:id
 * Get specific wallet
 */
router.get('/:id', async (req: Request, res: Response) => {
  if (!req.agent) {
    res.status(401).json({ success: false, error: 'Unauthorized' } as ApiResponse);
    return;
  }

  try {
    const wallets = await query<Wallet>(
      'SELECT * FROM wallets WHERE id = $1 AND agent_id = $2',
      [req.params.id, req.agent.id]
    );

    if (wallets.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Wallet not found',
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      data: wallets[0],
    } as ApiResponse<Wallet>);
  } catch (error) {
    logger.error({ error }, 'Failed to get wallet');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
});

/**
 * GET /api/v1/wallets/:id/balance
 * Get current balance for wallet
 */
router.get('/:id/balance', async (req: Request, res: Response) => {
  if (!req.agent) {
    res.status(401).json({ success: false, error: 'Unauthorized' } as ApiResponse);
    return;
  }

  try {
    const wallets = await query<Wallet>(
      'SELECT * FROM wallets WHERE id = $1 AND agent_id = $2',
      [req.params.id, req.agent.id]
    );

    if (wallets.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Wallet not found',
      } as ApiResponse);
      return;
    }

    const wallet = wallets[0];
    const { sol, tokens } = await fetchWalletBalance(wallet.address, wallet.chain);
    const solPrice = await getSolPrice();

    const balances = [
      {
        token: 'SOL',
        mint: null,
        balance: formatBalance(sol, 9),
        usd_value: convertLamportsToUSD(sol, solPrice),
      },
      ...tokens.map((t) => ({
        token: 'SPL',
        mint: t.mint,
        balance: formatBalance(t.balance, t.decimals),
        usd_value: '0', // Token pricing not implemented yet
      })),
    ];

    // Save snapshot
    for (const bal of balances) {
      await query(
        `INSERT INTO balance_snapshots (wallet_id, token_mint, balance, usd_value)
         VALUES ($1, $2, $3, $4)`,
        [wallet.id, bal.mint, bal.balance, bal.usd_value]
      );
    }

    res.json({
      success: true,
      data: {
        wallet_id: wallet.id,
        address: wallet.address,
        chain: wallet.chain,
        balances,
        timestamp: new Date().toISOString(),
      },
    } as ApiResponse);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch balance');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch balance from blockchain',
    } as ApiResponse);
  }
});

/**
 * GET /api/v1/wallets/:id/history
 * Get balance history
 */
router.get('/:id/history', async (req: Request, res: Response) => {
  if (!req.agent) {
    res.status(401).json({ success: false, error: 'Unauthorized' } as ApiResponse);
    return;
  }

  try {
    const { period = '7d' } = req.query;

    const periodMap: Record<string, string> = {
      '1d': '1 day',
      '7d': '7 days',
      '30d': '30 days',
    };

    if (!periodMap[period as string]) {
      res.status(400).json({
        success: false,
        error: 'Invalid period. Use 1d, 7d, or 30d',
      } as ApiResponse);
      return;
    }

    const wallets = await query<Wallet>(
      'SELECT * FROM wallets WHERE id = $1 AND agent_id = $2',
      [req.params.id, req.agent.id]
    );

    if (wallets.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Wallet not found',
      } as ApiResponse);
      return;
    }

    const snapshots = await query<BalanceSnapshot>(
      `SELECT * FROM balance_snapshots
       WHERE wallet_id = $1
         AND timestamp >= NOW() - INTERVAL '${periodMap[period as string]}'
       ORDER BY timestamp ASC`,
      [req.params.id]
    );

    res.json({
      success: true,
      data: snapshots,
    } as ApiResponse<BalanceSnapshot[]>);
  } catch (error) {
    logger.error({ error }, 'Failed to fetch balance history');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
});

/**
 * DELETE /api/v1/wallets/:id
 * Remove wallet from monitoring (soft delete)
 */
router.delete('/:id', async (req: Request, res: Response) => {
  if (!req.agent) {
    res.status(401).json({ success: false, error: 'Unauthorized' } as ApiResponse);
    return;
  }

  try {
    const result = await query(
      'UPDATE wallets SET is_active = false WHERE id = $1 AND agent_id = $2 RETURNING id',
      [req.params.id, req.agent.id]
    );

    if (result.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Wallet not found',
      } as ApiResponse);
      return;
    }

    res.json({
      success: true,
      message: 'Wallet removed from monitoring',
    } as ApiResponse);
  } catch (error) {
    logger.error({ error }, 'Failed to remove wallet');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
});

export default router;
