# Tasks

## 1. OpenSpec and Documentation

- [x] Add proposal, design, tasks, and delta spec for `extend-zotero-mcp-note-payload-codec`.
- [x] Update `doc/components/zotero-mcp-service-design.md` with the note payload codec and four new tools.

## 2. Shared Codec and Broker

- [x] Add a shared note payload codec module.
- [x] Add host API read support for listing note payloads and reading one payload.
- [x] Preserve raw note tool behavior.

## 3. MCP Runtime

- [x] Add `list_note_payloads` and `get_note_payload`.
- [x] Add `create_markdown_note` and `update_markdown_note`.
- [x] Ensure markdown writes use permission-gated mutation execution.
- [x] Ensure JSON workflow payloads are read-only.

## 4. Tests

- [x] Add codec round-trip and decode tests.
- [x] Extend MCP server tests for tool listing, note payload reads, markdown writes, and permission behavior.
- [x] Run targeted MCP and TypeScript validation.
