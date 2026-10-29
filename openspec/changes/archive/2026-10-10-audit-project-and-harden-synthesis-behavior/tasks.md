# Tasks

## 1. Audit and behavioral inventory

- [x] 1.1 Record source-fixed project audit findings, reproductions and inspected boundaries in audit.md; independently verify each confirmed defect.
- [x] 1.2 Reconcile all Synthesis operations and applicable public behavior scenarios to assertions in behavior-coverage.md; record uncovered or unexecuted rows explicitly.

## 2. Shared RPC and test routing

- [x] 2.1 Add failing malformed-envelope tests and repair shared RPC classification; verify valid errors, successful identities, cancellation and timeouts remain distinct.
- [x] 2.2 Share native suite membership with the shard runner; verify complete, disjoint selection and existing native suite behavior.
- [x] 2.3 Correct reverse-Host deadline documentation against production policy and existing slow-read integration evidence.

## 3. Audit repairs and integration coverage

- [x] 3.1 Reproduce and fix all additional confirmed Synthesis defects in their owners, with targeted regression and necessary contract/document updates.
- [x] 3.2 Reproduce and fix all confirmed non-Synthesis defects, with caller inspection and targeted regression evidence.
- [x] 3.3 Fill Synthesis business behavior gaps using existing domain/corpus and real-process tests; every applicable coverage row must have passing assertions before claiming 100%.
- [x] 3.4 Extend existing System E2E cases for missing real-Host behavior and existing CI coverage where needed; validate catalog selection without a new runner.

## 4. Integrated acceptance

- [x] 4.1 Run full Node, Rust workspace, Stage1 and affected parity checks; record commands and outcomes and repair relevant failures.
- [x] 4.2 Run types, lint/format checks and plugin build, preserving pre-existing staging; record any unrelated baseline failure separately.
- [x] 4.3 Run isolated current-source System E2E on Linux Zotero 7.0.32, 9.0.6 and 10.0.2; verify complete manifests, cleanup and health evidence.
- [x] 4.4 Independently review final changes, reconcile audit/coverage evidence and validate OpenSpec; leave uncommitted and unarchived with all limitations explicit.
