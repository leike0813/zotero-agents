## 1. Channel selection contracts

- [x] 1.1 Extend the existing release-script tests for explicit dispatch selection, strict normalization, scoped verification, and retained direct-script defaults.
- [x] 1.2 Add the shared channel selection module and adopt it in release, build, and check scripts.
- [x] 1.3 Require and dispatch selected channels from the Content Package release CLI while preserving version-bump behavior and existing release gates.

## 2. Scoped feed publication

- [x] 2.1 Add behavior tests for patching a content-feed branch without changing unselected feeds.
- [x] 2.2 Implement the feed branch publisher and invoke it from the GitHub workflow with selected channels, serialized publication, and post-publish scoped verification.

## 3. Documentation and verification

- [x] 3.1 Document the explicit formal release command and scoped feed behavior.
- [x] 3.2 Run targeted tests, type/lint checks, OpenSpec validation, and review the resulting diff.
