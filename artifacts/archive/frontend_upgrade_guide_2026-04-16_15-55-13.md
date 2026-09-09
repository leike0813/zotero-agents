# Frontend Repair Visibility Upgrade Guide

Generated at: `2026-04-16 15:55:13`

## What changed

The correct baseline for this upgrade is the pre-supersede behavior.

Originally, there was no dedicated supersede/revision mechanism for repair:

- `assistant.message.final` could be emitted before repair started
- if that final failed output validation, repair began, but the already-emitted final was still left in chat
- after multiple repair rounds, the chat window could accumulate multiple final-looking replies from the same repair family

The newer repair visibility mechanism was introduced to solve that problem:

- if a final is rejected and repair begins, the orchestrator emits `assistant.message.superseded`
- chat replay derives that FCMP event into `assistant_revision`
- the visible chat surface keeps only the winning message in the same repair family as the primary visible final
- superseded finals are preserved as folded history entries labeled as rejected final replies

## Important boundary

`assistant.message.superseded` is **not** a RASP/parser event.

- It comes from orchestrator repair governance.
- It is public FCMP/chat-read-model semantics.
- Raw/RASP evidence is still preserved for audit.

## Frontend rule

All chat clients should follow the same behavior:

- accept `assistant_revision` rows from `/chat` and `/chat/history`
- feed them into the shared chat model
- do **not** treat `assistant_revision` as a normal assistant final row
- render `assistant_revision` through the dedicated revision entry path
- let the chat model keep the family winner primary-visible while preserving superseded finals as folded history

## Management page and e2e page

Both of these surfaces now need to stay aligned:

- `server/assets/templates/ui/run_detail.html`
- `e2e_client/templates/run_observe.html`

The critical implementation detail is the same on both pages:

- allow empty-text rows only when `kind === "assistant_revision"`
- pass those rows into `chatModel.consume(event)`
- short-circuit direct bubble rendering for `assistant_revision`
- render revision entries in both `plain` and `bubble` modes through the dedicated revision branch, not through normal assistant message rendering

The two surfaces should also stay aligned on terminology:

- role/title: `被打回的最终回复`
- collapsed hint only: `（已折叠）`
- expanded content: show the superseded final body exactly once

## Chat winner rule

For one `message_family_id`:

- a final that enters repair is superseded and folded
- each later invalid repair final is superseded and folded again
- only one winner remains primary-visible

The winner can be:

- the converged final
- the terminal fallback final/notice
- the non-terminal canonical visible message produced after repair exhaustion

Old invalid finals must never return as primary-visible finals, but they still remain visible as folded revision entries.

## Rejected final reply contract

`assistant_revision` currently maps to a visible UI concept:

- a rejected final reply
- inline folded history
- one revision entry per superseded final

The current frontend contract is:

- do **not** merge multiple repair rounds into one revision bubble
- default state is folded
- folded state shows only the collapsed hint, not the old final body
- expanded state shows the old final body exactly once
- the old final body must be the user-visible final text, not raw compat/canonical structured JSON
- a revision entry only applies to the superseded final it points to; it must not fold later assistant messages, process items, or other families

This means winner-only and folded history coexist:

- winner-only governs which final is primary-visible
- folded history preserves each rejected final reply in place for auditability and UI continuity

This should not be understood as:

- "the old system already had superseded finals, but hid them incorrectly"

The correct historical framing is:

- first there was no supersede mechanism
- then supersede/revision semantics were introduced
- the current implementation defines how those rejected final replies should be rendered correctly

## Files relevant to this upgrade

- `server/runtime/protocol/event_protocol.py`
- `server/runtime/chat_replay/factories.py`
- `server/assets/static/js/chat_thinking_core.js`
- `server/assets/templates/ui/run_detail.html`
- `e2e_client/templates/run_observe.html`
- `server/contracts/schemas/runtime_contract.schema.json`
- `server/contracts/invariants/chat_replay_contract.yaml`
- `server/contracts/invariants/runtime_event_ordering_contract.yaml`
- `server/contracts/invariants/session_fcmp_invariants.yaml`

## Minimal frontend checklist

- `/chat` consumer accepts `assistant_revision`
- `/chat/history` consumer accepts `assistant_revision`
- live SSE `chat_event` consumer accepts `assistant_revision`
- direct DOM append path ignores `assistant_revision`
- shared chat model remains the source of truth for winner visibility and revision folding
- `assistant_revision` is rendered as a dedicated revision entry in both `plain` and `bubble` modes
- collapsed revision entries show only `（已折叠）`
- expanded revision entries show one copy of the rejected final body
- multiple rejected finals are not merged into one bubble

## Waiting-user input strategy

The e2e waiting-user surface now treats prompt-card actions as suggested shortcuts, not as the only reply path.

- when `ui_hints.kind === open_text`, the reply composer keeps the existing multi-line behavior
- when `ui_hints.kind !== open_text`, the prompt-card actions still render unchanged
- in that non-`open_text` case, the reply composer is **not** hidden anymore
- instead, it switches to a compact single-line visual mode
- the compact composer uses a dedicated placeholder:
  - `或输入其他要求...`
  - and the localized equivalents in other languages
- the prompt-card hint text still belongs to the card itself; it is no longer reused as the compact composer placeholder
- freeform input still submits through the existing interaction reply payload shape; no backend protocol change is required
