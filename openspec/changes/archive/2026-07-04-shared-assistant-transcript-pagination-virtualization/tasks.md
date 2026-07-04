## 1. OpenSpec

- [x] Add shared transcript virtualization requirements.
- [x] Add ACP Skills request-scoped page delegation requirements.

## 2. Shared Renderer

- [x] Add renderer-owned virtual page state keyed by transcript container.
- [x] Add virtualized render options for page input and page requests.
- [x] Move virtual window, spacer, scroll anchoring, stickiness, and page request
      dedupe into `AssistantTranscriptRenderer`.

## 3. ACP Skills Integration

- [x] Remove ACP Skills private transcript page cache, virtual window, spacers,
      and scroll handler.
- [x] Pass selected transcript pages to the shared virtualized renderer.
- [x] Ignore stale `load-transcript-page` requests for non-selected runs.

## 4. Tests and Validation

- [x] Cover shared virtualized transcript rendering and scroll behavior.
- [x] Cover ACP Skills source integration and stale page guards.
- [x] Run OpenSpec validation, focused tests, and TypeScript.
