## Why

Host Bridge notification reads are currently coupled to workflow, task, and skill-run projection, so a lightweight inbox call can trigger heavy host-side scanning. Short toast ownership is also distributed across workflow, backend, runtime, sidebar, and settings surfaces, which allows multiple owners to show near-identical toasts for the same user-visible lifecycle transition.

## What Changes

- Introduce a bounded in-memory Notification Hub as the single short-notification event queue.
- Route short workflow toasts through the Hub before visible toast delivery.
- Add Hub-level display-group suppression so different owners cannot show duplicate UI toasts for the same user-visible transition inside a short window.
- Make Host Bridge notification list and wait read only from the Hub queue.
- Add optional Host Bridge notification client cursors via `clientId`; stateless `sinceEventId` remains supported.
- Keep progress toasts out of the Hub for this change.
- Disable the unused SkillRunner task lifecycle toast emitter to avoid a future second owner.

## Capabilities

### New Capabilities

- `notification-hub`: bounded in-memory queue, toast sink governance, duplicate suppression, and per-client cursors.

### Modified Capabilities

- `host-bridge-workflow-control`: notification inbox reads come from the Hub and do not scan workflow/task/history state.
- `host-bridge-cli-interface`: notification list, wait, and ack commands accept `--client-id`.
- `workflow-execution-notifications`: short workflow feedback emits through the Hub, and toast visibility suppression does not remove lifecycle observability.

## Impact

- Source modules: notification Hub, workflow feedback seam, Host Bridge notification inbox/control/server, short-toast call sites, and SkillRunner reconciler toast hooks.
- CLI: Rust notification arguments and query/body construction.
- Tests: focused core Host Bridge, toast seam, reconciler/sidebar, and CLI packaging tests.
- No dependency, persistence, timer, or schema migration is introduced.
