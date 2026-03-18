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
