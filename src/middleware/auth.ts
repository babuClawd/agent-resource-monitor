import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
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
      [await hashApiKey(apiKey)]
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

export async function hashApiKey(apiKey: string): Promise<string> {
  return bcrypt.hash(apiKey, 12);
}

export async function verifyApiKey(
  apiKey: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(apiKey, hash);
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
