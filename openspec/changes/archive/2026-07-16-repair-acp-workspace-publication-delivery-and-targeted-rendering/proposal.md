## Why

Round2 reduced ACP Chat publication bytes but left the browser path page-wide and introduced delivery and measurement races: Chat first-open transcript can remain empty, Skills target-active replay regressed, and both surfaces can report incomplete publication lifecycles even when replay execution completes. The shared v3 data plane must therefore be completed end to end rather than patched with surface-specific retries or render exceptions.

## What Changes

- Make Chat and Skills produce the same minimal `append_text`, `patch_item`, `upsert_item`, and `delete_item` semantics from their event seams.
- Serialize loading, page-ready, delta, resync, and rebase publications in one owner-scoped coordinator lane.
- Make Shell retain and replay typed publications across child readiness and child-document replacement, with idempotent terminal acknowledgement.
- Replace page-wide browser cloning and revision-driven transcript clearing with a shared item model and targeted render effects.
- Close replay/profile windows with an exact source/tab/delivery barrier and exclude acknowledgements for publications posted outside the active profile.
- Require render acknowledgement to describe a completed, successful DOM update and add a terminal `render-failed` reason.
- Remove duplicated Chat/Skills child publication state, asynchronous-init flags, full-page mutation fallbacks, and surface-specific acknowledgement labels.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `assistant-workspace-publication-data-plane`: Tighten mutation, owner-lane delivery, Shell replay, child idempotence, and render-completion requirements.
- `assistant-workspace-ui-refresh-governance`: Require targeted transcript DOM effects and delivery-based child initialization across document generations.
- `acp-chat-performance-ui`: Require steady transcript rendering cost to remain independent of accumulated page and text size.
- `acp-chat-file-backed-transcript-state`: Require first-open page-first visibility without full-mirror or manual tab/session recovery.
- `acp-skill-run-file-backed-runtime-state`: Require the same transcript delivery and targeted rendering semantics as Chat.
- `acp-runtime-performance-profiler`: Attribute lifecycle labels from canonical publications and exclude out-of-window acknowledgements.
- `acp-runtime-replay-profiler`: Define exact target-active barriers, DOM-visible completion, and report provenance validation.

## Impact

The change affects the shared publication protocol/coordinator, Chat and Skills producer adapters, Assistant Workspace Shell, both child panels, the shared transcript receiver/renderer, replay/profiler production ports, and their existing conformance/UI tests. It does not change transcript stores, JSONL/index formats, external APIs, execution display mode, persistence cadence, or user configuration.
