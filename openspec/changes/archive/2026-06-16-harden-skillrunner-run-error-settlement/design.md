## Overview

The plugin needs a request-scoped terminal error path for SkillRunner runs that have already been created from the frontend point of view. A `requestId` is enough to show a user-facing task, but it is not enough to assume the backend accepted the run. Upload and follow-up endpoints can reject the run, and those failures must close the local observation chain instead of entering recoverable retry.

## Error Classification

SkillRunner HTTP errors SHALL expose structured status metadata:

- Terminal run-level client errors: `400`, `404`, `410`, `422`.
- Auth/config errors: `401`, `403`.
- Recoverable backend or transport errors: network failures, timeouts, `429`, and `5xx`.

The terminal run-level classification is applied only when the caller already has the request identity for a SkillRunner run. Create failures before `requestId` remains ordinary provider dispatch failure and must not open run UI.

## Request Readiness Boundary

For SkillRunner REST runs that require upload, `request-created` is an identity event only. The frontend MUST NOT start workspace observation, session sync, event history sync, or recoverable context reconcile from `request-created` alone. The provider SHALL emit `request-ready` only after the upload step succeeds; runs without an upload step can become ready immediately after create.

If upload fails before `request-ready`, the dispatch error path handles it directly and no observer loop should have been started for that request. This prevents the frontend from probing `/events/history` or `/v1/jobs/{requestId}` during the backend window where the request row exists but no run is bound yet.

## Settlement Model

Introduce one local settlement path for terminal missing/rejected SkillRunner runs. Given `backendId + requestId`, it SHALL:

- mark active task runtime projection as `failed`;
- write or update dashboard history as `failed`;
- write a terminal request-ledger snapshot when a ledger record exists;
- stop session sync for the request;
- leave visible task/history rows in place;
- avoid backend health failure marking.

Recoverable context removal remains owned by the reconciler or caller that holds the context map. The settlement helper should not import the reconciler to avoid circular ownership.

## Runtime Behavior

Provider/job queue recovery should distinguish local transport failure from backend-rejected request:

- If post-create upload/init/poll returns terminal run-level client error, mark the job as non-recoverable failed and run settlement.
- If post-create communication fails due to network/timeout/`5xx`, preserve the current recoverable pending path.
- Backend terminal `failed` or `canceled` state observed after request creation must not be coerced back to `running`.
- SkillRunner observer setup starts from `request-ready`, not from `request-created`; ACP SkillRunner-compatible runner request creation semantics remain unchanged.

Reconciler behavior changes from delete-on-404 to fail-and-preserve. Missing request IDs discovered during startup or local-runtime-up ledger reconcile should be visible in failed history and should not trigger backend-gated UI.

Run workspace/dialog actions should treat terminal run-level client errors as a stop condition for that request. Reply, cancel, auth import, event stream, chat stream, pending sync, and run polling should stop targeting the same request after settlement.

## Non-Goals

- Do not add frontend schema validation for input/output/parameter schema parity with the backend.
- Do not change SkillRunner backend protocol or endpoint paths.
- Do not change ACP SkillRunner-compatible runner recovery semantics.
- Do not fix backend crashes caused by repeated 404 requests.
