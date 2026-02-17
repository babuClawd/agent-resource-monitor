# AI Agent Integration Examples

This guide shows how AI agents can integrate with ARM to monitor their Solana resource usage.

## Table of Contents

- [Quick Start](#quick-start)
- [Monitoring Patterns](#monitoring-patterns)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## Quick Start

### 1. Register Your Agent

```typescript
const API_BASE = 'http://localhost:3000';
const API_KEY = 'your-api-key-here';

async function registerAgent() {
  const response = await fetch(`${API_BASE}/agents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: JSON.stringify({
      name: 'my-trading-bot',
      description: 'Automated trading agent for Solana',
      contact: 'bot@example.com'
    })
  });

  const data = await response.json();
  return data.agentId;
}
```

### 2. Add Wallets to Monitor

```typescript
async function addWallet(agentId: string, walletAddress: string) {
  const response = await fetch(`${API_BASE}/wallets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY
    },
    body: JSON.stringify({
      agentId,
      address: walletAddress,
      network: 'mainnet-beta',
      label: 'Primary Trading Wallet'
    })
  });

  return response.json();
}
```

### 3. Check Wallet Balance

```typescript
async function getBalance(walletAddress: string) {
  const response = await fetch(
    `${API_BASE}/wallets/${walletAddress}/balance`,
    {
      headers: { 'X-API-Key': API_KEY }
    }
  );

  const data = await response.json();
  return {
    sol: data.balance,
    usd: data.balanceUsd,
    tokens: data.tokens
  };
}
```

## Monitoring Patterns

### Pre-Transaction Balance Check

Before executing expensive on-chain operations, check if you have sufficient funds:

```typescript
async function safeExecuteTransaction(
  walletAddress: string,
  estimatedCostSOL: number
) {
  // Check current balance
  const balance = await getBalance(walletAddress);

  if (balance.sol < estimatedCostSOL * 1.2) { // 20% buffer
    throw new Error(
      `Insufficient balance: ${balance.sol} SOL available, ` +
      `${estimatedCostSOL} SOL required (+ 20% buffer)`
    );
  }

  // Proceed with transaction
  console.log(`✅ Sufficient balance (${balance.sol} SOL). Executing...`);
  // ... execute your transaction
}
```

### Periodic Health Check

Monitor wallet health in your agent's main loop:

```typescript
async function healthCheck(walletAddress: string) {
  const balance = await getBalance(walletAddress);
  const history = await getBalanceHistory(walletAddress, 7); // 7 days

  // Calculate burn rate (SOL per day)
  const firstBalance = history[0].balance;
  const currentBalance = balance.sol;
  const daysPassed = 7;
  const burnRate = (firstBalance - currentBalance) / daysPassed;

  // Estimate days until depleted
  const daysRemaining = currentBalance / burnRate;

  if (daysRemaining < 3) {
    console.warn(`⚠️  Wallet depleting! ~${daysRemaining.toFixed(1)} days remaining`);
    // Trigger alert to human operator
    await notifyLowBalance(walletAddress, daysRemaining);
  }

  return {
    balance: currentBalance,
    burnRate,
    daysRemaining
  };
}

async function getBalanceHistory(walletAddress: string, days: number) {
  const response = await fetch(
    `${API_BASE}/wallets/${walletAddress}/history?days=${days}`,
    { headers: { 'X-API-Key': API_KEY } }
  );
  return response.json();
}
```

### Multi-Wallet Dashboard

If your agent manages multiple wallets, aggregate their status:

```typescript
async function getWalletDashboard(agentId: string) {
  const response = await fetch(
    `${API_BASE}/agents/${agentId}/wallets`,
    { headers: { 'X-API-Key': API_KEY } }
  );

  const wallets = await response.json();

  const summary = {
    totalSOL: 0,
    totalUSD: 0,
    walletCount: wallets.length,
    lowBalanceWallets: []
  };

  for (const wallet of wallets) {
    const balance = await getBalance(wallet.address);
    summary.totalSOL += balance.sol;
    summary.totalUSD += balance.usd;

    if (balance.sol < 0.1) { // Less than 0.1 SOL
      summary.lowBalanceWallets.push({
        address: wallet.address,
        label: wallet.label,
        balance: balance.sol
      });
    }
  }

  return summary;
}
```

## Error Handling

### Robust API Calls with Retries

```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);

      if (response.ok) {
        return response;
      }

      // Handle rate limits
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 2000 * (i + 1);
        console.log(`⏳ Rate limited. Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      // Handle other errors
      if (response.status >= 500) {
        console.warn(`⚠️  Server error (${response.status}). Retry ${i + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }

      // Client errors (4xx) - don't retry
      throw new Error(`API error: ${response.status} ${response.statusText}`);

    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.warn(`⚠️  Request failed. Retry ${i + 1}/${maxRetries}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }

  throw new Error('Max retries exceeded');
}

// Usage
async function getSafeBalance(walletAddress: string) {
  try {
    const response = await fetchWithRetry(
      `${API_BASE}/wallets/${walletAddress}/balance`,
      { headers: { 'X-API-Key': API_KEY } }
    );
    return response.json();
  } catch (error) {
    console.error(`❌ Failed to fetch balance for ${walletAddress}:`, error);
    // Return cached balance or default
    return { balance: 0, balanceUsd: 0, tokens: [] };
  }
}
```

### Graceful Degradation

If ARM is unavailable, your agent should continue operating with reduced visibility:

```typescript
let armAvailable = true;

async function checkARMHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      headers: { 'X-API-Key': API_KEY },
      signal: AbortSignal.timeout(5000) // 5s timeout
    });
    armAvailable = response.ok;
  } catch (error) {
    armAvailable = false;
    console.warn('⚠️  ARM unavailable. Operating without monitoring.');
  }
}

async function optionalBalanceCheck(walletAddress: string) {
  if (!armAvailable) {
    console.log('ℹ️  Skipping balance check (ARM offline)');
    return null;
  }

  return getSafeBalance(walletAddress);
}

// Check ARM health every 5 minutes
setInterval(checkARMHealth, 5 * 60 * 1000);
```

## Best Practices

### 1. Cache Balances Appropriately

Don't query ARM for every transaction — cache balances with sensible TTLs:

```typescript
interface CachedBalance {
  balance: number;
  timestamp: number;
}

const balanceCache = new Map<string, CachedBalance>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

async function getCachedBalance(walletAddress: string): Promise<number> {
  const cached = balanceCache.get(walletAddress);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
    return cached.balance;
  }

  // Fetch fresh balance
  const balance = await getSafeBalance(walletAddress);
  balanceCache.set(walletAddress, {
    balance: balance.balance,
    timestamp: now
  });

  return balance.balance;
}
```

### 2. Set Balance Thresholds

Define minimum operational balances for your agent:

```typescript
const THRESHOLDS = {
  CRITICAL: 0.05,  // Stop all operations
  WARNING: 0.1,    // Alert operator
  COMFORTABLE: 0.5 // Normal operations
};

async function getBalanceStatus(walletAddress: string) {
  const balance = await getBalance(walletAddress);

  if (balance.sol < THRESHOLDS.CRITICAL) {
    return { level: 'CRITICAL', action: 'HALT_OPERATIONS' };
  } else if (balance.sol < THRESHOLDS.WARNING) {
    return { level: 'WARNING', action: 'NOTIFY_OPERATOR' };
  } else if (balance.sol < THRESHOLDS.COMFORTABLE) {
    return { level: 'LOW', action: 'MONITOR_CLOSELY' };
  } else {
    return { level: 'HEALTHY', action: 'CONTINUE' };
  }
}
```

### 3. Log Resource Events

Maintain an audit trail of resource decisions:

```typescript
interface ResourceEvent {
  timestamp: Date;
  walletAddress: string;
  eventType: 'balance_check' | 'low_balance' | 'transaction_blocked';
  balance: number;
  action: string;
}

const resourceLog: ResourceEvent[] = [];

async function logResourceEvent(event: Omit<ResourceEvent, 'timestamp'>) {
  resourceLog.push({
    ...event,
    timestamp: new Date()
  });

  // Persist to disk/database periodically
  if (resourceLog.length >= 100) {
    await flushResourceLog();
  }
}

// Usage
const balance = await getBalance(walletAddress);
await logResourceEvent({
  walletAddress,
  eventType: 'balance_check',
  balance: balance.sol,
  action: balance.sol > 0.1 ? 'proceed' : 'halt'
});
```

### 4. Monitor Transaction Costs

Track actual vs. estimated costs to improve predictions:

```typescript
async function trackTransactionCost(
  walletAddress: string,
  txSignature: string,
  estimatedCostSOL: number
) {
  // Wait for transaction confirmation
  await connection.confirmTransaction(txSignature);

  // Get actual cost from ARM
  const response = await fetch(
    `${API_BASE}/wallets/${walletAddress}/transactions?limit=1`,
    { headers: { 'X-API-Key': API_KEY } }
  );

  const transactions = await response.json();
  const actualCostSOL = transactions[0]?.fee || 0;

  // Log for analysis
  console.log(`Transaction ${txSignature}:`);
  console.log(`  Estimated: ${estimatedCostSOL} SOL`);
  console.log(`  Actual: ${actualCostSOL} SOL`);
  console.log(`  Variance: ${((actualCostSOL / estimatedCostSOL - 1) * 100).toFixed(1)}%`);
}
```

## Next Steps

- **Production deployment:** See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **API reference:** See [API.md](./API.md)
- **Advanced features:** Webhooks, custom alerts, multi-agent coordination

## Support

Questions? Open an issue at [github.com/babuClawd/agent-resource-monitor](https://github.com/babuClawd/agent-resource-monitor/issues)
