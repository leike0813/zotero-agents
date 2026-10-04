# Tasks

## 1. Shared contract and canonical Topic schema parity

- [ ] 1.1 Add `SynthesisTopicSearchRequest` and Topic result DTOs using C2's exact common request base, result envelope, `topic` coverage, closed issue shape, and lexical method; verify contract type and JSON Schema parity checks pass.
- [ ] 1.2 Extend the existing Topic workbench request/result JSON Schemas and protocol registry with `topics.search`, retaining closed objects and canonical section names; verify schema registry validation and Rust/TypeScript parity corpus checks pass.
- [ ] 1.3 Add optional `comparison_matrix` to the TypeScript and Rust complete/patchable section inventories while keeping required sections separate; verify both engine suites accept absence and recognize present matrix data.
- [ ] 1.4 Document Topic search DTO, section scope, coverage, shared issue semantics, and method in synthesis-layer contracts; verify documented fields match the canonical schema.

## 2. Shared-kernel Topic application and cursor basis

- [ ] 2.1 Add a private canonical-store read for coherent current-root Topic membership and per-candidate canonical manifest/artifact/content basis only if existing owner APIs cannot provide them; verify owner tests cover complete membership and changed-root detection without timestamp-derived global basis.
- [ ] 2.2 Implement bounded search in the existing Rust Topic application, consuming the C2 Rust Retrieval kernel and its coverage → phrase → field → identity ordering; derive section names from the canonical `TopicArtifact` schema and exclude non-user-facing identity/hash/path/status/code values; verify Unicode, phrase, coverage, field ordering, identity tie, section validation, and comparison-matrix cases in focused Rust tests.
- [ ] 2.3 Implement shared envelope outcomes and per-section coverage/closed issues, with exact `total` only for complete scans and `limited`/unknown total for incomplete or capped rounds; verify complete, empty, unavailable, unreadable-source, budget, and result-cap cases.
- [ ] 2.4 Freeze bounded opaque cursor state with the complete scanned candidate membership/content basis, including non-matches, and revalidate every candidate before continuation; return typed stale/expired errors without rerunning, and issue no cursor when complete basis cannot be retained or verified; verify changed matching/non-matching Topic, membership mutation, eviction, expiry, and uninterrupted-page cases.
- [ ] 2.5 Wire the operation through existing Topic runtime dispatch and production capability route; verify native route integration tests reach the existing Topic application and preserve `topics.list`, resolver, and context behavior.
- [ ] 2.6 Update Topic application/runtime design documentation and focused Rust integration tests alongside the owner changes; verify the documented route and bounds match executable tests.

## 3. Synthesis client and Workflow Host projections

- [ ] 3.1 Add grouped `SynthesisClient.topics.search` through existing in-process/native ports using the shared DTO and route; verify client composition and wire-contract tests.
- [ ] 3.2 Project `host.synthesis.topics.search` and explicitly project `host.synthesis.topics.getContext` using the existing owner, request, delivery context, DTO, and errors unchanged; verify Workflow Host contract tests show both members and `getContext` owner behavior is unchanged.
- [ ] 3.3 Update Synthesis client and Workflow Host API documentation for search and the explicit existing-context projection; verify documented signatures match exported types.

## 4. Host Bridge, MCP, and Rust CLI surfaces

- [ ] 4.1 Register the read-only `topics.search` capability and closed request/result schemas in the existing Host Bridge registry/contracts, bound to `client.topics.search`; verify registry schema and capability allowlist tests.
- [ ] 4.2 Expose the capability through registry-derived MCP tool projection and handler without a second dispatcher; verify MCP mirror tests exercise request validation, response envelope, and error mapping.
- [ ] 4.3 Add `synthesis topic search` to Rust Bridge arguments, command tree, direct dispatch, and canonical CLI command descriptors using the existing `--query` JSON container; verify CLI parsing, capability forwarding, and command-contract tests.
- [ ] 4.4 Update Host Bridge and MCP component docs plus authored minimum-core CLI Skill/catalog command partition; render all three governed surfaces from source and verify the command is present without altering existing command semantics.
- [ ] 4.5 Review generated Host Bridge surfaces against baseline `84b3028dba8f5f3b8437f3aa237bf0fec2e68820` with empty semantic deletion inventory; verify semantic parity counts, absolute depth, baseline-relative line/prose gates, and generated-surface checks.

## 5. End-to-end capability verification

- [ ] 5.1 Exercise a canonical Topic query through Synthesis client, Workflow Host, Host Bridge, MCP, and Rust CLI, including `comparison_matrix`, no-match, invalid-section, bounded pagination, and non-match content mutation; verify every surface returns the shared envelope and continuation never reruns search.
- [ ] 5.2 Run focused synthesis contract/engine/application/runtime tests, Workflow Host tests, Host Bridge/MCP/CLI tests, cross-language schema checks, and required Host Bridge surface gates; verify each command passes and record any environment-limited check with its reason.
