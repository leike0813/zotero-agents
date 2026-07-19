## 1. ACP Chat Region Publication

- [x] 1.1 Make implicit critical ACP Chat changes publish transcript boundary, permission, and lifecycle status additively when applicable.
- [x] 1.2 Route lifecycle status to independently guarded owner-control and composer regions while preserving transcript-only streaming updates.

## 2. Shared Transcript Convergence

- [x] 2.1 Keep virtual scheduler state live-only and schedule measured-height reconciliation after successful steady-mutation commit.
- [x] 2.2 Add generation-scoped virtual reconcile cancellation so stale owner callbacks cannot clear newer work.
- [x] 2.3 Coalesce bottom-stick animation work per transcript container while preserving tail-follow and user scroll-away anchors.

## 3. Regression Coverage and Validation

- [x] 3.1 Cover ACP Chat cancellation followed by continuation and verify immediate busy composer publication.
- [x] 3.2 Cover ACP Skills accepted replies and verify the existing run publication keeps the composer busy.
- [x] 3.3 Cover asynchronous terminal Markdown rendering, consecutive tall-row measurements, stable row identity, anchor preservation, and bounded bottom-stick scheduling.
- [x] 3.4 Run the three related core/UI test files, TypeScript checking, targeted ESLint, Prettier checking, and diff validation.
