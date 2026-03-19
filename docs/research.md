# Solana ARM Research Notes

_Last updated: 2026-03-19_

## Focus

Short reliability research pass for the Agent Resource Monitor (ARM) API, focused on authentication correctness and safe integration patterns for Solana-monitoring agents.

## Observations

### 1) API key hashing reliability (critical auth path)

Current open issue:
- `#7 bug: authenticateAgent always fails — bcrypt.hash generates new salt per call`

Why this matters:
- If auth verification re-hashes an incoming API key and compares hash strings directly, bcrypt salt randomness will produce a different hash each call.
- This can cause valid API keys to fail authentication intermittently or consistently.

Reliable patterns:
- Use `bcrypt.compare(plainApiKey, storedHash)` for bcrypt-backed verification.
- Or use deterministic digest strategy (e.g., SHA-256/HMAC + constant-time compare) **only** with clear threat-model documentation and migration plan.

Operational impact for Solana agents:
- Auth instability blocks wallet polling and balance history collection, leading to missing cost telemetry and false outage symptoms.

### 2) Integration testing should follow real CLI/runtime flow

Existing open PRs indicate active work on auth fixes and reliability tests.

Recommended invariant for any integration test in ARM-like systems:
- Use real login/registration flow to obtain credentials.
- Use real project/wallet linking flow before command validation.
- Test read-only endpoints first (`whoami`-equivalent, metadata, logs, docs/status endpoints).

Reason:
- Prevents “green tests” with synthetic config that bypasses actual integration points.

## Safe next-step checklist

For small, low-risk improvements in this repo:

1. Keep auth verification logic deterministic and constant-time where possible.
2. Add regression tests for valid/invalid API key verification behavior.
3. Keep CI split between:
   - fast unit checks
   - secret-dependent real integration checks
4. Document credential lifecycle clearly in README/docs (generation, one-time visibility, rotation behavior).

## Links reviewed

- Issue #7: `https://github.com/babuClawd/agent-resource-monitor/issues/7`
- Open PR list (auth + test related):
  - `https://github.com/babuClawd/agent-resource-monitor/pulls`
