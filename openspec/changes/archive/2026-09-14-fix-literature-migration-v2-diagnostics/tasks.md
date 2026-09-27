## 1. Parent-set correctness

- [x] 1.1 Add real-Zotero regression coverage for native attachment staging and superseded v2 migration targets; verify the focused lite-core tests fail before the production fix.
- [x] 1.2 Fix pre-save attachment key assignment and v1-only deferred cleanup; verify the real-Zotero parent-set and Dashboard migration cases pass.

## 2. Durable diagnostic projection

- [x] 2.1 Add service-level coverage for selecting one primary issue and projecting settled or unavailable authority evidence without sensitive fields; verify it fails before implementation.
- [x] 2.2 Add the bounded state-store query and shared migration authority projector; verify service diagnostics and the existing diagnostic bundle pass.

## 3. Dashboard troubleshooting surface

- [x] 3.1 Add a DOM regression test for the inline diagnostic card and recovery guidance; verify it fails before the Dashboard changes.
- [x] 3.2 Extend the Dashboard wire/snapshot/panel/UI projection and reuse `copyText()` for diagnostic export; verify UI tests and Dashboard type-check pass.

## 4. Documentation and verification

- [x] 4.1 Update migration documentation and localization, then verify all locale labels resolve and OpenSpec validates strictly.
- [x] 4.2 Run focused Node/UI tests, the Zotero lite-core case, lint, type checks, and build; verify the original three failures no longer reproduce and the user's original library remains untouched.

## 5. Post-commit deletion evidence

- [x] 5.1 Reproduce the unloaded-attachment failure through public `notes.upsertPayload` and require a committed strict-JSON deletion receipt.
- [x] 5.2 Capture immutable removal evidence before erase, reuse it in all payload receipt paths, and cover v1/v2 plus dual-v2 Dashboard migration in real Zotero.
- [x] 5.3 Update documentation and run focused tests, type checks, lint, build, and strict OpenSpec validation.

## 6. Post-commit creation evidence

- [x] 6.1 Extend the real-Zotero Dashboard migration case so a newly created payload attachment becomes unreadable after the native transaction, and verify the current implementation reports the reproduced failure.
- [x] 6.2 Capture immutable creation evidence inside the shared payload writer and consume it in all three receipt paths while retaining the native item only for compensation.
- [x] 6.3 Update migration documentation and run the focused Node/Zotero tests, type checks, lint, build, and strict OpenSpec validation.

## 7. Historical Score compatibility and kind isolation

- [x] 7.1 Add public-seam regression coverage for the exact historical Score storage envelope and for Citation/References reads with an unrelated damaged Score; verify both fail before the production fix.
- [x] 7.2 Add one shared stored-score compatibility parser and make managed singleton discovery skip only different known managed kinds; verify the focused readiness and Broker tests pass while strict external score validation remains unchanged.
- [x] 7.3 Extend the real-Zotero Dashboard migration matrix with absent, canonical, historical, and damaged Score siblings; verify Score identity is preserved, update documentation, and run focused checks, build, and strict OpenSpec validation.
