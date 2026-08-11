## Context

ACP Chat and ACP Skills use the same Host Bridge plugin Skill bundle identity only as a recovery gate. The XPI materializer and plugin Skill registry also consume the manifest identity for package validation and catalog metadata; those uses remain independent.

## Goals / Non-Goals

**Goals:**

- Allow ACP Chat and ACP Skills to recover according to existing remote-session and run-reconstruction rules regardless of bundle identity.
- Remove the recovery-only data flow so missing or stale persisted metadata cannot create a synthetic recovery failure.

**Non-Goals:**

- Changing XPI bundle integrity validation, package materialization, or registry source selection.
- Adding a replacement bundle-version compatibility policy.

## Decisions

- Remove the identity gate from both ACP recovery paths, rather than treating missing identity as compatible. The selected policy permits recovery even when identities differ, so retaining storage and comparison code would be dead state.
- Retain the manifest identity type and registry metadata. They identify validated packaged content and are not session-compatibility controls.
- Ignore legacy persisted identity properties through normal permissive record parsing. No migration is required because the properties are optional metadata.

## Risks / Trade-offs

- [A backend cannot resume a session after its effective tools change] → The backend resume/load operation reports its native failure; ACP preserves its existing fallback and diagnostics behavior.
- [Legacy identity fields remain on disk] → They are ignored and disappear on the next normal persistence write.
