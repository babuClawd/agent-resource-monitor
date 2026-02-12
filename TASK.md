# Task for Claude Code Agent

Build the following components for Agent Resource Monitor:

## 1. Wallet Routes (`src/routes/wallets.ts`)
- POST /api/v1/wallets - Add wallet to monitoring
  - Validation: Solana address format, chain enum
  - Check if wallet already exists for agent
  - Insert into DB
- GET /api/v1/wallets - List agent's wallets
  - Pagination support
  - Filter by chain
- GET /api/v1/wallets/:id - Get specific wallet
- GET /api/v1/wallets/:id/balance - Current balance
  - Query current_balances view
  - Include all tokens
- GET /api/v1/wallets/:id/history - Balance history
  - Time range parameter (1d, 7d, 30d)
  - Return time-series data
- GET /api/v1/wallets/:id/transactions - Transaction list
  - Pagination
  - Date range filter
- DELETE /api/v1/wallets/:id - Remove wallet (soft delete: is_active=false)

## 2. Solana Service (`src/services/solana.ts`)
- Connection setup (Helius RPC)
- fetchWalletBalance(address: string, chain: string) -> { sol, tokens }
- fetchTransactionHistory(address: string, limit: number) -> Transaction[]
- parseTransaction(signature: string) -> Transaction details
- getTokenAccounts(address: string) -> SPL token accounts
- Error handling for RPC failures

## 3. Pricing Service (`src/services/pricing.ts`)
- getSolPrice() -> number (USD)
- getTokenPrice(mint: string) -> number (USD)
- convertLamportsToUSD(lamports: bigint, solPrice: number) -> string
- Cache prices (5 min TTL)

## 4. Main Server (`src/server.ts`)
- Express app setup
- Middleware: helmet, cors, rate-limit, pino-http
- Route mounting: /api/v1/agents, /api/v1/wallets
- Error handler middleware
- Health check endpoint: GET /health
- Graceful shutdown

## 5. Environment Config (`src/config/index.ts`)
- Load and validate environment variables
- Export typed config object
- Required: DB config, HELIUS_API_KEY, PORT

## Requirements:
- TypeScript strict mode
- Zod validation for all inputs
- Proper error handling
- Use existing types from src/types/index.ts
- Use existing db client from src/db/client.ts
- Follow existing auth middleware pattern

## Files already created:
- package.json
- tsconfig.json
- src/db/schema.sql
- src/db/client.ts
- src/types/index.ts
- src/utils/logger.ts
- src/middleware/auth.ts
- src/routes/agents.ts
