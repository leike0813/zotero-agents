# C17 verification — integrate-pi-skill-runs

Baseline: `24f6dabae9f5e1a9387bf03ce17c0d2ca52c13ef`. Status date: 2026-10-01. Implementation remains uncommitted.

## Scope and ownership

`piSkillRun.ts` owns Workflow-created request lifecycle, frozen preparation, result seal, interaction CAS, permission continuation, suspension/cancellation and recovery of a known owner. New ACP and Pi admissions use `skillRunPreparation.ts` and `skillRunFinalizer.ts`; existing unversioned ACP records retain legacy execution. External SkillRunner keeps its existing behavior.

Workflow owns apply and acknowledgement. Canonical facts retain separate provider outcome, apply claim/receipt and delivery ack identities. Workspace binds the existing Pi Skill Runs source, Reply and permission regions. Native, MCP, brokered Web and Zotero tools enter through existing Gateway contracts; navigation is absent for Skill Runs. No dependencies or native assets changed.

## Requirement and scenario mapping

| Requirement | Production evidence | Behavior evidence |
| --- | --- | --- |
| Durable Workflow admission and immutable mode | `piSkillRun.execute`, builtin-pi provider, request validation | 270 setup/mode failures; 33 registry; 48 Workflow origin window |
| Shared frozen v1 preparation/finalization | Shared Preparation/Finalizer, ACP orchestrator version branch | 271 preparation/provenance/legacy; 107 ACP parity; 270 frozen schema |
| Explicit single result seal and independent apply/ack | `resultDefinition`, `sealOutcome`, Workflow apply seam | 270 sealed cancel/recovery; 48/55 apply/ack; real 288 |
| Revisioned multi-question interaction and owner files | Shared interaction contract, `interactionMutation`, `submitFiles`, Reply | 261 contract limits/schema; 192 UI; 270 mixed batch, CAS, decline, files; real 288 |
| Interrupt, cancellation, original permission continuation | `interrupt`, `reply`, `cancel`, `resolvePermission` | 270 Auto suspension, cancellation during continuation, permission then questions |
| Known-owner recovery without replay | `recover`, durable starts/receipts, prepared snapshot | 270 unsafe effects, restored wait/budget/schema; real 288 sealed/wait recovery |
| Bounded shared Workspace | Pi surface, publication host/router, source registry | 258 loading-first/page-first, archive/control; 192 chrome DOM identity; 260 registry; 270 focus/attention |
| Whole-run LoopGuard | Runtime guard and Gateway dispatch reservation | 240 invocation/tool/cycle limits and persistence; 245 post-preflight counts, permission renewal; 270 restored counters |
| Distinct structured waits | Runtime turn results, owner wait transitions | 240 wait results; 270 user/permission/suspended; real 288 |

## Executed checks

- `npm run build`: passed, including main/sidebar/dashboard/synthesis TypeScript checks and browser bundle rejection of unsupported builtins.
- `npm run lint:check`: passed; final small cleanup changes also passed focused formatting/lint checks.
- `openspec validate integrate-pi-skill-runs --strict`: passed.
- `npm run test:node`: first full pass ran all 28 shards; 25 passed. Failures were outbound MCP transport unavailable (`host-bridge-runtime`), a 2-second Citation migration timeout (`tooling-runtime`), and a 30-second TypeScript alias governance timeout (`workflow-host`). This first pass is not represented as all-green.
- Independent reruns of all three failed shards passed after test-only fixes. The MCP case uses the existing official-client injection seam with Node HTTP against its real local server; production brokered HTTP safety remains covered by 262 and real-host tests. CPU-bound migration and whole-project type governance retain their assertions with 10-second and 90-second test budgets. Logs: `/tmp/c17-fix-tooling-runtime.log`, `/tmp/c17-fix-workflow-host.log`; host shard: 265 passing. Combined full-pass plus rerun evidence covers all 28 shards; no second clean full run is claimed.
- `npm run test:node -- --shard assistant`: passed, 8 files. ACP, Workflow and external SkillRunner shards passed in the full run.
- Direct 240/245/270 Mocha execution: 84 passing; after the final cleanup adjustment 240/245 passed 75 tests. Final `runtime-provider-execution` shard passed all 16 files, including owner integration, Conversation and brokered HTTP.
- Owner suite 270 after focus, attention and stale-CAS assertions: 12 passing. A rejected stale draft re-publishes the current canonical interaction batch, without merging fields. Files questions with no slot are rejected at both model and host boundaries; 261 contract tests: 11 passing. The legacy singular interaction projection is removed for Pi Skill Runs; 258 covers single/multi-question and multi-select batches rendered only through Reply.
- `npm run test:zotero:core`: Linux Zotero 9.0.6, 179 passing.
- `ZOTERO_TEST_GREP='Pi Runtime|Pi Tool Gateway|Pi Skill Runs' npm run test:zotero:core`: final production path, 49 passing after dispatch accounting and preflight cleanup fixes (earlier directed pass: 46).
- Host Bridge deterministic package check against the fixed baseline: passed. Generated workflow catalog gains builtin-pi compatibility; no semantic source deletion. Unmapped/downgraded/unauthorized dropped/intra-package duplicate counts: 0/0/0/0.

## Host Bridge generated catalog review

Fixed baseline: `24f6dabae9f5e1a9387bf03ce17c0d2ca52c13ef`. Approved deletion list: empty. Semantic source, release identities, materialized `SKILL.md` and command instructions are unchanged. The generated catalog adds `builtin-pi` to ten accepted-provider lists and updates its bundle manifest; both catalog copies have identical metrics:

| Materialized file | Baseline lines / bytes / normalized characters | Current |
| --- | --- | --- |
| `addon/content/host-bridge-skills/zotero-library-agent/references/workflow-catalog.md` | 460 / 42598 / 38878 | 460 / 42728 / 39008 |
| `profiles/hermes/zotero-librarian/skills/zotero-library-agent/references/workflow-catalog.md` | 460 / 42598 / 38878 | 460 / 42728 / 39008 |

Normalized characters exclude whitespace. Instruction line count is unchanged and prose thickness increases. Baseline package check has no hard failure, unauthorized dropped instruction, unreachable reference or new duplicate; existing CLI command-card depth advisories are outside this change. The generated help manifest changes only its build timestamp. No Host Bridge release or agent-facing prose rewrite is included.

## Official OpenSpec verification

| Dimension | Assessment |
| --- | --- |
| Completeness | 10/10 tasks; 10 requirements (9 added, 1 modified), 13 scenarios mapped to code and behavior tests. |
| Correctness | All scenarios covered. Adversarial review found and fixed actual-attempt counting, refusal staging cleanup, stale-draft publication, slot-less file questions and duplicate singular interaction projection. |
| Coherence | One deep run owner; C02 persistence, C06 context, C07 policy, C08 files and existing Workflow/Workspace owners remain authoritative. No replacement manager/store or dependencies. |

Gateway refuses the whole batch before effect when the remaining budget is insufficient, then disposes every staged preflight plan. Failed disposal persists only safe call identities in `tool_preflight_cleanup_pending`, excluded from model context. Approval renewal does not consume an attempt or resolve the renewed permission; binding-preserving approval books one attempt before effect.

## Limits

Windows/macOS, the complete supported-version matrix, live Provider smoke, full Workspace E2E, release bundle/performance thresholds and candidate-bound receipts remain C20. C18 owns audit; C19 owns startup inventory, process-level recovery/teardown and cleanup scheduling. Known-owner recovery here never automatically dispatches a model or tool. OpenViking experience retrieval timed out; no memory evidence was used.

Independent Node failure diagnosis, interaction review and Gateway cleanup review are complete. No critical issue, warning, missing requirement or uncovered scenario remains. Two main specs are synced; the change remains active and ready for archival review. No release, commit or push was performed.
