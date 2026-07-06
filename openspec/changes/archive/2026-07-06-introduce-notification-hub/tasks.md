## 1. OpenSpec

- [x] 1.1 Add proposal, design, and delta specs for Notification Hub and notification inbox behavior.
- [x] 1.2 Validate the change in strict mode.

## 2. Hub And Toast Governance

- [x] 2.1 Implement bounded in-memory Notification Hub with FIFO retention, display-group suppression, suppressed filtering, per-client cursors, and ack metadata.
- [x] 2.2 Route `showWorkflowToast` and `alertWindow` through the Hub while leaving progress toasts unchanged.
- [x] 2.3 Add owner/display-group metadata to high-risk short-toast call sites.
- [x] 2.4 Disable the unused SkillRunner task lifecycle toast emitter.

## 3. Host Bridge And CLI

- [x] 3.1 Make Host Bridge notification list/wait read the Hub queue without task/workflow/history projection.
- [x] 3.2 Add optional `clientId` handling to list and ack requests.
- [x] 3.3 Add `--client-id` to CLI notification list, wait, and ack commands.

## 4. Tests And Validation

- [x] 4.1 Add or update Hub, toast seam, Host Bridge, and CLI tests.
- [x] 4.2 Run focused core tests and `npx tsc --noEmit`.
