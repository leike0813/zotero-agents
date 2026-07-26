# Agent-facing Surface Semantic Parity

Baseline commit: `4b9a3b4b0fab7fdcce54571ba07dd770b4d3219f`

Unmapped semantic count: `0`

Downgraded semantic count: `0`

## Method

The baseline is the clean Git tree at the commit above. The inventory covers every governed Markdown instruction in the Minimum CLI bundle, Generic Library Agent bundle, and Hermes Librarian profile. Repeated rules in the baseline are represented once with every contributing source named. A current-state rewrite preserves the same user-visible capability, decision boundary, completion evidence, and recovery behavior while naming only the current architecture. A generated equivalent is accepted only when the generated command card exposes the complete authoritative fields.

Within one Skill package, each row has one normative owner. `SKILL.md` owns executable workflow and mandatory constraints. A reference may add domain decisions, worked paths, near misses, and recovery analysis without restating the normative paragraph.

Source abbreviations refer to paths at the baseline commit:

- `M/S` — `skills_builtin/zotero-bridge-cli/SKILL.md`
- `M/A` — `skills_builtin/zotero-bridge-cli/references/agent-guidance.md`
- `M/C` — `skills_builtin/zotero-bridge-cli/references/control-invariants.md`
- `M/I` — `skills_builtin/zotero-bridge-cli/references/identity-and-connection.md`
- `M/J` — `skills_builtin/zotero-bridge-cli/references/invocation-and-json-input.md`
- `M/O` — `skills_builtin/zotero-bridge-cli/references/output-and-recovery.md`
- `M/R` — `skills_builtin/zotero-bridge-cli/references/host-bridge-cli.md`
- `M/D/*` — the nine files below `skills_builtin/zotero-bridge-cli/references/commands/`
- `G/S` — `skills_builtin/zotero-library-agent/SKILL.md`
- `G/R` — `skills_builtin/zotero-library-agent/references/task-routing.md`
- `G/W` — `skills_builtin/zotero-library-agent/references/workflow-execution.md`
- `G/E` — `skills_builtin/zotero-library-agent/references/evidence-handoff.md` and `helper-script-contract.md`
- `G/J/*` — the eight files below `skills_builtin/zotero-library-agent/references/journeys/`
- `H/S` — `profiles_src/hermes/zotero-librarian/skills/zotero-librarian/SKILL.md`
- `H/P` — baseline profile `README.md`, `SOUL.md`, and `references/operating-principles.md`
- `H/R/*` — all other baseline Librarian references, including resident, scheduling, monitoring, workflow, maintenance, and common-task documents
- `H/A` — baseline `zotero-workflow-agent-runner/SKILL.md` and its playbook

## Minimum semantic units

| ID | Baseline sources | Canonical meaning | New owner | Preservation |
| --- | --- | --- | --- | --- |
| MIN-001 | M/S, M/I | Select one run-local or installed executable and never mix release assets | `skills_src/zotero-bridge-cli/SKILL.md#executable-and-profile-selection` | retained |
| MIN-002 | M/S, M/I, M/R | Compare protocol, CLI schema, version, fingerprint, and catalog checksum before relying on the contract | `SKILL.md#workflow` | retained |
| MIN-003 | M/I, M/A | Preserve profile/endpoint/scope/mode inputs and keep the bearer token secret | `SKILL.md#executable-and-profile-selection` | retained |
| MIN-004 | M/S, M/I, M/D/connectivity-context | Distinguish offline surface identity from live service/backend reachability | `SKILL.md#executable-and-profile-selection` | retained |
| MIN-005 | M/I, M/A, M/D/connectivity-context | Diagnose service, redacted profile, authenticated manifest, backend, then domain state | `SKILL.md#executable-and-profile-selection` | retained |
| MIN-006 | M/S, M/A, M/R | Use search for operational discovery, describe for the selected exact contract, and raw call only for unmatched diagnostics | `SKILL.md#command-discovery-and-invocation` | retained |
| MIN-007 | M/J, M/A, M/R | Keep scalar flags, inline JSON, file/@file/stdin inputs, workflow options, and provider profile in declared channels | `SKILL.md#command-discovery-and-invocation` | retained |
| MIN-008 | M/J, M/A, M/D/library-items | Preserve accepted pages and resume from the last cursor or offset without duplicate merging | `SKILL.md#identity-paging-and-freshness` | retained |
| MIN-009 | M/S, M/A, M/D/connectivity-context | Resolve deictic UI context and treat navigation as visible-state change rather than bibliographic mutation | `SKILL.md#identity-paging-and-freshness` | retained |
| MIN-010 | M/A, M/D/library-items | Distinguish relevance search, deterministic list, item detail, and snapshot semantics | Generic Query playbook plus generated command cards | current-state rewrite |
| MIN-011 | M/A, M/D/library-notes-attachments-readiness | Preserve note chunking, payload discovery, annotation records, readiness scope, and attachment access distinctions | Generic Query playbook plus generated command cards | current-state rewrite |
| MIN-012 | M/C, M/D/mutations-files-products | Keep local paths, file handles, Product IDs, workflow artifacts, and Zotero attachments distinct | `SKILL.md#files-products-and-artifacts` | retained |
| MIN-013 | M/A, M/D/mutations-files-products | Verify upload/download checksums and live attachment state around file writeback | `SKILL.md#files-products-and-artifacts` | retained |
| MIN-014 | M/A, M/D/mutations-files-products | A terminal workflow does not prove a Product; inspect and download the chosen asset | `SKILL.md#files-products-and-artifacts` | retained |
| MIN-015 | M/S, M/C, M/D/mutations-files-products | Direct writes require resolved targets, declared effects, Zotero-side approval, receipts, and live verification | `SKILL.md#effects-approval-and-handles` plus Generic Curation | retained |
| MIN-016 | M/S, M/A, M/D/workflows-and-runs | Separate workflow-owned selection/options from backend-owned provider profiles and join only at submission | `SKILL.md#workflow-and-run-control` | retained |
| MIN-017 | M/A, M/D/workflows-and-runs | Validate current workflow execution mode before choosing Zotero-managed or self-owned execution | `SKILL.md#workflow-and-run-control` | retained |
| MIN-018 | M/A, M/D/workflows-and-runs | Monitor Zotero-managed runs by workflow/skill/permission/event typed handles and verify deliverables | `SKILL.md#workflow-and-run-control` | retained |
| MIN-019 | M/A, M/D/workflows-and-runs | Inspect every self-owned request contract, validate results, apply one mapping, and recover from the apply receipt | `SKILL.md#workflow-and-run-control` plus Generic coordinator reference | retained |
| MIN-020 | M/C, M/D/workflows-and-runs | Permission reads are observational; notifications are lifecycle signals rather than transcripts or authority | `SKILL.md#workflow-and-run-control` | retained |
| MIN-021 | M/C, M/O | Treat returned identifiers as opaque typed handles and honor consumption state | `SKILL.md#effects-approval-and-handles` | retained |
| MIN-022 | M/C, M/O | Preserve retryability, state change, handle consumption, safe actions, and next command | `SKILL.md#failure-handling` | retained |
| MIN-023 | M/O, G/J/agent-owned-handoff | Use durable operation/apply receipts for uncertain or partial state and never replay successful work | `SKILL.md#failure-handling` | retained |
| MIN-024 | M/C, M/A | Preserve sanitized commands, refs, locators, cursors, receipts, checksums, outputs, and privacy boundaries as evidence | `SKILL.md#workflow` and Generic result guidance | retained |
| MIN-025 | M/A, M/D/synthesis-topics-artifacts | Distinguish topic, artifact, concept, schema, and their evidence/freshness roles | Generic Query and Synthesis playbooks | current-state rewrite |
| MIN-026 | M/A, M/D/synthesis-graph | Distinguish graph overview, slice, layout, metrics, cluster, rankings, update, and metric repair | Generic Synthesis playbook | current-state rewrite |
| MIN-027 | M/A, M/D/synthesis-index-resolver-insights | Distinguish derived indexes, resolver selectors, attention queue, and cache/index status | Generic Query and Synthesis playbooks | current-state rewrite |
| MIN-028 | M/A, M/D/synthesis-* | Keep sidecar refresh, graph update, metric refresh, cache invalidation, scopes, basis hashes, operation IDs, and receipts separate | `SKILL.md#synthesis-operation-boundaries` plus Generic Synthesis | retained |
| MIN-029 | M/D/diagnostics, M/R | Use debug and repair operations only after normal diagnostics and with the exact diagnosed scope | `SKILL.md#effects-approval-and-handles` | retained |
| MIN-030 | M/R, M/D/* | Publish every command's argv, schemas, pagination, effects, approval scope, handles, recovery, targets, aliases, and search visibility | generated `references/command-reference.md` | generated-equivalent |

## Generic semantic units

| ID | Baseline sources | Canonical meaning | New owner | Preservation |
| --- | --- | --- | --- | --- |
| GEN-001 | G/S, G/R | Route by bounded research outcome rather than command family | coordinator `SKILL.md` and `research-task-model.md#routing-decisions` | retained |
| GEN-002 | G/S, G/J/research-lifecycle | Compose only declared task stages and preserve stage-specific evidence and authority | coordinator `SKILL.md#workflow` and model `#task-composition` | retained |
| GEN-003 | G/J/current-context-and-library-read | Resolve current selection, distinguish search/list/detail/snapshot, and preserve paging evidence | Query playbook | retained |
| GEN-004 | G/J/notes-attachments-and-readiness | Handle note chunks/payloads, annotations, attachments, file delivery, and readiness without implicit remediation | Query playbook | retained |
| GEN-005 | G/R, G/J/synthesis-research-context | Choose the appropriate topic/graph/index/resolver/artifact model and record freshness | Query and Synthesis playbooks | retained |
| GEN-006 | G/J/concrete-writeback | Inspect, preview, approve, execute, receipt-check, and live-verify concrete writeback | Curation `SKILL.md` and playbook | retained |
| GEN-007 | G/J/products-and-files | Keep local path, file handle, Product, workflow artifact, and attachment identities and completion evidence separate | coordinator model and Curation playbook | retained |
| GEN-008 | G/W, G/J/host-owned-workflow | Describe/validate workflow and provider profile independently, submit supported mode, monitor typed handles, and verify outputs | coordinator model `#workflow-execution-ownership` | retained |
| GEN-009 | G/W, G/J/agent-owned-handoff, G/E | Inspect self-owned requests, execute each contract, validate results, apply the complete mapping, and audit durable status | coordinator model `#agent-owned-handoff` | retained |
| GEN-010 | G/E | Local bundle/result validation proves structure, not semantic correctness or authority | coordinator model `#agent-owned-handoff` | retained |
| GEN-011 | G/E | Preserve stable subjects, workflow handles, artifact checksums, writeback state, and privacy across task boundaries | coordinator model `#evidence-files-and-products` | current-state rewrite |
| GEN-012 | G/S, G/E | Return one machine-readable result with truthful completed/canceled/failed meanings and inline evidence/artifacts/diagnostics | every Generic `SKILL.md` plus shared schema | current-state rewrite |
| GEN-013 | G/J/research-lifecycle | Preserve ordered search/ingest, analysis, sidecar, graph, topic, and export stage evidence | coordinator model `#multi-stage-research-lifecycle` | retained |
| GEN-014 | G/J/research-lifecycle | Resume at the first missing stage and never replay earlier mutation because a later stage failed | coordinator model `#recovery-and-near-misses` | retained |
| GEN-015 | G/R, G/J/current-context-* | Current object identity and freshness outrank title, cache, search candidate, or earlier result | coordinator and Query hard constraints | retained |
| GEN-016 | G/R, G/J/host-owned-workflow | Terminal run state does not prove expected Product, artifact, or item effect | coordinator and task completion contracts | retained |
| GEN-017 | G/R, G/W | New research scope, workflow submission, apply-back, and non-reversible writes introduce explicit decision boundaries | coordinator workflow and hard constraints | retained |
| GEN-018 | G/J/research-lifecycle, H/R/common-tasks | Acquisition preserves provenance, duplicates, target collection, attachments, and per-item outcomes | Acquisition Skill and playbook | current-state rewrite |
| GEN-019 | G/J/research-lifecycle, H/R/common-tasks | Analysis distinguishes source depth, artifacts, comparison dimensions, per-paper success, and writeback | Analysis Skill and playbook | current-state rewrite |
| GEN-020 | G/J/synthesis-research-context, H/R/common-tasks | Synthesis preserves model provenance, disagreement, gaps, maintenance boundaries, and export evidence | Synthesis Skill and playbook | current-state rewrite |
| GEN-021 | G/J/concrete-writeback, H/R/common-tasks | Curation preserves correction sources, batching, file/Product paths, partial outcomes, and verification | Curation Skill and playbook | current-state rewrite |
| GEN-022 | G/S, G/R | Finite tasks do not schedule, poll indefinitely, or become resident maintenance | coordinator hard constraints | retained |

## Hermes semantic units

| ID | Baseline sources | Canonical meaning | New owner | Preservation |
| --- | --- | --- | --- | --- |
| HER-001 | H/P | Use a calm librarian posture that distinguishes cached leads, live facts, proposals, and completed work | `profiles_src/.../SOUL.md` | retained |
| HER-002 | H/P, H/S | Install the packaged CLI/profile without changing HOME, protect credentials, and verify complete identity | profile `README.md` and state/recovery reference | retained |
| HER-003 | H/S, H/R/resident-index | Use the resident index for discovery, record freshness, and live-confirm current external claims | Librarian `SKILL.md` and resident operations | retained |
| HER-004 | H/R/resident-index, H/R/library-maintenance | Refresh the complete snapshot atomically and retain usable state on failure | state/recovery and resident operations | current-state rewrite |
| HER-005 | H/R/profile-script-contracts | Deterministic scripts own paging, local state updates, plan files, and stable output; the agent owns semantic judgment | Librarian responsibility boundary | current-state rewrite |
| HER-006 | H/R/profile-script-contracts | Expose one bounded resident entrypoint for index, catalog, run, notification, maintenance, and attention operations | resident operations matrix | current-state rewrite |
| HER-007 | H/R/scheduled-jobs | Keep seven scheduled jobs independent, one-pass, quiet only when unchanged, and visible on attention/failure | resident operations `#scheduled-passes` | retained |
| HER-008 | H/R/scheduled-jobs, H/R/library-maintenance | Scheduled triage, hygiene, and attention produce proposals rather than remediation | Librarian hard constraints and automation policy | retained |
| HER-009 | H/R/monitoring-and-notifications | Watch each registered non-terminal Zotero-managed run once and retain transitions | resident operations `#workflow-catalog-and-run-supervision` | retained |
| HER-010 | H/R/monitoring-and-notifications | Sync bounded notification pages, inspect live targets, and acknowledge only handled events | resident operations `#notifications` | retained |
| HER-011 | H/R/workflow-execution-policy, H/S | Discover current workflows, validate selection/options and provider profiles, choose execution mode, and preserve completion evidence | inherited Generic model plus automation policy | retained |
| HER-012 | H/R/workflow-execution-policy | Default workflow concurrency to one; require explicit bounded authority for more | Librarian `SKILL.md` and automation policy | retained |
| HER-013 | H/R/profile-script-contracts | Persist a deterministic reviewed workflow plan before submission | Librarian `SKILL.md` and automation policy `#plan-and-submit` | current-state rewrite |
| HER-014 | H/R/scheduled-jobs, H/R/workflow-execution-policy | Cron cannot submit; an interactive submit requires current authority and does not replace Zotero approval | Librarian hard constraints and authority matrix | retained |
| HER-015 | H/A, H/S | Self-owned workflow requests retain typed handles, local validation, apply-back, and receipt recovery | inherited Generic coordinator model | current-state rewrite |
| HER-016 | H/R/monitoring-and-notifications, H/A | Never monitor self-owned agent runs through the Zotero-managed run plane | Librarian hard constraints and Generic handoff | retained |
| HER-017 | H/R/library-maintenance | Report workflow-status, duplicate-title hygiene, and Synthesis attention candidates with reasons and next checks | resident operations and automation policy | current-state rewrite |
| HER-018 | H/R/maintenance-and-recovery | Diagnose cache/index/graph/metric scopes and preserve operation IDs, approval, pre/post state, and retryability | inherited Synthesis Skill plus state/recovery | retained |
| HER-019 | H/R/maintenance-and-recovery, H/R/output-and-recovery | Query live durable state before repeating uncertain changes or consumed handles | state/recovery `#handle-and-uncertain-outcomes` | retained |
| HER-020 | H/R/workflows, H/S | Use live workflow discovery and descriptions rather than treating a static catalog as execution authority | resident operations and automation policy | current-state rewrite |
| HER-021 | H/P, H/S, H/R/common-tasks | Delegate finite literature search, analysis, synthesis, curation, and writeback judgment to task-owned policy | Librarian routing plus inherited Generic Skills | current-state rewrite |
| HER-022 | H/S, H/R/output-and-recovery | Return traceable item/topic/workflow/run/file/artifact evidence and structured failures | Librarian completion/failure contracts | retained |

## Coverage conclusion

Every unique execution-relevant baseline semantic unit has one current owner or a complete generated equivalent. Removed implementation entities are represented by their current capability owners: the resident service replaces the three profile helpers, Generic owns self-owned handoffs, the inline task result replaces a separate evidence file, live workflow discovery replaces the static catalog, and the generated command reference replaces repeated command-family manuals without losing descriptor fields.
