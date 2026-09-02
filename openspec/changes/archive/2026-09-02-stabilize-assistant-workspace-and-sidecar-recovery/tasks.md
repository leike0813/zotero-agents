## 1. Assistant Workspace

- [x] 1.1 Add generation/owner initialization reuse and stale-publication guards to the shared runtime
- [x] 1.2 Wire child document generation and initialization failure logging through the host
- [x] 1.3 Remove persistent high-frequency success traces while retaining ready and failure events
- [x] 1.4 Add shared-runtime, SkillRunner integration, and log-policy regression tests

## 2. Sidecar recovery

- [x] 2.1 Reconcile stale discovery only after winning the production lock
- [x] 2.2 Add lock-order, cleanup-failure, and lock-release unit coverage
- [x] 2.3 Add a real-process parent-input shutdown and stale-discovery case

## 3. Windows symbols

- [x] 3.1 Add deterministic PDB packaging, strict manifest validation, and size gate
- [x] 3.2 Publish symbols as an immutable prebuild-branch sibling in the same commit
- [x] 3.3 Make Windows cache reuse require a matching symbol artifact
- [x] 3.4 Keep symbol tooling in prebuild-pipeline identity only and keep symbols outside runtime bundles

## 4. Validation

- [x] 4.1 Run strict OpenSpec validation and targeted Node tests
- [x] 4.2 Run TypeScript, ESLint, Prettier, and Synthesis service-boundary checks
- [x] 4.3 Run Rust tests, format check, and clippy
- [x] 4.4 Report expected native prebuild staleness without dispatching remote work
