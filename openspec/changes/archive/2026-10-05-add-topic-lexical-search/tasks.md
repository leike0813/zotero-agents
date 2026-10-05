# Tasks

## 1. Shared contract and canonical Topic schema parity

- [x] 1.1 Add `SynthesisTopicSearchRequest` and Topic result DTOs using C2's exact common request base, result envelope, `topic` coverage, closed issue shape, and lexical method; verify contract type and JSON Schema parity checks pass.
- [x] 1.2 Extend the existing Topic workbench request/result JSON Schemas and protocol registry with `topics.search`, retaining closed objects and canonical section names; verify schema registry validation and Rust/TypeScript parity corpus checks pass.
- [x] 1.3 Add optional `comparison_matrix` to the TypeScript and Rust complete/patchable section inventories while keeping required sections separate; verify both engine suites accept absence and recognize present matrix data.
- [x] 1.4 Document Topic search DTO, section scope, coverage, shared issue semantics, and method in synthesis-layer contracts; verify documented fields match the canonical schema.

## 2. Shared-kernel Topic application and cursor basis

- [x] 2.1 Add a private canonical-store read for coherent current-root Topic membership and per-candidate canonical manifest/artifact/content basis only if existing owner APIs cannot provide them; verify owner tests cover complete membership and changed-root detection without timestamp-derived global basis.
- [x] 2.2 Implement bounded search in the existing Rust Topic application, consuming the C2 Rust Retrieval kernel and its coverage → phrase → field → identity ordering; derive section names from the canonical `TopicArtifact` schema and exclude non-user-facing identity/hash/path/status/code values; verify Unicode, phrase, coverage, field ordering, identity tie, section validation, and comparison-matrix cases in focused Rust tests.
- [x] 2.3 Implement shared envelope outcomes and per-section coverage/closed issues, with exact `total` only for complete scans and `limited`/unknown total for incomplete or capped rounds; verify complete, empty, unavailable, unreadable-source, budget, and result-cap cases.
- [x] 2.4 Freeze bounded opaque cursor state with the complete scanned candidate membership/content basis, including non-matches, and revalidate every candidate before continuation; return typed stale/expired errors without rerunning, and issue no cursor when complete basis cannot be retained or verified; verify changed matching/non-matching Topic, membership mutation, eviction, expiry, and uninterrupted-page cases.
- [x] 2.5 Wire the operation through existing Topic runtime dispatch and production capability route; verify native route integration tests reach the existing Topic application and preserve `topics.list`, resolver, and context behavior.
- [x] 2.6 Update Topic application/runtime design documentation and focused Rust integration tests alongside the owner changes; verify the documented route and bounds match executable tests.

## 3. Synthesis client and Workflow Host projections

- [x] 3.1 Add grouped `SynthesisClient.topics.search` through existing in-process/native ports using the shared DTO and route; verify client composition and wire-contract tests.
- [x] 3.2 Project `host.synthesis.topics.search` and explicitly project `host.synthesis.topics.getContext` using the existing owner, request, delivery context, DTO, and errors unchanged; verify Workflow Host contract tests show both members and `getContext` owner behavior is unchanged.
- [x] 3.3 Update Synthesis client and Workflow Host API documentation for search and the explicit existing-context projection; verify documented signatures match exported types.

## 4. Host Bridge, MCP, and Rust CLI surfaces

- [x] 4.1 Register the read-only `topics.search` capability and closed request/result schemas in the existing Host Bridge registry/contracts, bound to `client.topics.search`; verify registry schema and capability allowlist tests.
- [x] 4.2 Expose the capability through registry-derived MCP tool projection and handler without a second dispatcher; verify MCP mirror tests exercise request validation, response envelope, and error mapping.
- [x] 4.3 Add `synthesis topic search` to Rust Bridge arguments, command tree, direct dispatch, and canonical CLI command descriptors using the existing `--query` JSON container; verify CLI parsing, capability forwarding, and command-contract tests.
- [x] 4.4 Update Host Bridge and MCP component docs plus authored minimum-core CLI Skill/catalog command partition; render all three governed surfaces from source and verify the command is present without altering existing command semantics.
- [x] 4.5 Review generated Host Bridge surfaces against baseline `84b3028dba8f5f3b8437f3aa237bf0fec2e68820` with empty semantic deletion inventory; verify semantic parity counts, absolute depth, baseline-relative line/prose gates, and generated-surface checks.

## 5. End-to-end capability verification

- [x] 5.1 Exercise a canonical Topic query through Synthesis client, Workflow Host, Host Bridge, MCP, and Rust CLI, including `comparison_matrix`, no-match, invalid-section, bounded pagination, and non-match content mutation; verify every surface returns the shared envelope and continuation never reruns search.
- [x] 5.2 Run focused synthesis contract/engine/application/runtime tests, Workflow Host tests, Host Bridge/MCP/CLI tests, cross-language schema checks, and required Host Bridge surface gates; verify each command passes and record any environment-limited check with its reason.

## Validation record

Implementation baseline: `82c8a3de5f8d71d26e839464ef99d67bf7ce566e`.
No dependencies were installed or upgraded. Canonical search stays in the
existing Rust Topic application and consumes C2's lexical kernel.

- TypeScript: `npx tsc --noEmit`, the synthesis contract/engine/application checks,
  focused ESLint/Prettier, cross-language contracts, production capability
  inventory, native runtime parity, service boundary, and Topic/Workbench parity.
  The closed production inventory now has 106 operations; the executable
  scenario matrix covers all 106, including the existing Evidence search route.
- Node domains: `npm run test:node:synthesis`, `npm run test:node:host-bridge`,
  and `npm run test:node:workflow`. Workflow Host adapters and all built-in
  workflow package groups passed. One Workflow engine package-file scan exceeded
  its existing 2-second test timeout under concurrent load; rerunning that shard
  passed without changing production code or the timeout.
- Native: locked tests for application, canonical store, protocol, structured
  artifact, and sidecar targets; strict workspace clippy and Rust format checks.
  The final Topic search suite contains 23 passing tests. Rust Bridge's locked
  suite passed 140 unit and 19 schema-mode tests.
- Real sidecar plus compiled Rust CLI integration exercises all five entries:
  canonical matrix text, case normalization, one-page bounds, continuation,
  no-match, invalid sections, and changing a previously nonmatching Topic.
  Rejected CLI continuation makes exactly one request. Fixed-baseline read
  observables, the 106-operation matrix, and large Topic locator delivery passed.
- Discovered fanout fixes: native search encodes the successful DTO after
  propagating the Rust result; semantic context supplies its existing required
  fields and schema-admitted content; HTTP read-search errors preserve native
  stale/expired reasons and failure categories; MCP search schemas compile
  independently with local references. The shared HTTP search branch also
  corrects Evidence search's prior maintenance-conflict classification.

Semantic review ran with `reviewRequired: true`. The fixed governed baseline is
`84b3028dba8f5f3b8437f3aa237bf0fec2e68820`; explicit deletion inventory is empty.
Minimum-core, Generic inheritance, and Hermes inheritance are aligned; authored
guidance is additive. No release identity, publication, or prebuild changed.
Unmapped, downgraded, unauthorized dropped, and intra-package duplicate counts
are **0 / 0 / 0 / 0**. The source catalog retains every pre-C4 instruction in
place; its new Topic guidance covers scope, evidence, caps, continuation,
failure, and recovery. Existing normative owners retain their instructions.

Materialized metrics use the package validator's substantive-line/prose rules:

| File (same values in plugin and Hermes CLI package) | Fixed baseline lines / chars | Pre-C4 lines / chars | C4 lines / chars |
| --- | --- | --- | --- |
| `SKILL.md` | 190 / 38453 | 190 / 38453 | 190 / 38453 |
| `references/command-catalog.md` | 146 / 13403 | 150 / 15340 | 153 / 17579 |
| `docs/host-bridge-cli.md` | 645 / 23010 | 645 / 23072 | 645 / 23072 |

`npm run render:host-bridge-content` and `npm run check:host-bridge-content`
passed. The materialized package gate against the fixed baseline passed with
zero hard failures. All 54 depth advisories are accepted: each names an
unchanged existing generated command card, retains its authoritative invocation,
payload/result, effect, approval, and recovery facts, and clears the absolute
floor. The new Topic search card is 356 lines and clears the 350-line advisory
floor. Relative substantive-line and 95% prose floors passed for every baseline
file and directly linked reference. Deterministic duplicate and consumer
alignment gates passed.

Integration uses the authenticated native sidecar, real HTTP capability adapter,
and compiled Rust CLI. No Zotero GUI E2E acceptance or release/prebuild was
performed.
