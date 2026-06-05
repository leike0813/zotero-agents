## Design

The option is modeled as an ACP provider runtime option rather than a backend
profile flag. This lets workflows save a default or override it for a single
submission using the existing workflow settings plumbing.

The runner freezes `providerOptions.autoApproveAcpPermissions === true` at
submission/recovery time. Permission auto-approval is applied only inside ACP
Skill run `adapter.onPermissionRequest` handlers and only for
`source: "acp-tool-call"`.

Auto-approval chooses the safest compatible option:

1. Prefer `optionId === "approve"`.
2. Otherwise choose the first option whose `kind` is `allow`, `allow_once`, or
   `allow_always`.
3. Otherwise choose the first option whose `optionId` starts with `allow`.
4. If none match, keep the existing pending permission UI.

The runner still records the pending request through the run store before
resolving it, so transcript projection and audit history continue to use the
same permission item lifecycle.

The warning presentation is a small schema-level UI hint implemented for this
option only. The checkbox remains a normal checkbox; only the display text is
bold red.
