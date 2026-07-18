## 1. Response boundary tests and implementation

- [x] 1.1 Add failing tests for once-only JSON preparation, Unicode byte length, MCP logging reuse, asynchronous memory write, and R6 file-branch isolation.
- [x] 1.2 Add the shared prepared-memory response module and migrate Host Bridge and MCP response builders.
- [x] 1.3 Remove capability JSON deep cloning and tighten the capability result type.

## 2. Runtime tree tests and implementation

- [x] 2.1 Add failing manifest tests for deterministic metadata, exact exclusions, observation-only budgets, incomplete scans, and native copy.
- [x] 2.2 Add the operation-scoped manifest walker, policy presets, diagnostics, and independent copy scheduler.
- [x] 2.3 Migrate skill registry/catalog/resource/result/bundle hot paths to reuse manifests and single-flight concurrent builds.
- [x] 2.4 Migrate remaining recursive scan/copy callers and remove the old recursive implementations.

## 3. Verification and documentation

- [x] 3.1 Run R6, Host Bridge, MCP, registry, catalog, runner, type, lint, build, CLI, and OpenSpec checks.
- [x] 3.2 Run Zotero 9 mechanism coverage and Zotero 7 when available; record unavailable coverage without compatibility fallback.
- [x] 3.3 Update the risk audit with implemented behavior, evidence, and retained residual risks.
