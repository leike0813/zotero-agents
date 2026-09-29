# Tasks

## 1. Dependency and browser boundary

- [x] 1.1 Pin MCP v2 client/core, migrate the existing v1 test helper, and verify the Host Bridge MCP compatibility test.
- [x] 1.2 Add the browser-import and size check and verify `npm run check:pi-mcp-browser-bundle` and `npm run build`.

## 2. Configuration and credentials

- [x] 2.1 Write failing namespace and legacy-credential tests, extend the Built-in Agent Credential Store, and pass the targeted credential tests.
- [x] 2.2 Write failing source validation/import/export/review tests, add the single profile registry, and pass the targeted registry tests.
- [x] 2.3 Extend the Backend Manager Preact page, wire DTO/actions, preferences, locales and documentation; pass existing dashboard/UI and new source management tests.

## 3. Outbound runtime and policy

- [x] 3.1 Write failing stdio transport tests, implement the C09-backed SDK Transport, and pass Node plus real Zotero Linux/Windows canaries.
- [x] 3.2 Write failing HTTP discovery, invalidation, cancellation and result projection tests, implement the lazy MCP source owner, and pass targeted runtime tests.
- [x] 3.3 Write failing Gateway proxy/effect/receipt tests, compose frozen hidden catalog and direct promotions through C07, and pass targeted Gateway tests.
- [x] 3.4 Compose lazy ownership and bounded shutdown in hooks; pass the real Zotero core/UI source tests and update domain/agent constraints.

## 4. Integrated acceptance

- [ ] 4.1 Run Node full and UI, Zotero core and UI, lint, build, browser check and strict OpenSpec validation; record exact results and any required exception.
- [ ] 4.2 Update the Pi handoff with achieved evidence, run official verification, sync the specs and archive the complete change.
