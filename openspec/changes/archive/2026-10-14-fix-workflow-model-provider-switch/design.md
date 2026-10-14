# Design

## Context

See proposal.md for the regression. Both current workflow surfaces use the shared settings descriptor and Preact field engine. ACP runtime normalization intentionally excludes the UI-only provider filter; SkillRunner accepts explicit providers but can restore a prefix from an incompatible old model.

## Goals / Non-Goals

Keep displayed selections, model catalogs, saved drafts and confirmed values consistent. Do not change public wire fields, persistence formats, ACP raw model/reasoning semantics, or the unused native settings entry.

## Decisions

- Preserve the source ACP provider at the UI projection boundary, and generate schema enums from that UI projection. Keeping it in runtime normalization would leak UI state into execution.
- Put explicit provider-change handling in one synchronous shared settings function consumed by both host actions. Reuse provider catalog enums and their order; set only the model on a recognized choice event. With no target model, retain the unavailable value for validation.
- Keep valid explicit SkillRunner providers authoritative during normalization. Model prefixes remain a source only when no valid explicit provider exists.
- Require model catalog membership for provider-scoped SkillRunner engines, including empty target model lists; single-provider engine provider identifiers keep their existing validation semantics.
- Preserve unmatched ACP values in the shared field component, without changing generic select defaults. User-driven first-model selection belongs to host action handling, not component mounting.
- Capture submit draft identity before asynchronous descriptor construction and commit only if it is still current. Use existing immutable draft replacement rather than a new queue or wire revision field.
- When confirmation overtakes the provider echo, replace only its unchanged pre-switch model with the model selected by that explicit switch; retain payload text/Host fields and clear this pairing on a subsequent explicit model choice. The page consumes acknowledged paired model values even when two providers have identical schemas.

## Risks / Trade-offs

- Generic selects retain their existing defaults; ACP controls require focused unset/unavailable coverage in both presentations.
- Stale descriptor errors must also be ignored after a newer draft replaces their owner; current-draft errors retain existing failure handling.
- Ordinary refresh does not repair persisted invalid selections. Validation remains authoritative and explicitly rejects them.

## Migration Plan

No migration. Existing settings are read as-is. Verification uses Node contract and DOM tests, type checks, and lint/format checks; XPI build and real Zotero acceptance are outside the approved validation scope.
