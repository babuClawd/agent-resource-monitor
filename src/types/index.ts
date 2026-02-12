export interface Agent {
  id: string;
  name: string;
  api_key_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface Wallet {
  id: string;
  agent_id: string;
  address: string;
  chain: string;
  label?: string;
  is_active: boolean;
  created_at: Date;
}

export interface BalanceSnapshot {
  id: string;
  wallet_id: string;
  token_mint?: string;
  balance: string;
  usd_value?: string;
  timestamp: Date;
}

export interface Transaction {
  id: string;
  wallet_id: string;
  signature: string;
  block_time: Date;
  fee_lamports: bigint;
  fee_usd?: string;
  compute_units_used?: number;
  tx_type?: string;
  metadata?: Record<string, any>;
  created_at: Date;
}

export interface Alert {
  id: string;
  agent_id: string;
  wallet_id?: string;
  alert_type: string;
  threshold?: string;
  condition_config?: Record<string, any>;
  is_active: boolean;
  triggered_at?: Date;
  acknowledged: boolean;
  created_at: Date;
}

export interface CurrentBalance {
  wallet_id: string;
  token_mint?: string;
  balance: string;
  usd_value?: string;
  timestamp: Date;
}

export interface DailyTransactionCost {
  wallet_id: string;
  date: string;
  tx_count: number;
  total_fee_lamports: string;
  total_fee_usd?: string;
  avg_fee_lamports: string;
  total_compute_units?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
