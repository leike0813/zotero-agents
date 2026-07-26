## 1. Contract Registry And Tests

- [x] 1.1 Add failing schema and coverage tests for the versioned command-contract registry, strict structured inputs, examples, and command result schemas.
- [x] 1.2 Add the closed registry schema and canonical command-contract registry without duplicating Clap argv facts.

## 2. Rust CLI Offline Schema Path

- [x] 2.1 Add failing Rust CLI tests for leading/trailing `--schema`, missing ordinary required values, multi-input commands, unavailable schemas, stdout envelopes, and offline execution.
- [x] 2.2 Implement global `--schema`, permissive leaf resolution, embedded registry lookup, stable errors, and concise registry-backed long-help examples.

## 3. Agent Surface V5

- [x] 3.1 Add failing inventory/descriptor tests for complete argument metadata, registry parity, strict result schemas, v5 validation, and identity checksums.
- [x] 3.2 Extend the Clap inventory and surface catalog, generate `host-bridge.agent-surface.v5`, update shared identities and embedded Rust assets, and version release-set validation for `zotero-bridge.cli.v4`.

## 4. Per-command References

- [x] 4.1 Add failing renderer and governance tests for 125 deterministic command cards, four schema layers, multiline JSON fences, unique catalog links, and aggregate removal.
- [x] 4.2 Render one Markdown file per canonical leaf command and a grouped command catalog from the v5 descriptor and command-contract registry.
- [x] 4.3 Update Skill package validation for catalog-mediated command-card reachability, duplicate/orphan/path checks, fixed baseline parity, and the approved aggregate deletion list.

## 5. Materialization And Review Mirror

- [x] 5.1 Materialize source, builtin, and Hermes packages; remove only the eight approved aggregate references; refresh the ownership review mirror.
- [x] 5.2 Verify `unmapped = 0`, `downgraded = 0`, `unauthorized dropped = 0`, `intra-package duplicate = 0`, command coverage `125/125`, and the fixed line/prose depth floors.

## 6. Verification

- [x] 6.1 Run focused Rust, Node, schema, descriptor, renderer, packaging, release-set, content, semantic-surface, and review-mirror tests and fix failures.
- [x] 6.2 Run OpenSpec validation and final Host Bridge build/content gates without commit, branch, release dispatch, development server, or Gitee synchronization.
