# Tasks

## 1. Service Design Document

- [x] Add `doc/components/zotero-mcp-service-design.md`.
- [x] Document the current 17-tool registry.
- [x] Document read/context tool signatures and result disclosure rules.
- [x] Document diagnostic tool contract.
- [x] Document permission-gated write tool signatures and execution model.
- [x] Document v1 non-goals for aggregate context and attachment text extraction tools.

## 2. OpenSpec Artifacts

- [x] Add proposal, design, tasks, and delta spec for `formalize-zotero-mcp-service-design`.
- [x] Capture agent-facing disclosure requirements in `zotero-mcp-tool-suite`.
- [x] Capture that `content[].text` must not be count-only for list/detail tools.

## 3. Validation

- [x] Run `openspec status --change "formalize-zotero-mcp-service-design"`.
- [x] Run `openspec instructions proposal --change "formalize-zotero-mcp-service-design"`.

## 4. Future Runtime Follow-Up

- [x] Update MCP runtime summaries so read tools expose actionable ids and refs in `content[].text`.
- [x] Add tests that reject count-only summaries for notes, attachments, selected items, and item details.
- [x] Verify write tool results include permission, execution, and verification guidance.
