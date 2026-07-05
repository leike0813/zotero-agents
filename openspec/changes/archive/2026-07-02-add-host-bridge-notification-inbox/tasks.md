## 1. Spec

- [x] 1.1 Add OpenSpec deltas for Host Bridge workflow control and CLI
  notification inbox commands.
- [x] 1.2 Validate the change with strict OpenSpec validation.

## 2. Host Bridge API

- [x] 2.1 Add a bounded Host Bridge notification inbox module.
- [x] 2.2 Project workflow/task/skill-run runtime state into lightweight
  notification events.
- [x] 2.3 Add `GET /bridge/v1/notifications`.
- [x] 2.4 Add `POST /bridge/v1/notifications/ack`.
- [x] 2.5 Ensure events exclude transcripts, workspace paths, full error text,
  provider-private payloads, tokens, and raw request/response bodies.

## 3. CLI

- [x] 3.1 Add `run notification list`.
- [x] 3.2 Add `run notification wait` using short polling.
- [x] 3.3 Add `run notification ack`.
- [x] 3.4 Add CLI parser/path/body/timeout tests.

## 4. Surface and Profile

- [x] 4.1 Update Host Bridge surface catalog mappings.
- [x] 4.2 Run semantic surface review and update wrapper/profile semantic
  sources if needed.
- [x] 4.3 Render Host Bridge surfaces.

## 5. Verification

- [x] 5.1 Run focused Host Bridge notification/API tests.
- [x] 5.2 Run Rust CLI tests.
- [x] 5.3 Run `npm run check:host-bridge-doc-sync`.
- [x] 5.4 Run `npm run check:zotero-librarian-profile`.
- [x] 5.5 Run focused Host Bridge CLI packaging tests.
