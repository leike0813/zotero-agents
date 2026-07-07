## 1. Contract And Guardrails

- [x] 1.1 Add the Assistant Workspace transcript/chrome decoupling hard rule to project-level `AGENTS.md`.
- [x] 1.2 Add source-level tests that reject transcript/event/page signals in the ACP Skills whole-panel render key.

## 2. Renderer Decoupling

- [x] 2.1 Add shared renderer region signature guards for details and context drawer managed regions.
- [x] 2.2 Split ACP Skills panel render gating so transcript revisions, transcript pages, selected events, and log tail churn do not force chrome/details render.

## 3. Behavior Tests

- [x] 3.1 Add fake-DOM tests proving ACP Skills transcript-only snapshots preserve details drawer and Runner section node identity.
- [x] 3.2 Add shared renderer tests proving unchanged details signatures skip drawer rebuild while changed details refresh.

## 4. Validation

- [x] 4.1 Run focused Assistant Workspace UI smoke tests for transcript/details/panel render behavior.
- [x] 4.2 Run the full `test/core/97-acp-ui-smoke.test.ts` file.
- [x] 4.3 Run `openspec validate harden-assistant-transcript-render-decoupling --strict`.

## 5. Global Managed Region Hardening

- [x] 5.1 Extend `AGENTS.md` and the delta spec with global loading/signature invariants for all Assistant Workspace panels.
- [x] 5.2 Add shared renderer tests for reply, permission, workspace drawer, and all non-transcript managed region identity across transcript-only snapshots.
- [x] 5.3 Add region-level guards for reply, permission drawer, and workspace task drawer in the shared assistant panel renderer.

## 6. Transcript Loading Isolation

- [x] 6.1 Add ACP Chat and ACP Skills fake-DOM tests proving repeated same-owner loading snapshots preserve spinner DOM identity while cross-owner loading clears stale content.
- [x] 6.2 Implement owner-scoped transcript loading signatures in ACP Chat and ACP Skills child panels.

## 7. Host Snapshot Signature Isolation

- [x] 7.1 Add source-level tests proving ACP Skills host snapshot signature canonicalizes non-selected transcript-only summary fields while selected transcript is loading.
- [x] 7.2 Implement ACP Skills host snapshot signature canonicalization without changing hydrate/store contracts.

## 8. Revalidation

- [x] 8.1 Run focused Assistant Workspace UI smoke tests for transcript/loading/spinner/reply/permission/drawer behavior.
- [x] 8.2 Run the full `test/core/97-acp-ui-smoke.test.ts` file.
- [x] 8.3 Run `openspec validate harden-assistant-transcript-render-decoupling --strict`.
