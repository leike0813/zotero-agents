## 1. Shared Contracts And Tests

- [x] 1.1 Add Core 216 fixtures for strict WebDAV DTOs, remote layout, import gates, publication order, state recovery, retry, cancellation, and lifecycle
- [x] 1.2 Add shared pointer, state, conflict, progress, application-port, persistence-port, and policy contracts
- [x] 1.3 Add strict bounded rebuilders and canonical remote path/snapshot helpers while retaining the Host port wire shape
- [x] 1.4 Export the new contracts and pass contract-focused Core 216 plus package TypeScript

## 2. Environment-Neutral WebDAV Application

- [x] 2.1 Implement lazy remote durable sources, strict HEAD discovery, preview-first import, receipt apply/discard, and unbased policy gating
- [x] 2.2 Implement deterministic local export upload in bundle/manifest/HEAD order with observed ETag conflict handling
- [x] 2.3 Implement canonical state/conflict persistence, progress phases, permanent/retryable classification, pause/resume, and stale-running recovery
- [x] 2.4 Implement generation-bound debounce/retry scheduling, four-attempt bounds, cancellation gates, single-active admission, stop, and shutdown drain

## 3. Private Node Composition

- [x] 3.1 Add an identity-bound atomic Node WebDAV state store and disabled Host port composition adapter
- [x] 3.2 Compose WebDAV after durable import recovery without public routing or automatic invocation
- [x] 3.3 Stop and drain WebDAV before durable, canonical, and repository owners close
- [x] 3.4 Extend Core 168/193/216 for private capability, recovery ordering, close ordering, and runtime/XPI inventory

## 4. Production Compatibility Refactor

- [x] 4.1 Add production durable/state/progress adapters over existing roots and runtime files
- [x] 4.2 Replace plugin-local orchestration with the shared application while preserving exports, methods, DTOs, paths, bytes, progress, state, actions, and legacy unbased policy
- [x] 4.3 Keep preferences, encrypted credentials, URL construction, HTTP, abort ownership, and Host port shape plugin-owned
- [x] 4.4 Run Core 158/159/184/215 to lock durable, WebDAV, retry/conflict, credentials, autosync, and Host behavior

## 5. Packaging, Documentation And Verification

- [x] 5.1 Update TypeScript inputs, package exports, migration inventory, release fingerprints, runtime inventory, and XPI fail-closed checks
- [x] 5.2 Update README, persistence, runtime, WebDAV, sequences, state-machines, and Stage 1 WS5 current-state documentation
- [x] 5.3 Run package/service/root TypeScript, Synthesis boundaries/invariants, Prettier, ESLint, help-doc, and focused Core suites
- [x] 5.4 Run production build, runtime/XPI fail-closed checks, `git diff --check`, and strict OpenSpec validation
