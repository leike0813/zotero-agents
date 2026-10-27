# Proposal

## Why

The first release after v0.8.4 replaces substantial Synthesis and frontend implementation. Existing ACP E2E proves transport and lifecycle behavior, but does not establish the behavior of the 20 production workflows through their real submission and apply paths.

## What Changes

- Capture successful production workflow executions in a fresh profile populated with copied source metadata and independently stored PDFs.
- Stop capture at the first execution, apply, contract, or business-flow error; retain diagnostics without treating failures as expected output. Agent prose quality is outside the acceptance boundary.
- Add a serial Workflow happy-path family to the existing System E2E runner, with synthetic offline peers derived from reviewed successful evidence and an explicit live mode.
- Cover all 20 non-debug workflows, including translation composition, seed/planned topic creation, dependency changes and update, and bundle/note round trips.
- Validate live behavior on Linux Zotero 10 and offline behavior on Linux Zotero 7, 9, and 10.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `system-e2e-strategy`: add the WF happy-path catalog, successful-evidence admission, isolated source preparation, and explicit human interaction policy.

## Impact

Changes include test infrastructure, fixtures, E2E cases, documentation, and user-authorized repairs discovered during capture. Reference filtering recognizes explicit author-list patterns and keeps Citation relations consistent with filtered References. Translation retains readable stored image companions. Collection Collector follows opaque pagination and flat Topic source contracts and preserves runtime failures. Host approval ownership and CLI request budgets remain aligned. Bundle import accepts optional explicit destination library/collection parameters for non-interactive calls; direct submissions propagate apply failures and release owned resources. Release gates and success DTOs retain their existing contracts. Real document content and credentials stay private; committed fixtures contain synthetic content and de-identified structural expectations. Existing local Node/Zotero/Rust tools are reused without dependency installation.
