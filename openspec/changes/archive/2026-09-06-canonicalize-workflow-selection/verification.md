# Implementation verification

Change: `canonicalize-workflow-selection` (spec-driven). This review follows the official `openspec-verify-change` workflow; structural validation alone is not implementation evidence.

## Requirement mapping

| Requirement group | Implementation | Observable evidence |
| --- | --- | --- |
| Exact selection pages, bounded hydration, cancellation and changed basis | Broker `getSelectedItems`; SelectionContext `readSelectionContext` | 102 exact order/children, 25/100 bounds, 10,001 selection, basis changes and cancellation; selection-canonical complete acquisition and failure |
| Small current view, ordered library sources and Saved Search refs | Broker current-view serializer; explicit V12 context projection | 102 current-view and V12 conformance; 11 actual Zotero child/collection/Saved Search identities on pinned Linux runtimes |
| Ordered canonical facts and all atomic member kinds | SelectionContext builder/schema; Input Planning v2 | 10/11 schema and rebuild; 173 parent/child/attachment/note, whole selection, related deduplication and immutable scoped units |
| One locked trigger input for preview and execution | workflowExecute, workflowMenu, preparationSeam, ACP action router | 48 preparation failures; settings UI fixed preview and trigger-time identity; 130 ACP adaptation |
| Named task policies and final local file resolution | workflowInputPlanning; declarativeRequestCompiler; built-in hook source adapters | 173 source/group/filter behavior; selection-canonical descriptor availability; all 279 workflow tests and 24 native MinerU/note workflow cases |
| REST/registry/MCP canonical pages and fail-closed injection | hostBridgeServer; hostBridgeCapabilityRegistry; zoteroMcpProtocol | 101/102/106/107 and executable agent surface 169 |
| Strict explicit remote refs and durable identities | hostBridgeWorkflowControl; hostBridgeWorkflowAgentRunStore; agent-run apply; sequenceRuntime | 108 invalid refs, retained incomplete records, changed UI, durable replay/handoff, and 154 sequence source token/recovery cases |
| CLI cursor forwarding and removal of old inputs | CLI args/commands; capabilities and CLI JSON contracts | 123 Rust unit tests and 11 schema integration tests |

All 20 retained/added requirements and the removed snapshot requirement are represented by these groups. The eight main specs match the delta requirement statements and scenarios. Unmentioned main-spec requirements remain intact.

## Coherence and validation boundaries

The implementation reuses Broker pagination/control and file descriptors, explicit V12 member projection, Input Planning v2 and existing upload/result owners. It adds no Host callable, dependency, selection cache, persistent selection basis or publication action. The debug migrator entrance remains available as required by the change split.

The source-owned surface mapping, authorized deletions, fixed-baseline depth results and four semantic counters are recorded in `surface-review.md`. Commands, logs and native runtime receipts are recorded in `acceptance.md`.

## Verification result

All 15 implementation tasks are complete. The final focused rerun passed 125 cases across sequence runtime, input planning and Host Bridge workflow control; the complete workflow suite passed 279 cases. TypeScript, sidebar type checking, plugin build, Prettier, ESLint, CLI tests, native compatibility checks and governed surface checks are recorded in `acceptance.md`. The four selection closure counters and four governed surface counters are zero.

The broad-suite failures and unrun Windows/macOS native targets remain explicit validation boundaries in `acceptance.md`; they do not map to an unimplemented requirement in this change.
