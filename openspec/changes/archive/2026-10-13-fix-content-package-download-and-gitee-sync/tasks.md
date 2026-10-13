# Tasks

## 1. Download acquisition

- [x] 1.1 Add a primary-feed regression and implement immediate primary selection; verify subscription tests.
- [x] 1.2 Test bounded headers/body/total timeouts and implement sequential abortable acquisition; verify fallback and retained installation.
- [x] 1.3 Test streaming progress and structured errors and implement shared download projection; verify progress and integrity scenarios.
- [x] 1.4 Update workflow documentation for deadlines, source selection and diagnostics; review against implementation.

## 2. UI feedback

- [x] 2.1 Test byte progress preservation through hooks/UI and implement rendering; verify existing subscription and preferences tests.
- [x] 2.2 Test stale status refresh and unexpected rejection and implement persistent terminal feedback and restored controls; verify UI tests.

## 3. Mirror synchronization

- [x] 3.1 Test content-only routing and published channel pairs; implement immutable original-asset synchronization with safe refs and public verification, and update command documentation.
- [x] 3.2 Synchronize v0.8.8 dev assets and feed to Gitee; verify public ZIP/checksum, feed and ref against GitHub source.

## 4. Integration acceptance

- [x] 4.1 Run related subscription/UI/tooling tests, TypeScript, changed-file lint/format and strict OpenSpec validation; review final diff and record remaining runtime limitations.
