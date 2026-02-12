-- Agent Resource Monitor Database Schema
-- PostgreSQL 14+

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agents table
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  api_key_hash VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agents_api_key ON agents(api_key_hash);

-- Wallets being monitored
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  address VARCHAR(44) NOT NULL,
  chain VARCHAR(20) NOT NULL DEFAULT 'solana-devnet',
  label VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, address, chain)
);

CREATE INDEX idx_wallets_agent ON wallets(agent_id);
CREATE INDEX idx_wallets_address ON wallets(address);

-- Balance snapshots (time-series data)
CREATE TABLE balance_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  token_mint VARCHAR(44), -- NULL for native SOL
  balance NUMERIC(20, 9) NOT NULL,
  usd_value NUMERIC(12, 2),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_balance_snapshots_wallet_time ON balance_snapshots(wallet_id, timestamp DESC);
CREATE INDEX idx_balance_snapshots_time ON balance_snapshots(timestamp DESC);

-- Transactions tracked
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  signature VARCHAR(88) NOT NULL UNIQUE,
  block_time TIMESTAMPTZ NOT NULL,
  fee_lamports BIGINT NOT NULL,
  fee_usd NUMERIC(10, 4),
  compute_units_used INTEGER,
  tx_type VARCHAR(50), -- 'transfer', 'swap', 'program_call', etc.
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_wallet_time ON transactions(wallet_id, block_time DESC);
CREATE INDEX idx_transactions_signature ON transactions(signature);

-- Alerts configuration and triggers
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL, -- 'low_balance', 'high_burn_rate', 'transaction_spike'
  threshold NUMERIC(20, 9),
  condition_config JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  triggered_at TIMESTAMPTZ,
  acknowledged BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_agent ON alerts(agent_id);
CREATE INDEX idx_alerts_triggered ON alerts(triggered_at) WHERE triggered_at IS NOT NULL;

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to agents table
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries

-- Current balances (latest snapshot per wallet/token)
CREATE VIEW current_balances AS
SELECT DISTINCT ON (wallet_id, token_mint)
  wallet_id,
  token_mint,
  balance,
  usd_value,
  timestamp
FROM balance_snapshots
ORDER BY wallet_id, token_mint, timestamp DESC;

-- Daily transaction costs
CREATE VIEW daily_transaction_costs AS
SELECT
  wallet_id,
  DATE(block_time) as date,
  COUNT(*) as tx_count,
  SUM(fee_lamports) as total_fee_lamports,
  SUM(fee_usd) as total_fee_usd,
  AVG(fee_lamports) as avg_fee_lamports,
  SUM(compute_units_used) as total_compute_units
FROM transactions
GROUP BY wallet_id, DATE(block_time)
ORDER BY wallet_id, date DESC;
