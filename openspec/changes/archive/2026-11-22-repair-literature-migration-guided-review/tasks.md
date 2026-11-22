# Tasks

## 1. Write failure

- [x] 1.1 Reproduce the dev-profile failure on isolated data and capture its original stage.
- [x] 1.2 Repair the failing boundary, preserve safe stage diagnostics, and verify a real parent-set transaction and its canonical readback.

## 2. Guided review and progress

- [x] 2.1 Project whole-plan selection counts and pending reasons. Verify filtered and paged views and preserve issue identity when conversion discovers new reasons.
- [x] 2.2 Place and label the problem-step buttons, surface pending reasons at final review, and verify direct jumps and backward navigation in the Dashboard suite.
- [x] 2.3 Publish settled apply outcome counts and verify that a failure appears while the run is still active and the next parent proceeds.
- [x] 2.4 Update the component documentation and validate this change with OpenSpec.

## 3. Integrated acceptance

- [x] 3.1 Re-run migration on the isolated dev data. Verify selected parents migrate and their canonical artifacts are readable, the missing-source parent is preserved, and every set has its matching outcome.

On Windows Zotero 10.0.8, an isolated copy of the historical direct-load add-on reproduced a missing replacement file with the original path form. The same add-on with the writer corrections applied for diagnosis migrated 108 of 109 parent sets. One set with missing source files was skipped. Broker readback verified both canonical artifacts in three sampled parents. An injected verification failure restored the source notes and preserved all five sampled files byte for byte.

The regular XPI build and its Zotero test suites require fresh Host Bridge CLI and seven-platform Synthesis sidecar artifacts. Their prebuild fingerprints differ from the current inputs.
