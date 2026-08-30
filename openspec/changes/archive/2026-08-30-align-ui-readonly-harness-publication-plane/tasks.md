# Tasks

## 1. Tests first

- [x] 1.1 Rework the assistant section of `test/ui/156-ui-readonly-harness.test.ts` to drive the new readonly publication session against the existing SQLite fixtures: bootstrap carries the real action registry and per-tab surface labels; initialization publications are valid `child-publication` envelopes with correct owner invariants; fixture permission requests surface in permission region payloads; transcript publishes a ready tail-page snapshot; write-capable registry actions land on the mock-action log unexecuted; ACK and `load-transcript-page` round-trips work.
- [x] 1.2 Add boundary guardrails: `harness-host.js` no longer references `child-snapshot`; `scripts/ui-harness-serve.ts` routes assistant traffic through the publication session module.

## 2. Readonly publication session

- [x] 2.1 Add `src/modules/harness/assistantReadonlyPublication.ts`: one `AssistantWorkspacePublicationRuntime` + `AssistantWorkspacePublicationCoordinator` per tab source, fed by a harness-owned readonly adapter (selectedOwner / readOwnerNavigation / readOwnerRegions / readTranscriptPage) over the readonly plugin-state store, reusing exported production DTO helpers where available; write actions produce mock-action log entries only.
- [x] 2.2 Slim `src/modules/harness/assistantReadonlyModel.ts` to the readonly data access still needed by the adapter; remove the deprecated-plane view assembly (`activeSnapshot`/`frontendSnapshot`/`session`/`drawer` shapes and the `buildAcpSidebarViewSnapshot`/`buildSkillRunnerSidebarSections` call sites).

## 3. Server and host page

- [x] 3.1 Rework `scripts/ui-harness-serve.ts` assistant endpoints to a bootstrap endpoint (INIT payload + initial publications) and a message endpoint (ready / registry actions / ACKs / page requests); fix the `--check` synthesis field to a real `SynthesisRuntime` member.
- [x] 3.2 Add in-memory builds for `src/sidebar/assistantWorkspaceApp.js` and `src/sidebar/acpChildApp.js` with the plugin build's JSX/Preact options, served at `/content/sidebar/assistant-workspace.bundle.js` and `/content/sidebar/acp-child.bundle.js`.
- [x] 3.3 Rewrite the assistant section of `addon/content/harness/harness-host.js`: INIT with configuration/labels, `child-publication` delivery, ACK/action relay, removal of the old snapshot/drawer host state; re-enable `installLiveReload()`.

## 4. Docs and cleanup

- [x] 4.1 Rewrite `doc/components/ui-readonly-harness.md` to the current architecture (publication plane delivery, eleven locales, `npm run harness:ui` entry, bundle coverage, live reload, readonly write classification).
- [x] 4.2 Remove the dead `CHILD_SNAPSHOT` constant from `src/shared/assistantWireContract.ts` and sync `test/core/190-assistant-workspace-wire-drift.test.ts` parity assertions if they lock it.

## 5. Verification

- [x] 5.1 `npm run test:node:ui:harness` passes; `test/core/184`, `test/core/190`, `test/core/193` stay green; `npx tsc --noEmit` is clean; `tsx scripts/ui-harness-serve.ts --check` reports all components ready.
