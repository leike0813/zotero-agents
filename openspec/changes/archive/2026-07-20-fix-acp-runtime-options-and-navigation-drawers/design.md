## Context

ACP runtime option state is currently assembled independently by Chat probing/session code and Skills run orchestration. The paths mix live ACP `configOptions`, legacy mode/model fields, cached backend capabilities, and stored run selections with different precedence. Model variants are also treated as reasoning options even when the backend exposes an independent `thought_level` selector. Separately, the shared drawer projector applies task lifecycle sections to Chat and retains catalog-only backend groups, while Chat backend switching can publish a backend-only active scope before a conversation exists.

The implementation must preserve Workspace wire DTOs, transcript storage, owner-navigation catalogs, plugin-runtime compatibility, and managed-region DOM identity constraints.

## Goals / Non-Goals

**Goals:**

- Make one TypeScript module the SSOT for ACP runtime option resolution and reasoning provenance.
- Preserve live independent reasoning choices and use cached/stored values only to fill missing live state.
- Keep Skills model/reasoning editability synchronized and update run/runtime state atomically after setters.
- Project source-specific drawer sections without empty backend groups and refresh only when visible drawer content changes.
- Switch Chat to an empty backend with a selected reusable local placeholder in one published owner transition.

**Non-Goals:**

- Changing Workspace wire schemas, action payload names, or persisted transcript/session formats.
- Connecting an ACP adapter or creating a remote session during backend selection.
- Making the cold full-mirror cache authoritative for transcript visibility.
- Adding backend- or provider-specific reasoning rules.

## Decisions

### Canonical runtime-state resolver

`acpSessionConfigOptions.ts` will own a resolver that accepts live configuration, cached capability state, and validated setter overrides. It resolves categories in a fixed order: explicit live `configOptions`; live legacy mode/model for missing categories; backend cache for still-missing categories; then successful setter values as immediate validated current overrides. Reasoning provenance records whether reasoning is explicit or derived from model variants, allowing model changes to recompute only model-derived reasoning.

This central resolver is preferred over synchronizing multiple local merge helpers because it makes category precedence and current-value validation testable once and reusable by Chat, probes, cache snapshots, and Skills.

### Capability and editability semantics

Reasoning is an independent runtime capability. A reasoning-only `configOptions` result is meaningful and must survive probing. Skills exposes model and reasoning with the same `modelConfigurationEditable` gate. When no reasoning capability exists, the UI retains a disabled Default placeholder but that placeholder is presentation-only and never overwrites real state.

### Source-aware drawer projection

Canonical owner navigation retains the complete backend catalog. A shared group-bucket helper builds only groups that receive visible cards. Chat emits one untitled `sessions` section and preserves conversation order; Skills emits active/completed sections and independently filters empty groups. Drawer stable signatures include all visible structural data, including title visibility and backend identity/label, but exclude catalog-only backends.

### Atomic placeholder-backed backend switch

Chat backend selection first resolves the final target conversation locally: keep a valid active conversation, otherwise reuse an existing empty unarchived placeholder, otherwise create one idle placeholder. Only after the target owner is complete are backend, conversation, index/frontend persistence, and active scope committed. The helper is shared with New Conversation preparation and performs no adapter/session start.

## Risks / Trade-offs

- [Cached state has shapes from older probes] → Normalize every source through the canonical parser and ignore invalid current values.
- [Setter and asynchronous refresh race] → Treat confirmed setter values as current overrides and update runtime/run snapshots together.
- [Drawer filtering could remove navigation choices] → Filter only the visible drawer DTO; keep the canonical backend catalog unchanged.
- [Placeholder reuse could select a non-empty session] → Reuse only an unarchived local conversation that has no remote session and no transcript activity.
- [Broad UI rerenders could regress transcript performance] → Keep drawer and other shared managed regions behind their own visible-content signatures and assert DOM identity in existing smoke tests.

## Migration Plan

No persisted-data migration is required. Existing backend caches and local conversations are normalized at read time. Rollback consists of reverting the implementation and delta artifacts; no storage rewrite occurs.

## Open Questions

None.
