## 1. OpenSpec

- [x] Add ACP Skills panel recent-run index requirement.

## 2. Store Read Model

- [x] Add an in-memory recent visible run index.
- [x] Keep the public summary API unchanged.
- [x] Route ACP Skills panel snapshots through the bounded recent index.
- [x] Eliminate duplicate list work in panel snapshot preparation.

## 3. Drawer Notice Rendering

- [x] Render `drawers.notice` at drawer level after section rendering.
- [x] Remove running-section coupling from notice rendering.

## 4. Tests and Validation

- [x] Add governance coverage for bounded panel reads and selected old runs.
- [x] Add renderer coverage for notice display without a running section.
- [x] Run OpenSpec validation, focused tests, and TypeScript.
