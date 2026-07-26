## 1. Contract tests and provider separation

- [x] 1.1 Update workflow-control and CLI tests so workflow describe/requirements/validate exclude provider profile input and provider commands use backend-only context.
- [x] 1.2 Add provider-profile descriptor, validation, compatibility, environment-precedence, and unsafe-input tests for ACP and SkillRunner backends.
- [x] 1.3 Implement provider-owned descriptor/normalization/validation contracts and split workflow validation from submission compatibility preflight.
- [x] 1.4 Add `workflow profile list/describe/validate`, CLI-owned `ZOTERO_BRIDGE_DEFAULT_PROVIDER_PROFILE`, and structured compatibility/profile errors.
- [x] 1.5 Make ACP and SkillRunner explicit option application fail closed and expose non-sensitive application audit facts.

## 2. Synthesis maintenance controls

- [x] 2.1 Add failing capability, approval, CLI parsing, idempotency, scope, receipt, and transaction-boundary tests for sidecar refresh and graph update.
- [x] 2.2 Implement public `reference_sidecar.refresh` and `citation_graph.update` asynchronous operations with paper/library scope and operation status lookup.
- [x] 2.3 Add canonical `synthesis cache refresh-reference-sidecar` and `synthesis graph update` CLI commands and surface mappings.

## 3. Self-description and workflow catalog

- [x] 3.1 Add manifest/loader tests for required workflow descriptions and explicit execution modes, then update all visible built-in manifests.
- [x] 3.2 Upgrade the Rust Agent Surface to v3 with global options, workflow catalog entries, and exact command/option coverage.
- [x] 3.3 Add package-local Library Agent and Librarian helper descriptors with complete argparse help and exact inventory checks.

## 4. Semantic guidance and generated content

- [x] 4.1 Update CLI wrapper semantic sources for independent workflow/profile discovery, validation, default profile resolution, and maintenance recovery.
- [x] 4.2 Add the ordered six-stage Library Agent journey and update Librarian common-task guidance without crossing resident ownership boundaries.
- [x] 4.3 Run the semantic surface review, render content-only targets, and fix documentation or generated-surface drift.

## 5. Verification

- [x] 5.1 Run focused Rust, Host Bridge, provider, Synthesis, surface, bundle, and profile tests and fix regressions.
- [x] 5.2 Run OpenSpec validation, manifest checks, doc/content checks, and lint/type gates; record any unrelated pre-existing failures.
