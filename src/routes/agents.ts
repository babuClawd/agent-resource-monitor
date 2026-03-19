import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query } from '../db/client';
import { Agent, ApiResponse } from '../types';
import { generateApiKey, hashApiKey } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Validation schemas
const RegisterSchema = z.object({
  name: z.string().min(3).max(255).regex(/^[a-zA-Z0-9-_]+$/),
});

/**
 * POST /api/v1/agents/register
 * Register a new agent and receive API key
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const body = RegisterSchema.parse(req.body);

    // Check if name already exists
    const existing = await query<Agent>(
      'SELECT id FROM agents WHERE name = $1',
      [body.name]
    );

    if (existing.length > 0) {
      res.status(409).json({
        success: false,
        error: 'Agent name already taken',
      } as ApiResponse);
      return;
    }

    // Generate API key
    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);

    // Create agent
    const agents = await query<Agent>(
      `INSERT INTO agents (name, api_key_hash)
       VALUES ($1, $2)
       RETURNING *`,
      [body.name, apiKeyHash]
    );

    const agent = agents[0];

    logger.info({ agentId: agent.id, name: agent.name }, 'Agent registered');

    res.status(201).json({
      success: true,
      data: {
        agent: {
          id: agent.id,
          name: agent.name,
          created_at: agent.created_at,
        },
        api_key: apiKey, // Only time this is shown!
      },
      message:
        'Agent registered successfully. Save your API key - it will not be shown again.',
    } as ApiResponse);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid input',
        message: error.errors.map((e) => e.message).join(', '),
      } as ApiResponse);
      return;
    }

    logger.error({ error }, 'Agent registration failed');
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
});

/**
 * GET /api/v1/agents/me
 * Get authenticated agent info
 */
router.get('/me', async (req: Request, res: Response) => {
  if (!req.agent) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized',
    } as ApiResponse);
    return;
  }

  res.json({
    success: true,
    data: {
      id: req.agent.id,
      name: req.agent.name,
      created_at: req.agent.created_at,
    },
  } as ApiResponse);
});

export default router;
