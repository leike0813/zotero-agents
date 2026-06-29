## Context

ACP permission request handling currently has one storage path: register a live
resolver, write `pendingPermission`, emit a `permission-requested` event, and
later resolve the request. Auto-approval calls that same path first and then
resolves the request. Because `upsertAcpSkillRun` emits synchronously, sidebar
listeners can see the short-lived pending state and show a waiting toast.

## Goals / Non-Goals

**Goals:**

- Prevent auto-approved ACP tool-call permission requests from publishing
  `pendingPermission`.
- Keep permission-requested and permission-resolved transcript audit entries for
  auto-approved requests.
- Leave manual permission requests unchanged.

**Non-Goals:**

- Do not change the set of options eligible for auto-approval.
- Do not suppress toasts for permission requests that still require user action.
- Do not alter ACP session-manager permission behavior outside ACP
  SkillRunner-compatible runs.

## Decisions

1. Add a store-level auto-approval recording function.

   The store already owns permission audit projection, resolver registration,
   pending state, workflow task sync, and snapshot emission. A dedicated
   auto-approval function can reuse the same event schema while intentionally
   skipping resolver registration and `pendingPermission`.

2. Select auto-approval before calling the pending path.

   The orchestrator should resolve eligible ACP tool-call requests through the
   new store function and return. Only requests that are not auto-approvable
   should call `setAcpSkillRunPermissionRequest`.

## Risks / Trade-offs

- Auto-approved requests will still emit store updates for audit events, but
  those snapshots will show the run as running rather than waiting for user
  action.
- If the backend resolver throws, the auto-approval path will not record a
  successful permission audit entry. This matches the existing manual resolver
  behavior, which records resolution only after resolver invocation succeeds.
