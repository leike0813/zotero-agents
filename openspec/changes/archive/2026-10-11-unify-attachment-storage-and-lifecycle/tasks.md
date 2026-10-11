# Tasks

## 1. Shared preparation and filename policy

- [x] 1.1 Consolidate preparation and runtime dependencies, remove duplicate workflow execution, and verify existing preparation/replay tests plus portable-name and unsafe-companion regressions.
- [x] 1.2 Document the shared owner and permanent-storage invariant in component documentation and project instructions; verify referenced modules exist.

## 2. Bridge and temporary ownership

- [x] 2.1 Implement upload metadata defaults and owned-byte cleanup with lease protection; verify Bridge upload/import/expiry/replay tests.
- [x] 2.2 Guard temporary cleanup against attachment ownership and concurrent acquisition; verify runtime cleanup tests and update lifecycle documentation.

## 3. Workflow result materialization

- [x] 3.1 Correct MinerU matching and complete adjacent-output promotion/recovery; verify rerun, ambiguous/missing targets, images, and failure tests and update MinerU documentation.
- [x] 3.2 Correct translator/deep-reading matching, complete-set promotion/recovery and synced alignment lookup; verify existing workflow suites plus new regressions and update workflow documentation.

## 4. Native file synchronization

- [x] 4.1 Update stored replacement and journal recovery to preserve sync baselines and queue companion-only changes; verify native mutation tests for unchanged content, quick reruns, rollback and restart recovery.
- [x] 4.2 Extend the existing Zotero E2E suite for stored import independence, replacement and native ZIP contents; run available isolated host validation and record environment limitations.
- [x] 4.3 Add user recovery guidance for old links and explain sync and conversion identity; verify source docs and help generation checks where available.

## 5. Integration acceptance

- [x] 5.1 Run affected Node suites, TypeScript, scoped lint/format checks and strict OpenSpec validation; resolve failures and record results.
- [x] 5.2 Review the complete diff for public-interface compatibility, temporary-path independence and user-approved overwrite semantics; leave the change active without committing or publishing.

Evidence and environment limitations are recorded in [validation.md](validation.md).
