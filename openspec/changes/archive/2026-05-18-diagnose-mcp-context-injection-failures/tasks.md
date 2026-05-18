# Tasks

## 1. OpenSpec

- [x] Create OpenSpec change `diagnose-mcp-context-injection-failures`.
- [x] Add proposal, design, tasks, and delta specs.

## 2. Diagnostics Core

- [x] Add backend-agnostic MCP context injection diagnostic model and classifier.
- [x] Add default evidence collection from adapter diagnostics, run transcript,
  and Zotero MCP runtime logs.
- [x] Add Claude Code ACP evidence collector for debug/session files.
- [x] Redact tokens and authorization material in all persisted diagnostics.

## 3. Smoke Integration

- [x] Persist diagnostics when callable smoke fails.
- [x] Include classification, confidence, and diagnostic paths in run events and
  runtime logs.
- [x] Keep callable smoke blocking semantics unchanged.

## 4. Zotero MCP Transport Diagnostics

- [x] Record redacted request header facts and response byte/write facts.
- [x] Record `tools/list` tool count and required synthesis tool presence.
- [x] Record `/mcp` GET 405 unsupported-stream evidence without changing
  protocol behavior.

## 5. Verification

- [x] Add/update core tests for classifier, collectors, smoke integration, and
  MCP transport diagnostics.
- [x] Run `npm run test:node:core`.
- [x] Run `npm run build`.
- [x] Run `openspec validate diagnose-mcp-context-injection-failures --strict`.
