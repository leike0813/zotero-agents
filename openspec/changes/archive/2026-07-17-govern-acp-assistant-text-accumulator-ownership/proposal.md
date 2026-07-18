## Why

ACP execution progress currently retains assistant text as an unbounded terminal candidate even when the caller already owns the business text. ACP Skills therefore retains every assistant chunk twice, while ACP Chat depends on this unrelated progress state for silent terminal projection. The mixed ownership increases peak memory and makes a counting module responsible for business content.

## What Changes

- Restrict shared ACP execution progress to message counts and semantic segment state; remove assistant text from its state, snapshots, and API.
- Give ACP Chat an owner-scoped, prompt-lifetime in-memory collector for the final assistant segment used only by silent terminal projection.
- Preserve the existing ACP Skills prompt-local accumulator as the sole assistant-text source for validation, repair, recovery, and output convergence.
- Preserve all transcript persistence formats and live, boundary, silent, success, error, cancellation, and recovery semantics.
- Exclude output limits, truncation, new failure types, and profiler policy changes from this change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `acp-chat-file-backed-transcript-state`: Make the silent terminal assistant collector explicitly Chat-owned and prompt-local while preserving terminal-only persistence and mode-transition behavior.
- `acp-skill-run-file-backed-runtime-state`: Require exactly one prompt-local assistant-text accumulator for ACP Skills output convergence and prohibit shared execution progress from retaining duplicate text.

## Impact

The change affects ACP execution progress state, ACP Chat session runtime projection, ACP Skills progress cleanup, and focused tests. It does not change external APIs, persisted schemas, transcript JSONL/index formats, backend protocol behavior, dependencies, or user-visible output.
