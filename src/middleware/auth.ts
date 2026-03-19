import { Request, Response, NextFunction } from 'express';
import { createHash } from 'crypto';
import { query } from '../db/client';
import { Agent } from '../types';
import { logger } from '../utils/logger';

// Extend Express Request type to include authenticated agent
declare global {
  namespace Express {
    interface Request {
      agent?: Agent;
    }
  }
}

export async function authenticateAgent(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header',
      });
      return;
    }

    const apiKey = authHeader.substring(7);

    if (!apiKey || apiKey.length < 32) {
      res.status(401).json({
        success: false,
        error: 'Invalid API key format',
      });
      return;
    }

    // Find agent by comparing hashed API key
    const agents = await query<Agent>(
      'SELECT * FROM agents WHERE api_key_hash = $1',
      [hashApiKey(apiKey)]
    );

    if (agents.length === 0) {
      logger.warn({ apiKeyPrefix: apiKey.substring(0, 8) }, 'Invalid API key attempt');
      res.status(401).json({
        success: false,
        error: 'Invalid API key',
      });
      return;
    }

    req.agent = agents[0];
    next();
  } catch (error) {
    logger.error({ error }, 'Authentication error');
    res.status(500).json({
      success: false,
      error: 'Internal server error during authentication',
    });
  }
}

/**
 * Hash an API key using SHA-256.
 *
 * API keys are high-entropy random strings (256-bit), so a fast
 * deterministic hash is appropriate — unlike passwords, there is no
 * brute-force risk that would require bcrypt's slow KDF.
 *
 * Using a deterministic hash also allows direct DB lookups via
 * `WHERE api_key_hash = $1` instead of fetching all rows and
 * comparing one-by-one.
 */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

export function generateApiKey(): string {
  // Generate a 32-byte (256-bit) random key encoded as base64url
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
