## Why

ACP SkillRunner-compatible runs can auto-approve ACP backend tool-call
permission requests when `autoApproveAcpPermissions` is enabled. The current
handler records the request as pending before immediately resolving it, so
workspace listeners can observe a transient user-action state and show a toast
even though no interaction is required.

## What Changes

- Resolve auto-approved ACP tool-call permission requests without publishing
  `pendingPermission`.
- Preserve the existing permission audit transcript for auto-approved requests.
- Keep non-auto-approvable and non-ACP-tool-call permission requests on the
  existing manual pending-permission path.
- Add focused regression coverage for the no-pending auto-approval path.

## Capabilities

### Modified Capabilities

- `acp-skillrunner-compatible-runner`: Auto-approved ACP tool permissions must
  not enter a user-action pending state or trigger waiting-user permission
  notifications.

## Impact

- Affected code: ACP SkillRunner permission handling and ACP skill run store
  audit recording.
- Affected tests: ACP SkillRunner-compatible runner permission regression tests.
- Affected docs/specs: OpenSpec delta spec for ACP SkillRunner-compatible
  permission auto-approval behavior.
