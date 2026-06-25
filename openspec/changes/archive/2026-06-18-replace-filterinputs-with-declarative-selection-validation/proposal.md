# replace-filterinputs-with-declarative-selection-validation

## Problem

Workflow menu availability currently depends on executing request-building
paths. Historically `filterInputs` and `buildRequest` were also used as
preflight signals, which makes menu rendering slow and lets preflight produce
execution-time side effects.

## Goals

- Replace hook-based input filtering with manifest-level `validateSelection`.
- Keep `buildRequest` exclusively on the real execution path.
- Preserve precise workflow disabled states without executing workflow hooks.
- Make selection validation consumable by runtime, menu, debug probe, and Host
  Bridge summaries.

## Non-Goals

- No backward compatibility for `hooks.filterInputs`.
- No arbitrary JavaScript expressions inside the selection validation DSL.
- No backend protocol changes.
