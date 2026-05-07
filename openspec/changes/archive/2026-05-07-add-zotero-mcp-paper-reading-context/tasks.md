# Tasks

## 1. OpenSpec and Documentation

- [x] Add proposal, design, tasks, and delta spec for `add-zotero-mcp-paper-reading-context`.
- [x] Update `doc/components/zotero-mcp-service-design.md` with the paper reading context tool and attachment reading metadata.

## 2. MCP Runtime

- [x] Add `prepare_paper_reading_context`.
- [x] Add attachment reading metadata to `get_item_attachments`.
- [x] Ensure aggregation uses bounded notes and note payload manifests only.
- [x] Ensure attachment file content remains out of scope.

## 3. Tests

- [x] Extend MCP server tests for tool listing, selected-item context resolution, multiple-selection rejection, attachment recommendation, and no file-content disclosure.
- [x] Run targeted MCP tests.
