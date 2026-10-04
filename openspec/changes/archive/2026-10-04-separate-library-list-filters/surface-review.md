# C1 fan-out and surface review

Baseline: `84b3028dba8f5f3b8437f3aa237bf0fec2e68820` (HEAD before implementation).

Explicit semantic deletion inventory: empty. Existing instructions retain their placement, detail, decisions, evidence and recovery semantics. Enumeration field facts change from `query` to `filter`; search payload `query` and CLI container flag `--query` retain their meanings.

## Pre-edit materialized metrics

Computed using the repository package checker's `instructionMetrics` against the fixed Git baseline, before any semantic changes.

| Materialized file | Substantive instruction lines | Normalized prose characters |
| --- | ---: | ---: |
| `addon/content/host-bridge-skills/zotero-bridge-cli/SKILL.md` | 190 | 38453 |
| `addon/content/host-bridge-skills/zotero-bridge-cli/references/command-catalog.md` | 146 | 13403 |
| `profiles/hermes/zotero-librarian/skills/zotero-bridge-cli/SKILL.md` | 190 | 38453 |
| `profiles/hermes/zotero-librarian/skills/zotero-bridge-cli/references/command-catalog.md` | 146 | 13403 |

The five affected command cards have the same metrics in the plugin and inherited Hermes CLI package:

| Card under `references/commands/` | Substantive instruction lines | Normalized prose characters |
| --- | ---: | ---: |
| `library/items/list.md` | 24 | 2288 |
| `library/readiness/audit.md` | 24 | 2326 |
| `library/readiness/missing-analysis.md` | 23 | 2335 |
| `library/readiness/missing-markdown.md` | 23 | 2321 |
| `library/readiness/missing-pdf.md` | 23 | 2298 |

The catalog is the directly linked reference; its governed generated command cards supply exact schema facts. Affected cards are `library/items/list.md` and the four `library/readiness/*.md` cards in both materializations. Generic and Hermes inherit this CLI package; their own task/resident instructions do not carry enumeration payload field copies.

## Fan-out audit

| Boundary | Inspection result / required action |
| --- | --- |
| Source selector | Rename list input/criteria and predicate/hash consumption; preserve all queryAsync SQL APIs and source error stage `query`. |
| Broker | Rename list and readiness input/filters, canonical list criteria and traversal forwarding/evidence. Ingest SQL query variables are unrelated. |
| Workflow Host | Change list/traversal DTO fields; wrappers and live-read bindings forward complete input/control explicitly and need no new member. |
| Built-in workflows | None supplies text query or reads returned text criteria. Collector now uses portable `collectionRef` on every membership page; auditor reads `criteria.libraryId` before starting its audit/traversal. literatureBundle already uses canonical portable refs and continuation. Existing behavior tests exercise actual Workflow Host/Broker reads for the two repaired consumers. |
| Built-in/source skills | `--query` references are JSON-container or independent search facts, not Workflow list criterion copies; retain. |
| Bridge | Change list/readiness executable schemas and list adapter. Add explicit retained search `query` to list `filter` translation. |
| MCP | Generated canonical tools reuse Bridge schemas/handlers; check independently declared `list_library_items` alias builder and schema. |
| CLI | Generic JSON object parser and canonical capability schema carry list/readiness keys; retain clap `--query` binding and search query parser. |
| Source guidance | Enumeration accepted-field prose is rendered from canonical capability schema. Existing hand-authored minimum-core/Generic/Hermes instructions do not require thinning or replacement. |
| Generated content | Renderer updates machine descriptor, exact command cards and CLI docs, inherited Hermes CLI package and manifest digests. Source facts remain canonical. |
| Synthesis reverse-host pages | Independent libraryId/cursor/limit port; no text filtering. |
| Snapshot | Fixed captured set and input schema unchanged. |
| Tests/mocks | Source/Broker/Bridge tests and shared SQL test adapter carry criterion copies; real-Zotero test payloads require migration. |

## Post-edit review

Semantic source review completed against the fixed baseline. The authored minimum-core, Generic and Hermes instructions are unchanged; the canonical capability schema owns the two field substitutions. The current-source renderer updates the five enumeration command cards in each CLI materialization, their machine descriptors, package digests and the two accepted-field facts in `docs/host-bridge-cli.md`. Sorted schema property placement changes inside generated JSON fences follow the existing renderer; no prose instruction was moved or removed.

| Review | Result |
| --- | --- |
| Minimum-core / Generic / Hermes ownership | Aligned; no authored instruction edits required |
| Explicit semantic deletion inventory | Empty |
| Unmapped semantic units | 0 |
| Downgraded semantic units | 0 |
| Unauthorized dropped semantic units | 0 |
| Intra-package duplicates | 0 |
| Absolute and fixed-baseline relative package gates | Passed |
| Agent control and locality contracts | Preserved |
| Release identity | Unchanged; current-source content only |

All fourteen file measurements in the pre-edit tables remain exactly equal after rendering. CLI `SKILL.md` remains 190 substantive instruction lines / 38,453 normalized prose characters; its directly linked catalog remains 146 / 13,403, in both materializations. Every affected command card retains its baseline metrics and complete invocation, input/output, effect, approval, evidence and recovery contracts. Their total line counts are 581 for list, 641 for readiness audit, and 649 for each missing-artifact command; all exceed the 350-line advisory threshold.

`render:host-bridge-content`, `check:host-bridge-content`, the two CLI package checks with `--baseline-ref 84b3028dba8f5f3b8437f3aa237bf0fec2e68820`, and the existing surface descriptor/manifest/package-validator suites pass. The before/after warning inventories are identical: 26 command cards in each of the plugin and inherited Hermes CLI packages, 52 warnings total. Each row below accepts that warning for **both** materializations. Each card retains its complete generated schema and operational failure/recovery domain, passes the hard floor and baseline gates, and is byte-identical to the baseline; extending it would add unrelated instructions to this field rename.

| Relative command card under `references/commands/` | Lines | Disposition |
| --- | ---: | --- |
| `bridge/backend/list.md` | 258 | Accepted: unchanged complete bounded-list contract |
| `bridge/backend/status.md` | 303 | Accepted: unchanged complete backend-status contract |
| `bridge/profile/diagnose.md` | 242 | Accepted: unchanged complete profile-diagnosis contract |
| `bridge/profile/inspect.md` | 242 | Accepted: unchanged complete profile-inspection contract |
| `bridge/status.md` | 240 | Accepted: unchanged complete bridge-status contract |
| `context/current.md` | 319 | Accepted: unchanged complete current-context contract |
| `debug/persistence.md` | 345 | Accepted: unchanged complete persistence-diagnostics contract |
| `debug/status.md` | 300 | Accepted: unchanged complete debug-status contract |
| `debug/synthesis/clean-install-reset.md` | 347 | Accepted: unchanged complete reset authority/recovery contract |
| `navigation/focus-zotero.md` | 344 | Accepted: unchanged complete captured-window navigation contract |
| `run/permission/get.md` | 318 | Accepted: unchanged complete permission-read contract |
| `run/skill/connect.md` | 318 | Accepted: unchanged complete skill-run connection contract |
| `run/skill/get.md` | 318 | Accepted: unchanged complete skill-run read contract |
| `surface/describe.md` | 347 | Accepted: unchanged complete command-description contract |
| `surface/identity.md` | 284 | Accepted: unchanged complete surface-identity contract |
| `synthesis/cache/invalidate.md` | 349 | Accepted: unchanged complete cache invalidation authority/recovery contract |
| `synthesis/cache/status.md` | 310 | Accepted: unchanged complete cache-status contract |
| `synthesis/graph/refresh-metrics.md` | 348 | Accepted: unchanged complete metrics refresh authority/recovery contract |
| `synthesis/index/status.md` | 242 | Accepted: unchanged complete index-status contract |
| `workflow/agent-result/validate.md` | 347 | Accepted: unchanged complete agent-result validation contract |
| `workflow/defaults.md` | 296 | Accepted: unchanged complete workflow-defaults contract |
| `workflow/list.md` | 240 | Accepted: unchanged complete workflow discovery contract |
| `workflow/profile/describe.md` | 299 | Accepted: unchanged complete workflow-profile description contract |
| `workflow/profile/list.md` | 242 | Accepted: unchanged complete workflow-profile discovery contract |
| `workflow/profile/refresh.md` | 299 | Accepted: unchanged complete workflow-profile refresh contract |
| `workflow/queue/cancel.md` | 328 | Accepted: unchanged complete queued-cancellation contract |

## Implementation fan-out and verification

The source selector input, canonical criterion encoding, literal predicate and diagnostic field use `filter`. Broker list criteria and readiness filters echo the normalized value. Traversal forwards it through every page and binds completion evidence to normalized returned conditions; whitespace-only filters therefore retain unfiltered completion semantics. The closed Bridge list/readiness schemas reject removed `query` before dispatch. The retained search adapter alone maps its `query` into a list `filter`, preserving `{ items, truncated }`. MCP's canonical registry-derived schemas and list argument builder mirror those facts. Rust CLI arguments, generic JSON parsing and command mappings stay unchanged: `--query` remains the container.

Inspected unchanged owners/consumers include `src/workflows/{hostApi,workflowHostOwners,workflowHostContract}.ts`, the built-in literatureBundle request builder, built-in/source skill packages, the Hermes resident service, `src/modules/literatureArtifactMigration.ts`, `src/modules/{synthesis/libraryAdapter,harness/zoteroReadonlyLibraryAdapter}.ts`, `packages/synthesis-contracts/src/hostRead.ts`, reverse-host handlers, and Rust CLI `args.rs` / `commands.rs` / `contract.rs` with `cli-commands.v2.json`. The built-in requests assemble library/collection/bounds/cursor only; migration and reverse-host pages do not copy a text criterion. The real-Zotero source-page test payloads were migrated to `filter` without claiming execution in a real host.

The initial audit missed two pre-existing built-in DTO mismatches because the consumer tests stubbed the library interface. The authorized follow-up repairs collector's `collectionKey` input to canonical `collectionRef` and auditor's root-level `libraryId` read to `criteria.libraryId`. The collector regression first failed with `noop` instead of `added`: a library item outside the target collection was incorrectly treated as already present. Its repaired test uses actual list/detail projections with existing native page-query test adapters and observes one membership addition while deduplicating the target's existing member. The existing continuation test also checks collection scope on every page. Auditor tests now use actual list projection; before the fix, the serial traversal and empty-library cases both failed on an undefined library identity. The empty-library case uses actual traversal with user library ID 7 and verifies publication for library 7. Synthesis publication and membership mutation are bounded doubles; these tests are not real-Zotero acceptance. A separate read-only sweep of all remaining built-in list/traverse calls found only literatureBundle, whose portable refs, item detail refs and continuation already match the canonical contract.

Test-first evidence: source test `185` initially failed because `criteria.filter` was absent; Broker test `102` initially failed for the same renamed echo. The blank-filter traversal scenario initially failed at full-audit evidence consumption and passes after evidence uses normalized criteria. Bridge/MCP tests cover current filtering, removed-field rejection, search adaptation and schema mirror; Workflow governance covers both v12 variants, continuation, full traversal and cancellation after the first batch. CLI tests inspect current-source descriptors and distinguish accepted `filter`/search `query` reaching transport from removed enumeration `query` failing at command-input validation.

Integration evidence: 256 source/Broker/Bridge/MCP tests; 50 Workflow governance/bundle/collector tests; 80 migration/tag-auditor/Synthesis Host consumer tests; 39 Host Bridge server tests; 29 surface descriptor/manifest/package-validator tests: **454 Node tests passed**. Full current-source Rust CLI `cargo test --locked --manifest-path rust/zotero-bridge/Cargo.toml` passes **125 unit + 16 schema integration tests**. Root, sidebar, Dashboard and Synthesis TypeScript checks pass. Changed-file ESLint and formatting checks pass; the changed Rust test passes its individual rustfmt check. Workflow manifest and consumer-guidance checks pass.

Built-in follow-up verification: rerunning Workflow governance `187`, bundle `47`, collector `49` and auditor `66` together passes **58 tests** with the strengthened existing cases. Root `npx tsc --noEmit`, changed-test ESLint, changed-file Prettier, both hook `node --check` commands, `git diff --check`, `npm run check:builtin-workflow-manifest`, `npm run check:host-bridge-consumers` and strict C1 OpenSpec validation pass. ESLint excludes built-in hook files by the existing repository configuration, so their syntax and runtime behavior are checked separately. No test count is added to the earlier 454 because these suites overlap. This follow-up changes no Broker API, governed agent-facing surface, dependency or release identity.

Node tests use `npx tsx node_modules/mocha/bin/mocha <existing files> --require tests/setup/zotero-mock.ts --timeout 15000 --exit` (20,000 ms for the consumer group and 120,000 ms for the surface group). The six groups above respectively cover existing source `185` / Broker `102` / Bridge `107` / MCP `101,108`; Workflow `187` / bundle `47` / collector `49`; tag-auditor `66` / migration `264` / Synthesis Host `177,178,225`; Bridge server `106`; surface `169,170,171`. Type checks use `npx tsc --noEmit` and the existing `tsconfig.sidebar.json`, `tsconfig.dashboard.json`, `tsconfig.synthesis.json`. Generated parity uses `npm run check:host-bridge-content`; package depth uses the fixed-baseline command above. No alternate runner was added.

Verification limitations:

- Domain shard commands stop before running tests because tracked `tests/runtime/windows-graphics-runtime.test.ts` has no shard owner in the unchanged runner. Relevant existing test files were executed directly with the existing Mocha/Zotero mock setup.
- Whole-crate `cargo fmt --check` reports existing formatting drift in unchanged `args.rs`, `commands.rs`, `contract.rs` and `surface.rs`; the changed `tests/schema_mode.rs` passes its targeted rustfmt check.
- CLI prebuild freshness reports `host_bridge_cli_fingerprint_stale`: published manifest fingerprint `2ef15640bcf10945895ab4a1daa65e89337d6f99978316278c8aa4b1ecb4b4c1` differs from current inputs `fee9e86c8a9bad522823fb26f25d4132a9f4fdee667bc36fa19d0bbcfd1ea815`. Release identities and binaries are untouched; prebuild/publication is outside C1.
- No real Zotero runtime, full E2E, release, archive or main-spec synchronization was executed.

## Stop handoff

All four planning sets pass `openspec validate <change> --strict`, with proposal/specs/design/tasks done. C1 is independent implementation groundwork. C2 establishes the shared Rust lexical kernel and evidence contracts; C3 and C4 consume that shared work in their respective owners. Only C1 was applied. C2 remains 0/21, C3 0/16 and C4 0/20 implementation tasks, all apply-ready. Main specs and release sources are untouched. Work stops after C1 without branch/history changes, commit, publication or archive.
