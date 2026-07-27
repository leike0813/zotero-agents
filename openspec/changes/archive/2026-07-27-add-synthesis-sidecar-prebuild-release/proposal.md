## Why

Synthesis native runtime candidates currently cover only five targets and are
promoted through a mutable GitHub Release tag. That tag cannot prove which
source, workflow run, or archive set was used by a plugin release, and the
signature requirement prevents the unsigned native CI outputs from becoming a
reproducible release input.

## What Changes

- Add the seven-target Synthesis sidecar matrix and a v3 native bundle format.
- Add a content-addressed prebuild branch, exact workflow-result identity, and
  a resumable release set/receipt pipeline for the native runtime.
- Make plugin release consume only a committed, complete sidecar release set
  and its materialized runtime inventory.
- Remove platform-code-signature admission from the native bundle contract;
  retain file digests and release evidence as the production integrity proof.

## Capabilities

### New Capabilities

- `synthesis-sidecar-prebuild-release`: Exact seven-platform prebuild storage,
  release-set preparation, controlled dispatch, recovery, and receipt proof.

### Modified Capabilities

- `synthesis-sidecar-runtime-packaging`: Native inventory, target matrix, and
  plugin packaging gates change from v2/signature policy to v3/release proof.
- `synthesis-native-runtime-manifest-v2`: The strict native manifest moves to
  v3 and no longer carries a platform-code-signature admission field.

## Impact

The change affects sidecar contracts and installer admission, runtime package
and verification scripts, GitHub Actions workflows, the plugin release gate,
OpenSpec packaging contracts, and two operator Skills. It adds no runtime
dependency and leaves historical GitHub Release objects untouched.
