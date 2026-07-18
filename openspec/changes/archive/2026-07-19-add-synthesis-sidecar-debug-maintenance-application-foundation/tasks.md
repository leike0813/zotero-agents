## 1. Shared Contracts And Core 217

- [x] 1.1 Add Core 217 fixtures for exact fields, JSON safety, redaction, bounds, stable ordering/cursors, truncation, diagnostics, coherent capture, zero-write reads, profiler unavailability, lifecycle, and close ordering
- [x] 1.2 Add shared strict status, schema, cache, operation, snapshot, inspect, diff, profiler, maintenance-port, and application contracts
- [x] 1.3 Export canonical builders with ordinary page bound 100 and debug bound 1,000 while making SQL, table, path, raw row, executable value, and unbounded snapshot exposure unrepresentable
- [x] 1.4 Pass contract-focused Core 217 and package TypeScript

## 2. Repository Projection And Application

- [x] 2.1 Add bounded read-only repository projections for basis, schema summary, cache, operations, paper, and Topic facts with stable sort/cursors
- [x] 2.2 Implement transactional repository capture, out-of-transaction bounded canonical descriptor inspection, basis recapture, and `superseded` results
- [x] 2.3 Implement pure snapshot diff, missing/corrupt canonical diagnostics, and optional redacted profiler with Node `unavailable`
- [x] 2.4 Implement zero-write read paths, single-active maintenance admission, stop, shutdown drain, and delegation ports for checkpoint, durable, and protected reset owners

## 3. Private Node Composition

- [x] 3.1 Compose debug/maintenance after repository/canonical recovery and existing domain, checkpoint, durable, and WebDAV applications
- [x] 3.2 Stop and drain debug/maintenance before WebDAV, durable, checkpoint, domain, canonical, and repository closure
- [x] 3.3 Keep private composition disconnected from HTTP/RPC, workers, `SynthesisClient`, Workbench, Host Bridge, MCP, production roots, and automatic invocation
- [x] 3.4 Extend Core 168/175/176/193/217 for import boundaries, transaction/worker ownership, private composition, runtime/XPI inventory, fingerprint, and dependency ordering

## 4. Production Compatibility And Maintenance Ownership

- [x] 4.1 Delegate production bounds, canonicalization, schema projection, and pure diff to shared SSOT while preserving `debugSynthesis*`, maintenance DTOs, methods, and results
- [x] 4.2 Reuse Knowledge Checkpoint, Durable Bundle, and confirmation-protected reset owners without copying mutations into Node
- [x] 4.3 Classify legacy JSON import, production profiler source, Host paper details, and clean-install reset as retained production owners
- [x] 4.4 Extend Core 123/146/152 for unchanged MCP, Host Bridge, CLI, protected-reset, and maintenance behavior

## 5. WS5 Exit Gates And Documentation

- [x] 5.1 Prove every required private use case against an isolated DB/root and no write occurs through read projections
- [x] 5.2 Prove service packages import no plugin/Zotero modules, transactions cross no Host/file/network long IO, and compute workers own no repository/canonical commit
- [x] 5.3 Complete migration-inventory disposition for every production capability while retaining `108 methods / 1 direct consumer` and `mutationEnabled: false`
- [x] 5.4 Update README, runtime, persistence, maintenance/debug, packaging, migration inventory, and Stage 1 plan to mark WS5 complete and WS6 next

## 6. Verification

- [x] 6.1 Run focused Core 123/146/152/168/175/176/193/217 suites and Synthesis boundary/invariant checks
- [x] 6.2 Run package, service, and root TypeScript plus Prettier, ESLint, and help-doc checks
- [x] 6.3 Run production build, runtime/XPI fail-closed checks, and fingerprint validation
- [x] 6.4 Run `git diff --check` and strict OpenSpec validation
