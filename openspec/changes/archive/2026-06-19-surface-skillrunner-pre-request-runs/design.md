# Design

## Local Identity

SkillRunner records use a stable local identity for the frontend run lifecycle.
New dispatches use `localRunId` and store key `local:<localRunId>`. The backend
`requestId` is optional until create succeeds and then becomes a binding field
and lookup index.

Old records keyed by `backendId:requestId` remain readable. New records do not
change key after `requestId` is assigned, avoiding duplicate rows.

## Lifecycle

Local SkillRunner lifecycle states include:

- `pre_request_id`: local queued/created before provider dispatch starts.
- `request_creating`: provider is creating the backend job.
- `uploading`: backend request exists and skill payload is uploading.
- `request_ready`: upload succeeded and reconciler owns backend observation.
- normal backend states: `queued`, `running`, `waiting_user`,
  `waiting_auth`, `succeeded`, `failed`, `canceled`.

`pre_request_id`, `request_creating`, `uploading`, and `request_ready` project
as active task rows. Failed create/upload projects as `failed` with submit audit
metadata.

## UI Capability Split

`selectable` means the row can be selected and shown in the SkillRunner panel.
It does not imply backend interaction. Backend calls require:

- `requestAssigned=true`
- `backendInteractive=true`
- operation-specific flags such as `canOpenStream`, `canCancelBackendRun`,
  `canReply`

Pre-ready selected tasks keep the same banner layout as post-ready tasks.
Request id is not shown in the banner. Pre-ready status appears as sparse system
messages in the conversation/event area.

## Failure and Audit

Create/upload failures and timeouts update the same local record to failed and
write structured runtime logs. If the underlying fetch settles after timeout,
the late settlement is diagnostic only and must not create a second run.
