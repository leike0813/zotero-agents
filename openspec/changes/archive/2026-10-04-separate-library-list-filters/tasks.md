# Tasks

## 1. Planning and fan-out baseline

- [x] 1.1 Verify all four issue #88 changes have proposal, delta specs, design and tasks and pass strict validation with apply state ready; record dependencies and stop boundary in the handoff.
- [x] 1.2 Record fixed baseline, explicit empty semantic deletion inventory, affected materialized metrics and full Broker/Workflow/built-in skill/Bridge/MCP/CLI fan-out in `surface-review.md`; verify against current source and surface manifest before semantic edits.

## 2. Canonical source filtering

- [x] 2.1 Use the existing source page-query literal filter and cursor tests as a failing TDD slice, rename the selector input/criteria/predicate/hash field, and verify tests `185` cover count/page parity, literal special characters, blank filters and changed-filter cursor rejection.
- [x] 2.2 Use existing Broker tests as failing slices, rename list/traversal/readiness DTOs and forwarding/echo fields, and verify `102` covers filtered pages, full traversal evidence, cancellation, invalid filter diagnostics and readiness while snapshots retain their contract.
- [x] 2.3 Update Broker component documentation with the current filter semantics and read/verify its description against the source predicate and unchanged snapshot behavior.

## 3. Workflow and built-in consumers

- [x] 3.1 Check explicit Workflow Host composition, live reads and contract variants; migrate actual copied inputs/fixtures and verify Host API and `187` governance tests preserve projection and call-control semantics.
- [x] 3.2 Trace dynamic collection-collector/literatureBundle/tag-auditor inputs and all built-in workflow/skill consumers; migrate actual criterion consumers, repair collector collection scoping and auditor resolved library identity against the canonical v12 DTOs, and verify existing bundle `47`, collector `49` and auditor `66` behavior tests through actual Workflow Host/Broker reads plus workflow manifest/consumer checks. Record inspected unchanged paths in the fan-out audit.
- [x] 3.3 Update the relevant Workflow component contract description where it names the criterion and verify documented v12 input/criteria shapes match the canonical DTO.

## 4. Bridge, MCP and CLI

- [x] 4.1 Use existing Bridge/MCP tests as failing slices, rename list/readiness schema and mapping fields, explicitly adapt retained search query to filter, and verify `107`, `108` and relevant `101` tests preserve paging, errors and existing bounded search results while rejecting old list/readiness payload fields.
- [x] 4.2 Audit CLI JSON parsing, canonical command contract, independent MCP alias schemas and output mocks; migrate actual criterion copies and verify current-source Rust CLI tests/descriptor checks keep `--query` and search query intact.
- [x] 4.3 Update enumeration payload facts in governed source guidance, complete semantic parity review, render through the existing content renderer and verify content/consumer and baseline-relative package gates; record zero unmapped, downgraded, unauthorized dropped and duplicate counts and explicit disposition of every depth warning.

## 5. Integration and stop

- [x] 5.1 Run relevant Node test suites, TypeScript check, changed-file lint/format checks and strict OpenSpec validation; review final diff against the fan-out audit and report verification evidence or environmental limitations without claiming unavailable real-Zotero execution.
- [x] 5.2 Confirm every C1 task is complete and the other three changes remain planning-only/apply-ready; deliver concise file/change/test/parity summary and stop without implementing C2–C4, committing, switching branches, publishing or archiving.
