## 1. Semantic Source

- [x] Add `zotero-workflow-agent-runner` profile skill.
- [x] Add workflow execution policy, common task, and agent-run playbook references.
- [x] Update Zotero Librarian SOUL, skill routing, and operating principles.

## 2. Renderer and Profile Governance

- [x] Extend the profile renderer for multiple semantic skill/reference copies.
- [x] Add profile config and cron entries for workflow and notification services.
- [x] Extend profile checks for new files, non-blocking scripts, and current-state-only guidance.

## 3. Scripts

- [x] Add workflow service commands for parent-selection, readiness-plan, plan, and submit.
- [x] Add notification service commands for sync, inbox, summary, and ack.
- [x] Keep stdout stable and avoid long-polling behavior.

## 4. Tests

- [x] Extend profile distribution tests.
- [x] Add script fixture tests with a fake `zotero-bridge`.
- [x] Run render, profile/doc checks, focused tests, TypeScript, and OpenSpec validation.
