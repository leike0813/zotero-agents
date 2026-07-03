## 1. Contracts

- [x] 1.1 Update contracts to remove shell init ack/retry and require
  host-driven state pulse publication.
- [x] 1.2 Add focused coverage for first-open state pulse publication across
  ACP Chat, ACP Skills, and SkillRunner.

## 2. Runtime

- [x] 2.1 Remove tokened shell init sync, ack handling, and retry state.
- [x] 2.2 Resolve the current shell window for posting, source validation,
  bridge installation, and SkillRunner sidebar attachment.
- [x] 2.3 Publish active-tab snapshots from a unified state pulse and keep
  hidden tabs from triggering host refresh work.
- [x] 2.4 Remove SkillRunner's attach-time implicit init and double-prefix ready
  fallback; rely on explicit host snapshots plus shell cache/replay.

## 3. Verification

- [x] 3.1 Validate the OpenSpec change.
- [x] 3.2 Run the focused runtime/UI tests, TypeScript, ESLint, and build.

## 4. First-Open Prewarm Fix

- [x] 4.1 Update contracts to reject startup shell prewarm and require
  child-ready cache replay.
- [x] 4.2 Keep shell creation lazy until sidebar target activation.
- [x] 4.3 Publish only the active tab's real snapshot when the sidebar is
  opened; publish SkillRunner only when its tab is active.
- [x] 4.4 Replay cached child payloads whenever a child reports ready.
- [x] 4.5 Re-run OpenSpec validation, focused tests, TypeScript, ESLint, and
  build.
- [x] 4.6 Treat shell loaded/ready as pulse triggers, not as a hard publication
  gate, so later store snapshots can recover missed startup ready events.
- [x] 4.7 Make child ready edge-triggered and remove repeated ready
  announcements from host init.
- [x] 4.8 Ignore hidden SkillRunner child ready and detach SkillRunner sidebar
  host when leaving the SkillRunner tab.
- [x] 4.9 Ignore all hidden child ready events at the host layer and remove
  high-frequency shell snapshot trace entries.

## 5. Rollback of Second-Pass Load Reduction Cleanup

- [x] 5.1 Restore child ready forwarding for all child frames instead of making
  hidden child ready shell-local.
- [x] 5.2 Restore raw SkillRunner sidebar init/snapshot shell handling while
  keeping the local empty SkillRunner fallback removed.
- [x] 5.3 Remove the extra `bridgeWindow` shell state introduced during the
  failed cleanup attempt.
- [x] 5.4 Restore ACP Chat backend refresh on ACP Chat snapshot publication.
- [x] 5.5 Update focused tests and OpenSpec contracts to match the restored
  pre-cleanup lifecycle.
