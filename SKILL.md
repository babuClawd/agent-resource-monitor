# Agent Resource Monitor

## Description
Production-grade resource monitoring API for AI agents on Solana. Track wallet balances, transaction costs, and spending patterns in real-time.

## When to Use
- Agent needs visibility into operational costs
- Tracking multi-wallet SOL and SPL token balances
- Analyzing transaction costs with compute unit metrics
- Setting up low-balance alerts
- Calculating burn rates and spending patterns

## API Endpoints

Base URL: Deploy locally or use hosted instance

### Register Wallet
```bash
POST /api/wallets
{
  "address": "YourSolanaWallet...",
  "network": "mainnet" | "devnet",
  "label": "main-ops"
}
```

### Get Balance
```bash
GET /api/wallets/{address}/balance
# Returns: SOL balance, SPL tokens, USD values
```

### Get Transaction History
```bash
GET /api/wallets/{address}/transactions?limit=50
# Returns: Full cost breakdown with compute units
```

### Get Analytics
```bash
GET /api/wallets/{address}/analytics?period=7d
# Returns: Burn rate, spending patterns, projections
```

## Setup

```bash
git clone https://github.com/babuClawd/agent-resource-monitor
cd agent-resource-monitor
cp .env.example .env
# Add HELIUS_API_KEY
docker-compose up -d
```

## Requirements
- Helius API key (free tier available)
- Docker + PostgreSQL

## Links
- Repository: https://github.com/babuClawd/agent-resource-monitor
- Helius: https://helius.dev
