# Host Bridge Semantic Review Operations

## Composition and ownership

`host-bridge/surfaces.json` is the source of truth for the three surfaces. Resolve it with `scripts/host-bridge-surface-model.ts` before reviewing ownership, inherited Skills, mounts, source roots, generated roots, or surface patch versions.

| Layer | Surface | Owns | Does not own |
| --- | --- | --- | --- |
| Minimum-core | `zotero-bridge-cli` | Exact CLI operations, schemas, handles, approvals, recovery, and partitioned generated command references | Research-task selection and resident automation policy |
| Generic | `zotero-library-agent` | Coordinator plus query, acquisition, analysis, synthesis, and curation task policy | CLI command catalog and unattended maintenance |
| Hosted | `zotero-librarian` / Hermes | Resident state, one-pass service operations, scheduled supervision, notification/run monitoring, and automation authority | Replacement copies of Generic task playbooks or CLI instructions |

## Contracts and sources

Review behavior changes in Host Bridge modules, CLI command implementations, `schemas/host-bridge.agent-surface.v4.schema.json`, the v4 agent-surface descriptor, workflow declarations, and relevant OpenSpec specifications.

Review composition and rendering changes in `host-bridge/surfaces.json`, `scripts/host-bridge-surface-model.ts`, `scripts/render-host-bridge-surfaces.ts`, `scripts/host-bridge-workflow-catalog.ts`, `scripts/materialize-host-bridge-surfaces.ts`, `scripts/check-host-bridge-skill-packages.ts`, release-set scripts and schemas, and the Host Bridge release workflow. Review catalog/runtime parity in `src/workflows/manifestContract.ts`, the runtime workflow-control projection, and the official manifests under `workflows_builtin/`.

`cli/zotero-bridge/release.json` supplies the CLI identity. Surface versions use its major.minor line plus each surface's `patch` in the manifest; exact component and payload digests distinguish the corresponding bytes.

Read the manifest-resolved source roots:

- Minimum-core: `skills_src/zotero-bridge-cli/SKILL.md` and all references it links directly.
- Generic coordinator: `skills_src/zotero-library-agent/skills/zotero-library-agent/SKILL.md`, its directly linked research-task model and built-in workflow catalog, and its runner contract.
- Generic task contracts: `skills_src/zotero-library-agent/shared/output.schema.json` and `shared/task-runner.template.json`.
- Generic task Skills: `zotero-library-query`, `zotero-literature-acquisition`, `zotero-literature-analysis`, `zotero-research-synthesis`, and `zotero-library-curation` beneath `skills_src/zotero-library-agent/skills/`.
- Hermes: `profiles_src/hermes/zotero-librarian/SOUL.md`, `README.md`, `skills/zotero-librarian/SKILL.md`, its direct references, and `scripts/zotero_librarian_service.py`.

Never edit generated targets as semantic sources. The unified renderer and materializer own the generated roots in the manifest, release-set envelopes, generated command references, and `doc/` outputs.

## Review procedure

1. Read the changed behavior contract before its guidance.
2. Resolve every affected surface and inherited Skill from the manifest.
3. When the active change declares a semantic baseline, read its parity matrix. Collapse repeated baseline wording into one meaning while retaining every source location. Check goals, triggers, distinctions, procedures, constraints, evidence, completion, failures, recovery, examples, and near misses.
4. Require each baseline meaning to name exactly one current owner in the same Skill package, or a generated equivalent whose fields can be verified. A current-state rewrite must preserve capability, decision boundary, completion evidence, and recovery behavior; an implementation rename is not a reason to discard semantics.
5. Compare command identity, inputs, result schema, typed handles, approval requirements, state effects, safe recovery, workflow ownership, and result or receipt status.
6. For minimum-core, verify exact command facts come from the CLI contract, every canonical command root belongs to exactly one declared partition, every command appears once, every public descriptor field reaches its generated command card, and no research workflow is presented as an operational requirement.
7. For Generic, verify the coordinator routes one bounded objective to the appropriate task Skill. Each of the six Skills must independently define `zotero-library-task.result.v1`, inline evidence, the three status meanings, and the LLM/tool responsibility boundary. A simple task must begin from `SKILL.md` without a mandatory reference read. Each task playbook must add a comprehensive named complex domain rather than act as a thin prerequisite. Cross-task workflow and handoff policy belongs to the coordinator contract and research-task model; official built-in inventory and static invocation facts belong to the generated workflow catalog.
8. For Hermes, verify the resident service is the single state owner, every operation is one pass, cron cannot submit, finite task policy is inherited, and live Zotero facts outrank local cache state.
9. Within each Skill package, mark the normative owner of every rule. `SKILL.md` holds executable workflow and hard constraints; references may analyze scenarios and consequences but must not repeat the rule. Check exact duplicates with the package validator and paraphrased duplicates semantically.
10. Check cross-layer wording for duplicated command facts, duplicated task policy, hidden authority, or a lower layer referring to policy it does not own.

## Skill-package gate

For every affected package, confirm the frontmatter description states what it does and when to call it in one concise line. Confirm `SKILL.md` contains Goal, Inputs, Workflow, Hard constraints, Completion, Failure handling, and References. Confirm every file beneath `references/` is linked directly from `SKILL.md`, that no execution-critical constraint lives only in a reference, and that the primary workflow does not require an optional reference before its first action.

Run the deterministic gate after source review:

```sh
npx tsx scripts/check-host-bridge-skill-packages.ts <manifest-resolved-skill-root> [...]
```

The gate checks structure, reachability, current-state wording, exact substantive prose duplication, and materialized instruction depth. A materialized `SKILL.md` shorter than 100 lines or reference shorter than 200 lines is a hard error. A materialized `SKILL.md` shorter than 200 lines or reference shorter than 350 lines is reported in the structured `host-bridge.instruction-depth-warnings.v1` advisory output. Apply these thresholds to rendered or materialized packages, not compact source templates that are expanded by a renderer. The reviewer remains responsible for semantic parity, paraphrased overlap, command-policy separation, reference depth, and evidence semantics.

## Semantic parity and reference depth

A parity review is complete only when the declared matrix names its baseline commit and reports zero unmapped and downgraded semantic units. Inspect the baseline directly with `git show <baseline>:<path>` when a matrix row is broader than the original instructions or when its destination appears thinner.

Treat a reference as comprehensive only when it covers one coherent decision domain with entry conditions, choices, full procedure branches, completion evidence, failure/recovery, and representative near misses. A short reminder, glossary fragment, list of edge cases, or text that every live execution must read belongs in `SKILL.md` or must be expanded. Depth thresholds are triage signals rather than proof: hard floors reject unmistakably thin materialized instructions, while advisory warnings require the reviewer to inspect the complete semantic domain and record whether the file is accepted or expanded.

A generated equivalent must expose the complete authoritative data needed by the agent. For the CLI command references, this includes argv bindings, invocation/payload/result schemas, pagination, effects and state change, approval scope, handle transitions, recovery/next command, targets, aliases, and intent-search visibility. The partitions must be exhaustive and disjoint by canonical command root, and `SKILL.md` must map each root to its directly linked reference.

For the built-in workflow catalog, verify that every official manifest not marked `debug_only` appears exactly once and that debug-only workflows do not appear. Each entry must expose purpose, manifest/package identity, provider requirements, execution modes, selection facts, required options and parameters, and result evidence from the shared manifest projection. The catalog must direct agents to live list, describe, validation, and submission commands as runtime authority rather than freezing availability or readiness claims.

## Boundary and failure decisions

Block the review when a requested behavior could move command facts into Generic, put task policy into minimum-core, make Hermes perform unattended writes, let a reference become the only source of a hard constraint, or leave result/receipt ownership ambiguous.

Generic returns task results. Hermes returns resident operation receipts. A generated artifact, completed workflow run, or local cache entry does not independently prove current Zotero state.

If a required behavior, source, schema, or ownership decision is unavailable, preserve the affected path and surface in the blocker and stop before rendering. Do not fill the gap with inferred argv, handles, approvals, receipts, or generated output.

## Completion and handoff

If source guidance changed, report the files and request the unified renderer, Skill-package gate, and documentation checks. If guidance is already aligned, state why no source edit is required. A generated-only change requires render-drift investigation, not a semantic rewrite.

Return this shape:

```text
semantic review ran: yes
context reviewRequired: true|false
baseline commit: <commit or not-applicable>
semantic source edits: <file list or none>
minimum-core result: aligned|blocked
Generic result: aligned|blocked
Hermes result: aligned|blocked
Skill-package result: aligned|blocked
semantic parity result: aligned|blocked
unmapped semantic count: 0|<count>
downgraded semantic count: 0|<count>
intra-package duplicate count: 0|<count>
reference-depth result: aligned|blocked
instruction-depth warnings: none|<warning and accepted-or-expanded disposition>
agent control contract result: aligned|blocked
release identity result: aligned|blocked
alignment result: aligned|edits applied|blocked
next commands: <renderer and checks>
blocker: <only when blocked>
```

The semantic reviewer may edit source guidance. It must not render generated targets, prepare or publish a release, dispatch workflows, or change prebuild state. The release pipeline owns those actions after a non-blocked handoff.
