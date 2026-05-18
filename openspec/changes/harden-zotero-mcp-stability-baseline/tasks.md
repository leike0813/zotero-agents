# Tasks

## 1. OpenSpec

- [x] Create OpenSpec change `harden-zotero-mcp-stability-baseline`.
- [x] Add proposal, design, tasks, and delta specs.

## 2. Protocol and Schema Tests

- [x] Add tests for `id:null`, missing-id notifications, invalid ids, unknown
  tools, unknown args, wrong types, enum failures, length/array bounds, and
  malformed JSON.
- [x] Add tests that business/tool validation failures return structured
  `isError=true` results where appropriate.

## 3. Queue and Transport Tests

- [x] Add queue tests proving running timeout does not release the host-call
  slot until the underlying tool finishes.
- [x] Add status tests for timed-out active tools and retry guidance.
- [x] Add HTTP tests for query-token rejection, Origin allowlist, oversized
  body rejection, and malformed URL/query handling.

## 4. Synthesis MCP Tests

- [x] Add tests for `getPaperRegistry` paging and filtering.
- [x] Add tests for `resolveResolver` paging metadata.
- [x] Add tests for compact `getLibraryIndex`, summary `getTopicContext`, and
  bounded `getReviewInput`.

## 5. Implementation

- [x] Implement centralized tool schema validation in `zoteroMcpProtocol`.
- [x] Implement structured tool execution errors.
- [x] Fix queue timeout retention in `zoteroMcpServer`.
- [x] Harden local HTTP authorization, origin, body-size, parsing, and token
  generation behavior.
- [x] Implement Synthesis MCP paging, include flags, and truncation diagnostics.
- [x] Update built-in synthesis skill instructions for summary-first context and
  compact paged library index behavior.

## 6. Documentation and Verification

- [x] Update Zotero MCP service design documentation.
- [ ] Run `npm run test:node:core`.
  - 2026-05-17: ran; 821 passing, 46 pending, 10 failing in existing
    `test/core/129-synthesis-layer-integration.test.ts` Synthesis v1 cases.
- [x] Run `npm run build`.
- [x] Run `openspec validate harden-zotero-mcp-stability-baseline --strict`.
