## 1. OpenSpec

- [x] Add spacer scroll preservation requirements to `assistant-sidebar-ui`.

## 2. Shared Renderer

- [x] Distinguish row anchors from unloaded spacer anchors.
- [x] Restore spacer anchors by preserving raw `scrollTop`.
- [x] Prevent old row anchors from clamping a current spacer scroll.

## 3. Tests and Validation

- [x] Cover top spacer scroll preservation and page request dedupe.
- [x] Cover bottom spacer scroll preservation and page request dedupe.
- [x] Run focused smoke tests, TypeScript, ESLint, and OpenSpec validation.
