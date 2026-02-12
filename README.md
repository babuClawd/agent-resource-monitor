# Agent Resource Monitor (ARM)

**Production-grade resource monitoring for AI agents on Solana**

> Know what you're spending. Optimize what matters.

## Problem

AI agents burn through resources 24/7 — API calls, LLM tokens, on-chain transactions, wallet gas fees. Most agents have zero visibility into their actual costs until their wallets are empty or API keys hit rate limits.

**Agent Resource Monitor** gives AI agents complete visibility into their operational costs with:
- Real-time Solana wallet balance tracking
- Transaction cost analysis with compute unit metrics
- Historical spending patterns and burn rate calculations
- Programmable alerts for low balances
- REST API designed for agent consumption

## Features

✅ **Multi-wallet monitoring** - Track unlimited Solana wallets (mainnet + devnet)  
✅ **Real-time balances** - SOL + SPL token support  
✅ **Transaction history** - Full cost breakdowns with USD conversion  
✅ **Time-series analytics** - 1d/7d/30d balance history  
✅ **Production-ready** - TypeScript, PostgreSQL, Docker, comprehensive error handling  
✅ **Agent-first API** - Designed for programmatic consumption  

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Helius API key ([get one free](https://www.helius.dev/))

### Installation

```bash
# Clone repository
git clone https://github.com/babuClawd/agent-resource-monitor.git
cd agent-resource-monitor

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env and add your HELIUS_API_KEY

# Start services (PostgreSQL + API)
docker-compose up -d

# Initialize database
docker-compose exec postgres psql -U postgres -d arm_dev -f /docker-entrypoint-initdb.d/schema.sql

# View logs
docker-compose logs -f api
```

API will be available at `http://localhost:3000`

## API Documentation

### Authentication

All endpoints (except `/health` and agent registration) require an API key:

```bash
Authorization: Bearer <your-api-key>
```

### Endpoints

#### Register Agent

```bash
POST /api/v1/agents/register
Content-Type: application/json

{
  "name": "my-agent"
}

# Response:
{
  "success": true,
  "data": {
    "agent": {
      "id": "uuid",
      "name": "my-agent",
      "created_at": "2026-02-13T..."
    },
    "api_key": "..." # SAVE THIS - only shown once!
  }
}
```

#### Add Wallet to Monitoring

```bash
POST /api/v1/wallets
Authorization: Bearer <api-key>
Content-Type: application/json

{
  "address": "HhzdogsEjM353kgwMVNuSV6WW2ZHVS5X2JBCgHKKv4Lf",
  "chain": "solana-devnet",
  "label": "Main Wallet"
}
```

#### Get Current Balance

```bash
GET /api/v1/wallets/:id/balance
Authorization: Bearer <api-key>

# Response:
{
  "success": true,
  "data": {
    "wallet_id": "uuid",
    "address": "...",
    "balances": [
      {
        "token": "SOL",
        "balance": "0.5",
        "usd_value": "50.25"
      }
    ],
    "timestamp": "2026-02-13T..."
  }
}
```

#### Get Balance History

```bash
GET /api/v1/wallets/:id/history?period=7d
Authorization: Bearer <api-key>
```

Periods: `1d`, `7d`, `30d`

#### List All Wallets

```bash
GET /api/v1/wallets
Authorization: Bearer <api-key>
```

### Health Check

```bash
GET /health

# Response:
{
  "status": "healthy",
  "database": "connected",
  "uptime": 3600
}
```

## Architecture

```
┌─────────────────┐
│   AI Agent      │
└────────┬────────┘
         │ REST API
         │
┌────────▼────────┐
│   Express API   │
│  (TypeScript)   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼──────┐
│  PG   │ │ Helius  │
│  DB   │ │  RPC    │
└───────┘ └─────────┘
```

### Tech Stack

- **Backend:** Node.js 20, TypeScript, Express
- **Database:** PostgreSQL 16 (time-series optimized)
- **Blockchain:** Solana Web3.js, Helius RPC
- **Security:** bcrypt, helmet, rate-limiting
- **Logging:** pino (structured JSON logs)
- **Validation:** Zod schemas

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Run tests
npm test

# Lint code
npm run lint
```

## Project Structure

```
agent-resource-monitor/
├── src/
│   ├── server.ts          # Main application
│   ├── config/            # Environment config
│   ├── db/
│   │   ├── schema.sql     # Database schema
│   │   └── client.ts      # DB connection pool
│   ├── middleware/
│   │   └── auth.ts        # API key authentication
│   ├── routes/
│   │   ├── agents.ts      # Agent registration
│   │   └── wallets.ts     # Wallet monitoring
│   ├── services/
│   │   ├── solana.ts      # Blockchain interaction
│   │   └── pricing.ts     # USD conversion
│   ├── types/             # TypeScript interfaces
│   └── utils/
│       └── logger.ts      # Structured logging
├── docker-compose.yml     # Local development stack
├── Dockerfile             # Production container
└── package.json
```

## Database Schema

See `src/db/schema.sql` for full schema.

**Key tables:**
- `agents` - Registered agents with API key hashes
- `wallets` - Monitored wallet addresses
- `balance_snapshots` - Time-series balance data
- `transactions` - On-chain transaction records
- `alerts` - Alert configurations (future feature)

**Views:**
- `current_balances` - Latest balance per wallet/token
- `daily_transaction_costs` - Aggregated daily spend

## Security

✅ API keys hashed with bcrypt (cost factor 12)  
✅ Rate limiting (100 req/min per agent)  
✅ SQL injection prevention (parameterized queries)  
✅ CORS + Helmet security headers  
✅ Input validation with Zod  

## Roadmap

- [ ] Helius webhooks for real-time updates
- [ ] Alert system (low balance, high burn rate)
- [ ] x402 payment tracking integration
- [ ] Multi-chain support (Base, Arbitrum)
- [ ] Cost optimization suggestions
- [ ] Spend attribution (which tasks cost what)
- [ ] Web dashboard (optional)

## Contributing

Built for the Colosseum Agent Hackathon by **babu** (agent #3849).

Repository: https://github.com/babuClawd/agent-resource-monitor  
Agent: babuhaldiya@gmail.com

## License

MIT License - see LICENSE file

---

**Built by agents, for agents.** 🤖⚡
