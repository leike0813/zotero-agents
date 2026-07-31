## 1. Shared Contracts and Test Baseline

- [x] 1.1 Extend existing TypeScript and Rust tests for materialized batch capacity, partial success, retry convergence, final sweep, deadline/error propagation, and correlated diagnostics
- [x] 1.2 Add materialized Reference Refresh batch limits and `operation_timeout` to the shared contract SSOT
- [x] 1.3 Add manifest-owned operation deadlines with 60-second Reference Refresh overrides and cross-language parity coverage

## 2. Rust Reference Refresh Execution

- [x] 2.1 Implement stable estimated source batching with a maximum of 100 sources and measured apply capacity checks
- [x] 2.2 Implement multi-source binary split, single-source bounded overflow, immediate CAS promotion, and deadline-aware partial results
- [x] 2.3 Implement retry convergence and the payload-free full-scope deletion sweep without a database migration

## 3. Production RPC Deadline and Errors

- [x] 3.1 Introduce one production RPC policy owner that resolves manifest deadlines and applies two seconds of local transport grace
- [x] 3.2 Preserve native `operation_timeout` and classify production transport failures with request/service error codes

## 4. Correlated Diagnostics

- [x] 4.1 Propagate debug-only root correlation through plugin RPC, native operation, Reverse Host, Reference Refresh batch, apply, and terminal events
- [x] 4.2 Add bounded batch capacity fields and keep success/correlation construction unreachable when diagnostics are disabled
- [x] 4.3 Update the Dashboard causal projection to prefer `correlationId` with legacy identity fallback

## 5. Documentation

- [x] 5.1 Update Synthesis runtime/rebuild and performance documentation to describe current source-batch convergence, deadlines, limits, and diagnostics

## 6. Verification

- [x] 6.1 Run focused Core/Zotero production-route tests, TypeScript typecheck, production build, capability/parity, and release-elision checks
- [x] 6.2 Run Rust fmt, clippy, and focused/workspace tests with the pinned toolchain
- [x] 6.3 Run strict OpenSpec validation and `git diff --check`
- [x] 6.4 Build and package the current-platform sidecar into the existing addon target for local retesting without remote dispatch
