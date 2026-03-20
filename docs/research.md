# Research Notes

## 2026-03-18 — Auth hashing reliability (Issue #7)

### Context observed
- Open issue: `#7 bug: authenticateAgent always fails — bcrypt.hash generates new salt per call`
- Open PR linked to this area: `#8 fix: replace bcrypt with SHA-256 for API key hashing`

### Why this failure happens
`bcrypt.hash(secret, 10)` generates a new random salt each call, so two hashes of the same API key are different. If authentication compares newly-generated hash values instead of using `bcrypt.compare`, valid keys are rejected.

### Safe resolution patterns
1. **Preferred for API-key lookup:** deterministic keyed digest (e.g., HMAC-SHA256 with server secret / pepper), then compare using timing-safe equality.
2. **If keeping bcrypt:** store bcrypt output once at creation time and validate with `bcrypt.compare(rawKey, storedHash)` only.

### Solana-specific operational note
Because this service gates access to wallet cost telemetry endpoints, auth reliability directly affects Solana monitoring continuity. Deterministic key indexing also helps avoid accidental lockouts during agent automation.

### Follow-up checks for implementation PRs
- Add regression test: same API key should authenticate across repeated requests.
- Add negative test: wrong key fails.
- Ensure no raw API key is logged in server logs or error payloads.

## 2026-03-18 — Solana RPC commitment consistency for telemetry reliability

### Context observed
- `src/services/solana.ts` creates a `Connection` with commitment `'confirmed'`.
- Balance, signatures, and parsed transaction calls all run through that shared connection.

### Reliability note
Using a single, explicit commitment level across all telemetry reads avoids subtle mismatches where a signature appears before its parsed transaction metadata is available at a stronger commitment. For cost monitoring APIs, that consistency helps prevent intermittent "Transaction not found" style noise during active slot updates.

### Practical guidance
- Keep one explicit commitment policy per environment (`confirmed` for lower latency, `finalized` for stricter stability).
- Document the trade-off in README / operations notes so downstream agents interpret temporary gaps correctly.
- If future requirements include strict accounting exports, prefer `finalized` for export jobs while keeping `confirmed` for live dashboards.

## 2026-03-20 — Solana commitment policy for snapshot-grade reporting

### Additional recommendation
Use two commitment tiers by intent:

1. **Realtime reads** (`confirmed`)
   - Suitable for rapid polling and near-live balance UX.
2. **Persisted accounting snapshots** (`finalized`)
   - Suitable for burn-rate analytics, daily spend summaries, and alert thresholds.

This split keeps latency low for interactive monitoring while improving confidence for numbers that may trigger automated actions.

### Suggested low-risk implementation follow-up
- Add `SOLANA_SNAPSHOT_COMMITMENT` (default `finalized`) for historical writes/reporting paths.
- Include commitment metadata in persisted snapshot records so downstream agents can reason about data confidence.

### References
- Solana commitment overview: `https://docs.solana.com/cluster/commitments`
- Solana RPC docs: `https://solana.com/docs/rpc`
