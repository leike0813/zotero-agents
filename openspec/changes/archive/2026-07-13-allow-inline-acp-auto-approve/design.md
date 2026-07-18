## Context

ACP already declares `autoApproveAcpPermissions` in its runtime-option schema, and the CLI already forwards inline provider-profile JSON. Host Bridge rejects this one field during generic provider-profile safety scanning even though the ACP runtime knows how to normalize and safely consume it. Workflow submit intentionally ignores saved UI workflow settings.

## Goals / Non-Goals

**Goals:**

- Permit the existing inline request payload to carry the ACP option.
- Preserve the generic protection against credentials, endpoints, and local paths.
- Give CLI and profile agents one unambiguous vocabulary for provider, backend, and provider profile.

**Non-Goals:**

- Persisting, listing, selecting, or managing provider profiles in Host Bridge.
- Changing workflow submit approval, direct run-permission actions, ACP Chat behavior, or Zotero write approval.
- Exposing `autoApproveZoteroWrites` through the provider-profile contract.

## Decisions

- Remove only the exact normalized `autoapproveacppermissions` rejection from the generic safety filter. The existing provider registry remains the sole authority for provider-option normalization: ACP retains the boolean and other providers do not gain ACP permission behavior.
- Keep the request shape and CLI flags unchanged. `--provider-profile` remains external-agent-owned JSON; a backend is selected by `backendId` and provider-specific runtime options are supplied in `providerOptions`.
- Keep saved UI workflow defaults isolated. The Host Bridge execution override is per request and has `ignoreSavedWorkflowSettings` enabled, so no preference migration or new storage contract is needed.
- Update only semantic sources, then render generated skills, profile content, and CLI documentation. The guidance retains the prohibition on directly approving or rejecting pending permissions; the ACP option is a run-start policy, not a direct permission command.

## Risks / Trade-offs

- [An agent may confuse ACP permission automation with Zotero writes] → Define the two options separately and state that this change does not affect `autoApproveZoteroWrites`.
- [A broad relaxation could admit sensitive backend configuration] → Keep all existing recursive key and value safety checks and add a focused regression.
- [Documentation drift across generated surfaces] → Render from semantic sources and run the Host Bridge/profile synchronization checks.

## Migration Plan

No migration is required. Existing provider-profile payloads and saved workflow settings retain their behavior; omitting the new option continues to leave auto-approval disabled.

## Open Questions

None.
