## 1. Build Pipeline

- [x] 1.1 Migrate the seven sidebar scripts to `src/sidebar/*.js` as ES modules (IIFE removal, window互引→imports, window export tables→named exports) preserving all load-time side effects (acp-child auto-boot guard, runDialog startup).
- [x] 1.2 Add three esbuild entries (`acp-child.bundle.js`, `run-dialog.bundle.js`, `assistant-workspace.bundle.js`); update the four sidebar HTML pages; keep vendor libraries static ahead of the bundle tag.
- [x] 1.3 Add the ESLint `no-restricted-imports` boundary for `src/sidebar/**`; repoint `check-localization-governance.ts` paths and slice marker.
- [x] 1.4 Delete the seven legacy scripts from `addon/content/`; one-time Prettier normalization of the migrated files.

## 2. Contract Single Sources

- [x] 2.1 Add `src/shared/assistantWireContract.ts` (wire field lists, message types, bridge keys, out-of-band actions, run-dialog prefix/phase template); re-export from the publication module; delete the ACP child's duplicated tables.
- [x] 2.2 Replace message/bridge literals across `assistantWorkspaceSidebar.ts`, `skillRunnerRunDialog.ts`, and `src/sidebar/*`; unify `close-drawers` and `open-details-drawer`; remove dead `acp-skill-run:*`/`acp:*`.
- [x] 2.3 Add `src/shared/assistantActionContract.ts` with per-action payload types and compile-time registry drift guards; narrow sidebar envelopes and routers; annotate the five sender-less routes `TODO(contract)`.
- [x] 2.4 Add `src/shared/skillRunnerSnapshotContract.ts` with the v1 schema, layered known-key/required/type registries, and one shared validate implementation; stamp the schema at the producer, gate the receiver in `runDialog.js`, and add the `SKILLRUNNER_SNAPSHOT_WIRE_ASSERT_ENABLED` debug self-check.

## 3. Tests

- [x] 3.1 Migrate vm/new-Function load points (71/84/97/184/190) to in-process imports with save/restore global injection; update text assertions and localization governance.
- [x] 3.2 Reshape `test/core/190` into a shared-registry integrity smoke plus anti-hardcoding grep guard; add `test/core/191` for the snapshot boundary (four real shapes accepted, mutations rejected with field paths, producer self-check on/off).
- [x] 3.3 Point `test/core/71`'s curated consumption lists at the shared contract.

## 4. Specifications And Documentation

- [x] 4.1 Update `AGENTS.md` directory guidance, `doc/components/debug-mode.md` flag registry, and the refactor plan's Phase 1 notes.
- [x] 4.2 Land this OpenSpec change and pass strict validation.

## 5. Verification

- [x] 5.1 Focused suites green (65/71/83/84/94/95/97/107/184/190/191), tsc, ESLint, Prettier, localization governance, SSOT invariants, and `npm run build`.
- [x] 5.2 Run `npm run test:node:core` (2575 passing; one pre-existing, unrelated Host Bridge executable-bit failure in `test/core/139`) and the real-Zotero `test:lite` smoke (39 passed; verifies the three page bundles load in the host).
