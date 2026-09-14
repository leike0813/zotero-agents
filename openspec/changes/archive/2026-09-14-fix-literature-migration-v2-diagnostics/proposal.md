## Why

Literature Artifact migration can retain a superseded attachment-backed v2 payload while writing its replacement, causing final verification to report an ambiguous managed note and roll the set back. After that replacement was fixed, successful native writes could still be reported as failed because receipt construction read either the erased attachment or its newly created replacement after Zotero unloaded the native item at transaction commit. A further real-library probe showed that Citation verification also inspected an unrelated historical Score note: the Score payload used the former four-field storage envelope, the canonicalization refactor rejected that envelope, and the unrelated read failure turned an already committed References/Citation set into a generic failed receipt. The durable mutation authority already retains the safe failure cause, but Dashboard history does not project it, leaving users with only generic phase and recovery tags.

## What Changes

- Remove a superseded v2 payload attachment inside the parent-set transaction while retaining only exact v1 migration attachments for post-verification cleanup.
- Capture immutable deletion evidence before erasing a superseded attachment so post-commit receipt construction never reads an unloaded Zotero item.
- Capture immutable creation evidence before leaving the native transaction so receipt construction does not depend on the newly created attachment remaining readable after commit.
- Preassign prepared embedded-image keys through the Zotero item storage slot that is valid before `save()` instead of assigning the getter-only public `key` property.
- Accept the exact historical four-field Literature Score storage envelope at the managed-note read boundary while keeping the canonical producer/import contract strict.
- Scope managed singleton discovery to the requested note kind so unrelated managed artifacts are not parsed as dependencies of References or Citation.
- Project the primary failed or attention-required set and its safe mutation-authority attempt into the selected migration run.
- Render an inline diagnostic card with cause, phases, recovery guidance, operation/attempt identity, and affected/residual counts.
- Keep the existing bounded diagnostic bundle and make clipboard failure visible.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `literature-artifact-migration`: Clarify replacement of pre-current v2 payloads, isolate non-target managed artifacts from migration verification, and require failed-run diagnostics to be visible inline from durable authority evidence.
- `managed-literature-artifacts`: Restore the historical Literature Score storage envelope at the internal read boundary and make singleton discovery kind-scoped.

## Impact

The change affects the Zotero Host Capability Broker parent-set writer, the Dashboard-local migration service and snapshot contract, migration history UI, localization, focused migration tests, and migration documentation. It adds no dependency, transport exposure, database table, or persistent schema migration.
