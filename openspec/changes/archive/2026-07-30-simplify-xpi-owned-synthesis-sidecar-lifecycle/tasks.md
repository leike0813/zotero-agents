## 1. Fix Stable Contracts and Tests

- [x] 1.1 Replace installer tests with one-current-XPI, verified reuse, atomic replacement, and failed-replacement preservation
- [x] 1.2 Replace supervisor and production-route tests with session discovery, repeated restart, process-held lock, parent-pipe shutdown, and inert legacy files
- [x] 1.3 Add RPC regressions proving application errors retain their real codes and service identity is only a live-connection fence

## 2. Simplify Runtime Packaging

- [x] 2.1 Remove installed-version resolution, pointers, previous/rollback, expiry policy, and content-equivalence identity
- [x] 2.2 Materialize the verified packaged bundle into one fixed `current` directory through verified sibling staging

## 3. Simplify Launch and Ownership

- [x] 3.1 Replace production admission with one launch config that directly names production storage and reverse Host
- [x] 3.2 Replace owner/lease/global discovery state with launch-scoped discovery, a held Rust production lock, and parent-pipe lifetime
- [x] 3.3 Collapse plugin startup to install, launch, health/handshake, native-client publication, reconcile, and shutdown

## 4. Remove Unsupported State Machines

- [x] 4.1 Delete runtime admission store, generation upgrade coordinator, cutover receipt runtime path, activation evidence, and startup critical smoke
- [x] 4.2 Remove the corresponding shared contracts, Rust parsers/commands, persistence paths, tests, and dead exports
- [x] 4.3 Keep existing legacy profile files and directories untouched but prove product runtime never reads or writes them

## 5. Schema Migration Boundary

- [x] 5.1 Make empty production initialization native-owned and reject partial source state
- [x] 5.2 Create schema backups only for registered migrations and preserve the original basis on backup or migration failure

## 6. Specifications, Documentation, and Acceptance

- [x] 6.1 Replace current upgrade/cutover/activation specifications with the XPI-only lifecycle and reconcile dependent active changes
- [x] 6.2 Update packaging, supervision, persistence, and runtime documentation
- [x] 6.3 Run focused tests, TypeScript, ESLint/Prettier, Rust fmt/clippy/tests, contract/capability checks, build, and strict OpenSpec validation
- [x] 6.4 Verify startup, lock conflict, restart, production access, and inert legacy files through the real Rust path on a temporary profile without writing the real profile
