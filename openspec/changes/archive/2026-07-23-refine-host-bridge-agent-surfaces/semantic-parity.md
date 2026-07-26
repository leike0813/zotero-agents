# Agent-facing Surface Refinement Parity

Historical clean baseline: `4b9a3b4b0fab7fdcce54571ba07dd770b4d3219f`

Refinement clean baseline: `5caa6224b99bf91a4bea3c38576c0c0377ddbb43`

Unmapped semantic count: `0`

Downgraded semantic count: `0`

Intra-package duplicate count: `0`

## Preservation method

The historical matrix in the archived redesign change remains the complete inventory of pre-redesign meanings. This refinement additionally treats every unique current meaning at the refinement baseline as mandatory. A meaning is preserved only when its current owner retains the capability, decision boundary, procedure, evidence, completion condition, and recovery behavior.

Generated equivalents are compared by structured fields, not prose or file count. Moving a mandatory rule into an optional reference is a downgrade. Moving a detailed branch into `SKILL.md` requires removing its duplicate statement from the reference.

## Minimum mapping

| Domain | Baseline owner | Refined owner | Result |
| --- | --- | --- | --- |
| Executable/profile selection, identity, connection diagnosis | Minimum `SKILL.md` | Minimum `SKILL.md` | retained |
| Command discovery, invocation channels, paging, freshness | Minimum `SKILL.md` | Minimum `SKILL.md` | retained |
| Effects, approval, typed handles, files, Products, artifacts | Minimum `SKILL.md` | Minimum `SKILL.md` | retained |
| Zotero-managed and self-owned workflow/run control | Minimum `SKILL.md` | Minimum `SKILL.md` | retained |
| Synthesis operation boundaries and durable recovery | Minimum `SKILL.md` | Minimum `SKILL.md` | retained |
| Complete fields for all 122 commands | one generated command reference | eight exhaustive generated partitions | retained |
| Selective offline lookup | one mandatory large reference | one directly linked partition selected by command root | expanded |

## Generic mapping

| Domain | Baseline owner | Refined owner | Result |
| --- | --- | --- | --- |
| Bounded routing and composition | coordinator Skill/model | coordinator `SKILL.md`; model for complex composition | retained |
| Zotero-managed execution and self-owned handoff | coordinator model | coordinator core contract plus optional model depth | retained |
| Cross-task evidence, Product/file/artifact identity, staged recovery | coordinator model | coordinator core contract plus optional model matrices | retained |
| Query context, search/list/detail, paging, notes, attachments, readiness, Synthesis reads | Query Skill/playbook | Query core contract plus expanded optional playbook | expanded |
| Acquisition scope, provenance, duplicates, import, attachment, readiness | Acquisition Skill/playbook | Acquisition core contract plus expanded optional playbook | expanded |
| Source levels, analytical procedure, comparison, workflow artifacts | Analysis Skill/playbook | Analysis core contract plus expanded optional playbook | expanded |
| Synthesis models, freshness, maintenance, basis hash, staged lifecycle | Synthesis Skill/playbook | Synthesis core contract plus expanded optional playbook | expanded |
| Mutation proposals, files, Products, receipts, partial outcomes | Curation Skill/playbook | Curation core contract plus expanded optional playbook | expanded |
| Static built-in workflow selection facts | historical 19-entry Agent Surface catalog; absent at refinement baseline | Generic coordinator workflow catalog | restored and expanded |
| Live workflow availability and actual contract | live list/describe | live list/describe | retained |

## Hosted mapping

Hermes-owned resident policy and source files are unchanged. It inherits the refined Minimum and Generic bytes through `host-bridge/surfaces.json`; its live workflow catalog cache remains runtime state and does not replace the Generic built-in selection catalog.

## Acceptance

- Every command appears in exactly one generated partition with every public descriptor field.
- Every Generic Skill starts, completes, and handles first failure from `SKILL.md` alone.
- References are directly linked and scenario-triggered, with no mandatory startup read.
- The generated catalog contains every official non-debug built-in workflow and no debug-only workflow.
- The package validator and semantic review report zero missing, downgraded, or duplicated meanings.
