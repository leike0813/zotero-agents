# Tasks

## 1. Private transfer

- [x] 1.1 Capture bounded private transfer facts, recover unique valid main/auxiliary anchors without source mutation, and verify existing literature transfer regressions first fail then pass.
- [x] 1.2 Retain invalid payload raw material separately and document the transfer contract in note-payload-codec.md; verify healthy main data survives auxiliary damage.

## 2. Partial materialization

- [x] 2.1 Add opt-in failure policy and source-only note exclusion; verify good-bad-good identity/progress and strict defaults in the shared materializer tests.
- [x] 2.2 Isolate note/image/paper resources, propagate fatal errors, and verify local cleanup preserves successful resources while task cancellation cleans all.

## 3. Export packages

- [x] 3.1 Package report and recovery files with integrity metadata, preserve identity matching, prevent empty export, and verify literature/research builder regressions.
- [x] 3.2 Expose partial outcomes and report location through existing completion diagnostics; update export help and managed-artifact specification and verify outcome/report consistency.

## 4. Integration

- [x] 4.1 Run relevant Node tests, type/lint checks and OpenSpec validation; record commands and outcomes.
- [x] 4.2 Run governed build preflight/current-branch content check and build candidate only when inputs are fresh; record plugin/content identities and any blocking release evidence.
- [x] 4.3 Run existing isolated Zotero note-image and mixed export/re-import acceptance with current-source sidecar; record evidence and any environment blockers.

构建及实机验收由内容包 freshness 阻塞，保留未勾选。检查结果及恢复前提见 [verification.md](verification.md)。
