# Proposal

## Why

C13 needs one owner-scoped attachment page to commit all new copies together and needs a bounded text writer for annotation and traversal artifacts. C08 currently commits each source separately and accepts only already-staged generated files, so those callers cannot meet the approved atomicity and path-ownership contract.

## What Changes

- Add ordered batch materialization with one manifest commit and rollback of new copies on failure. Preserve the existing single-source API through the batch path.
- Add a private staged UTF-8 output writer with append, commit, and discard. Reuse the existing generated-output promotion and quotas.
- Keep source paths and staging paths out of the durable manifest and model-visible results.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pi-trusted-native-execution`: Make the existing owner-managed file contract usable for atomic attachment pages and streamed generated output.

## Impact

`src/modules/piTrustedNativeExecution.ts`, its existing Node and real-Zotero tests, the Pi runtime handoff, and the owner-managed-file specification. No dependency or manifest migration.
