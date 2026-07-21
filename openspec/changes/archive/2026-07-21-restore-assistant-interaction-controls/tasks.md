## 1. Contract and Regression Coverage

- [x] 1.1 Add failing shared-contract and panel-model tests for all four interaction kinds, JSON option values, exact-key/size limits, canonical actions, and stale tokens.
- [x] 1.2 Add failing ACP publication/UI tests for `ui_hints`, transcript-only pending messages, interaction rendering, and managed-region DOM identity.
- [x] 1.3 Add failing SkillRunner quick-reply and capability-gated file-reply tests, including multipart metadata, limits, and unsupported fallback.
- [x] 1.4 Add failing ACP file-picker/staging tests for cancellation, duplicate clicks, owner/token races, collisions, shallow paths, copy failure, privacy, and recovery.

## 2. Shared Interaction Projection and UI

- [x] 2.1 Implement the bounded `AssistantPendingInteraction` contract and wire it into Assistant/SkillRunner snapshot validation.
- [x] 2.2 Project ACP and SkillRunner waiting-user state into the shared DTO while preserving structured option values and interaction tokens.
- [x] 2.3 Generate canonical interaction actions in the panel model, remove renderer hard-coding and the incorrect alias SSOT, and validate owner/status/token at host boundaries.
- [x] 2.4 Add localized labels and region-scoped rendering/styles for text, options, confirmation, file slots, limits, and unsupported state.

## 3. ACP File Replies

- [x] 3.1 Implement native sequential file selection with required/optional cancellation and one in-flight flow per owner/token.
- [x] 3.2 Implement atomic shallow `.acp-inputs` staging, collision-safe managed names, bounded paths, and a privacy-safe manifest.
- [x] 3.3 Split continuation display/prompt messages and submit staged workspace-relative paths through the existing live/recovery state machine.
- [x] 3.4 Add and wire the ACP interaction-file runtime prompt template without exposing source paths or file bytes.

## 4. SkillRunner File-Reply Pre-wiring

- [x] 4.1 Add handshake parsing for `skillrunner.interaction-files.v1` and effective upload limits with unsupported-by-default behavior.
- [x] 4.2 Implement the management client multipart `submitInteractionFiles` request and host picker bridge with idempotency metadata.
- [x] 4.3 Ensure snapshots, child actions, logs, and transcript expose file declarations/display names only and never paths or bytes.

## 5. Validation and Documentation

- [x] 5.1 Update Assistant Workspace/ACP/SkillRunner documentation for interaction ownership, privacy, capability fallback, and render isolation.
- [x] 5.2 Run focused tests 61/65/71/97/107/184/190/191, TypeScript, target lint/Prettier, localization governance, and strict OpenSpec validation.
