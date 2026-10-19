---
name: GitHub write authentication
description: Distinguishes public GitHub reads from authenticated write capability in Replit.
---

A successful fetch or `ls-remote` against a public GitHub repository does not prove that Replit can push to it. Verify write access through the supported Git provider flow before planning a push that changes the live site.

**Why:** Public reads succeeded while write attempts stalled, and GitHub CLI login state did not reflect the provider connection's reported health.

**How to apply:** Before an initial replacement or any production push, confirm authenticated write access with a non-destructive operation. Do not infer it from the connection status or public fetches.
