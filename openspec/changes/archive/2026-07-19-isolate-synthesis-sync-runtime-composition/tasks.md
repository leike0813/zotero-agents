## 1. Contract and Adapter TDD

- [x] 1.1 Add Core 184 red tests for canonical WebDAV description/read/write/collection DTO rebuilding, JSON safety, managed relative paths, unknown-field removal, and stable result unions.
- [x] 1.2 Add adapter red tests for invalid-before-I/O, current prefs/credential reads per operation, URL/root resolution, accepted MKCOL statuses, ETag conflicts, and sanitized failure results.
- [x] 1.3 Implement/export the strict `SynthesisHostWebDavSyncPort` contract and production prefs-backed Host adapter.

## 2. Runtime Composition Migration

- [x] 2.1 Add the cohesive Git runtime binding and pure disabled Git/WebDAV implementations without Host fallback.
- [x] 2.2 Refactor WebDAV Sync to consume only the semantic Host port while preserving remote HEAD, snapshot, collection, and conflict behavior.
- [x] 2.3 Refactor `SynthesisServiceOptions` and default/readonly composition to inject runtime capabilities; remove old adapter/client/command-runner/configuration callback options.

## 3. Dead Facade and Boundary Cleanup

- [x] 3.1 Delete the ten unconsumed Git/WebDAV configuration/status/credential/test service methods and keep Preferences hooks as the configuration/invalidation owner.
- [x] 3.2 Update the service migration inventory and Core 168/176 boundary assertions to `115 methods / 1 direct consumer`, production injection, readonly disabled injection, and forbidden Host imports.
- [x] 3.3 Extend Core 144/159/175 for active runtime parity, live status/credential behavior, disabled no-subprocess/no-fetch behavior, and unchanged `SynthesisClient.sync` commands.

## 4. Documentation and Validation

- [x] 4.1 Update current-state Synthesis README, runtime/rebuild, durable-sync documentation, and contract inventory for composition-owned Sync configuration and secrets.
- [x] 4.2 Run Core 125, 126, 144, 158, 159, 168, 175, 176, 184, readonly UI harness, Synthesis invariants, contracts/root TypeScript, service-boundary, targeted Prettier/ESLint, `git diff --check`, and production build.
- [x] 4.3 Run strict OpenSpec validation and confirm all tasks complete without archiving, publishing, or committing the change.
