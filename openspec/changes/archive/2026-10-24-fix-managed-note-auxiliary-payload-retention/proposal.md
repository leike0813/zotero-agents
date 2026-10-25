# Proposal

## Why

Updating a digest without new matching metadata leaves the existing metadata attachment behind but removes its HTML anchor. Collection export then fails with `managed note payload could not be transferred`, even though the auxiliary data is intact. The prior size-limit fix did not cover this lifecycle.

## What Changes

- Preserve omitted auxiliary payloads when replacing managed parent-set content.
- Allow private bundle transfer to retain a unique, valid auxiliary payload whose only defect is a missing anchor, without changing the source note.
- Keep public payload health reporting and rejection of corrupt, conflicting, or mismatched payloads.
- Add regression coverage for replacement and already affected notes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `managed-literature-artifacts`: auxiliary payload retention across managed updates and private bundle transfer.

## Impact

Plugin Broker/managed-note owner, existing literature bundle tests, and payload documentation. No workflow or Skill source changes, content package bump, new dependency, or library migration.
