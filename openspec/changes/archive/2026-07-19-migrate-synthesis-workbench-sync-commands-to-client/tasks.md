## 1. Red Tests

- [x] 1.1 Update Workbench and service-boundary tests to require all ten Git/WebDAV Sync commands to route through `client.sync`, preserve single-flight/action/defer/failure/polling/chrome behavior, forbid full-service imports, and retain 128 public methods with three direct consumers.
- [x] 1.2 Update contract and in-process adapter tests for both transports, opaque JSON object rebuilding, strict canonical conflict DTOs, invalid-before-port behavior, unknown-field stripping, and stable error classification.
- [x] 1.3 Update default-client tests to require cached and uncached fresh acquisition to rebuild both the client and legacy default service.

## 2. Sync Client Capability

- [x] 2.1 Add environment-neutral shared Sync transport contracts, canonical conflict actions, opaque JSON-safe command results, and `SynthesisClient.sync.git` / `sync.webDav`.
- [x] 2.2 Add ten optional in-process legacy ports with strict conflict request rebuilding, shared result normalization, and stable `invalid_request`, `unavailable`, client-error, `storage_busy`, and `internal` handling.
- [x] 2.3 Compose all ten ports from existing legacy Git/WebDAV service methods without changing the 128-method public service surface.
- [x] 2.4 Add a fresh default-client helper that always clears the client cache and invalidates the legacy default service before recreating the client.

## 3. Workbench Boundary Migration

- [x] 3.1 Move `topicPathId` verbatim into Synthesis foundation, use it from service and Workbench, and remove every Workbench `synthesis/service` import.
- [x] 3.2 Route the five Git Sync commands through a fresh client inside existing single-flight closures while preserving action defaults, immediate start, failure-state handling, polling, and chrome behavior.
- [x] 3.3 Route the five WebDAV Sync commands through a fresh client inside existing single-flight closures while preserving action defaults, WebDAV-run-only deferred start, failure-state handling, polling, and chrome behavior.
- [x] 3.4 Remove Workbench from the direct-consumer inventory while retaining Sync method classification, Host Bridge/MCP access, and the 128-method public surface.

## 4. Documentation and Validation

- [x] 4.1 Update current-state Synthesis README, runtime/rebuild, Workbench host, and Workbench UI documentation for the bounded Sync client and the absence of production Workbench full-service access.
- [x] 4.2 Run focused core tests 125, 144, 152, 159, 168, 175, 176, and 177; the read-only UI harness; Synthesis invariant, contracts/root TypeScript, and service-boundary checks; targeted Prettier/ESLint; and `git diff --check`.
- [x] 4.3 Run the production build and strict OpenSpec validation, preserve the existing `reference/Skill-Runner` state, and confirm all tasks complete without archiving or committing the change.
