## 1. Contract and matrix foundations

- [x] 1.1 Add failing table-driven tests for compatibility-manifest validation and PR/main/release planning, then implement the manifest schema, exact Zotero targets, and planner until they pass.
- [x] 1.2 Add failing tests for supported Zotero major parsing, then add a plugin-safe shared parser and migrate existing compatibility branches to it.
- [x] 1.3 Update the add-on manifest and compatibility contract tests for Zotero 10, verifying the packaged manifest accepts `10.0.*` without weakening the minimum version.

## 2. Host acquisition and session lifecycle

- [x] 2.1 Add failing tests for cache digest validation, unsupported targets, and unsafe archive entries, then implement content-addressed acquisition and platform extraction adapters until they pass.
- [x] 2.2 Add failing tests for unique run layout, phase deadlines, owned-process cleanup, and failure receipts, then implement the isolated host-session lifecycle until they pass.
- [x] 2.3 Add receipt serialization tests and implement stable structured receipts that are written for success, timeout, launch failure, test failure, and cleanup failure.

## 3. Real Zotero execution modes

- [x] 3.1 Add command/resource contract tests, then implement behavioral execution that generates only the requested existing lite/full test resource and launches the acquired host without rebuilding the plugin artifact.
- [x] 3.2 Add lifecycle contract tests, then implement formal-XPI smoke installation, startup-marker verification, disable/uninstall, and shutdown-marker verification.
- [x] 3.3 Add package scripts for manifest planning, one-cell execution, local matrix execution, and formal-XPI smoke; verify CLI help and dry-run output on Linux.

## 4. Zotero 10 host contract

- [x] 4.1 Add failing broker tests for Zotero 10 multiple selection, Zotero 7/9 fallback, unique-library projection, and non-collection rows, then implement the ordered plural source DTO.
- [x] 4.2 Update Workflow Host, ACP context, Host Bridge/MCP wire projections and their tests so they carry plural library identity without exposing raw host rows or version branches.
- [x] 4.3 Run focused broker, Workflow Host, MCP, replay, and performance tests and resolve compatibility type drift.

## 5. CI, documentation, and evidence

- [x] 5.1 Add GitHub Actions jobs driven by planner output: blocking Windows/Linux lite on pull requests, blocking full plus XPI smoke on main/release, and non-blocking macOS dual-architecture Zotero 10 smoke; validate workflow syntax and planner parity.
- [x] 5.2 Document prerequisites, local commands, matrix policy, cache verification, artifact/receipt layout, diagnostics, and cleanup; update public Zotero 10 support sources and regenerate derived help files through the existing generator.
- [x] 5.3 Run OpenSpec strict validation, relevant Node tests, typecheck, lint, build, and the available Linux real-host smoke; record any platform evidence that cannot be produced locally.
