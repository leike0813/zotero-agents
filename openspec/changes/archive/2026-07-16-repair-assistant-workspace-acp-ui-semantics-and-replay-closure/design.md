## Context

The shared ACP child is the correct architecture, but v5 encoded unrelated
presentation concepts as generic label/value arrays and did not define action
scope. The child consequently flattened presentation fields into LEDs and
discarded clicked owner identities. The renderer also mutates virtual
transcript state before rendering has succeeded, while Replay profiles lack an
epoch separating prior surface work from the current run.

The early shared panel behavior at commit `86e5e0f2` is the visual and semantic
reference. Its source-specific child and snapshot projectors are not restored.

## Decisions

### 1. Strict v6 presentation semantics

The publication schema moves atomically to v6. `owner-presentation` contains
title, subtitle, description, a typed notice, semantic metadata fields, numeric
usage, and semantic detail sections. It does not contain labels, tasks,
diagnostic actions, or generic banner arrays. Drawer entries come only from
owner navigation; service LEDs come only from service status.

Semantic presentation field and section identifiers are defined by one
registry. The exact browser projector obtains all visible labels from the Host
label DTO.

### 2. One action routing registry

Every ACP action has one scope:

- `local`: child-only UI state.
- `target-owner`: the clicked owner is the envelope owner.
- `selected-owner`: the current canonical owner is the envelope owner.
- `navigation-group`: owner is null and payload is exactly `{ groupId }`.
- `global`: owner is null and payload contains only the action's exact fields.

The child and Host validate against the same registry. Owner identity is never
duplicated in action payloads.

### 3. Restore semantics without restoring snapshots

The shared projector restores the usage gauge, independent status axes,
complete task/session drawer cards, and localized panel labels. Skills drawer
main state is produced by `resolveAcpSkillRunWorkflowTaskState`; selected run
lifecycle remains in owner control. Missing backend/apply values are hidden
instead of falling back to run status.

The main conversation/reply grid remains mounted for no-owner, loading, ready,
and owner-switch states. Empty selection is a conversation-region state rather
than a replacement for the whole panel.

### 4. Transactional transcript rendering

Transcript delta application computes and validates the next page and DOM plan
before committing renderer virtual state, node maps, signatures, or canonical
child state. Failure leaves the previous committed renderer state retryable.
Bounded failure stage/code and render path are retained in ACK and lifecycle
records.

### 5. Replay publication epochs

Replay preparation first drains both ACP lanes, aligns the active child
generation, then captures a per-source delivery-sequence watermark. Profile
evidence includes only current-run publications after that watermark. A late
pre-epoch publication that crosses into the profile window marks measurement
incomplete rather than being ignored.

## Migration

v5 publications and the old action payload shapes are rejected. The Host,
runtime, both children, tests, profiler, and Replay move to v6 together. No
decoder, alias, or dual-write compatibility is retained.

## Risks

- A broad visual rollback could restore old state machines. Tests therefore
  assert the shared child/runtime and region-level DOM identities.
- Renderer recovery could hide steady-state defects. Formal Replay rejects
  `recovery-full`, automatic rebase, or rejected render terminal outcomes.
- Epoch filtering could hide genuine failures. Only pre-profile drained work is
  excluded; work arriving after profile start remains structured
  incompleteness.

## Open Questions

None.
