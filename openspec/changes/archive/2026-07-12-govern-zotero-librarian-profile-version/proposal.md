## Why

The Zotero Librarian profile currently carries a manually maintained version
that is not governed by the Host Bridge CLI release. This makes the standalone
profile release hard to identify and lets public profile changes publish without
a deliberate version decision.

## What Changes

- Derive the Profile major/minor version from the recorded Host Bridge CLI
  release and maintain a Profile-specific patch scope.
- Add inspect, bump, render, check, and publish-time version governance.
- Make Profile version governance an explicit stage of the Host Bridge release
  pipeline skill and the surface publishing workflow.
- Add profile and CLI version audit fields to generated and published manifests.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `zotero-librarian-profile-distribution`: govern the generated Profile version
  and publish audit metadata from the CLI release and Profile patch scope.
- `host-bridge-release-pipeline`: require Profile version classification,
  generated-surface freshness, and version-aware surface publication.

## Impact

Affected systems are the Profile renderer/checker/publisher, Host Bridge release
skills and workflows, release coordination, generated Profile metadata, and the
focused Profile and release-pipeline tests. No new runtime dependency is added.
