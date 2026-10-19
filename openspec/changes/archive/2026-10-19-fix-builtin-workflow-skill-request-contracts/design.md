# Design

## Context

See proposal.md for the failure. Workflow and Skill contracts are separate projections: workflow parameters describe forms; Skill schemas govern callable input. The sequence runtime intentionally inherits root parameters. The topic renderer owns generated Skill schema definitions. Existing sidecar evidence measures a different boundary.

## Goals / Non-Goals

**Goals:** restore existing entry behavior and exercise all builtin producers at the Workflow-to-Skill seam.

**Non-Goals:** change workflow request kinds, strip parameters at admission, weaken strict schemas, contact external agents, publish content or alter native protocols.

## Decisions

- Keep the topic renderer as the schema source. Create preparation uses conditional requiredness: true planned mode requires plannedTopicId; omitted/false mode requires topicSeed. Inactive selector strings may be empty. Core/finalize accept inherited create fields as well as update topicId; update preparation remains unchanged.
- Add only schemas for namespaces actually used by builtin producers. The confirmed omission is Tag Bootstrapper's optional string tag_note_language. Its default remains in the existing consumer. Unused namespaces need no placeholder schema.
- Add the missing form required flags, retaining the existing Skill contracts. Improve the shared AJV formatter with property-name context; keep its string-array API and omit values.
- Use one Node test inventory derived from workflow package declarations. A test-only helper adapts concrete jobs and executes production sequences with provider stubs that validate before returning synthetic handoffs. Use existing Zotero mock and local temporary files for producer host facts and file preparation. Run real hooks, including preflight; do not replace production request builders.
- Scenarios cover each builtin producer, full parameter values and request-shape branches (analysis tagging/score-only, deep-reading alignment reuse, metadata preflight, debug optional steps, topic entry). Require schemas for nonempty namespaces. Record non-Skill workflows and unused namespaces separately. Keep the new suite in the existing workflow-engine shard.
- Replace obsolete renderer field-roster assertions with behavior cases against both generated temporary packages and committed packages. Existing runtime/sequence tests remain separate evidence and are rerun.

## Risks / Trade-offs

- Host fixtures can mask request bugs: keep builders/sequence expansion/adapters/validators real and fail closed on unsupported host calls.
- Synthetic Agent results do not prove model behavior: evidence claims end at request admission and use schema-valid handoff fixtures.
- Installed official content remains unchanged: deliver source changes through a separately governed content release after local verification.

## Migration Plan

No user-data migration is needed. Render generated packages into a temporary directory and apply the three schema changes with the builtin editor. Content publication is separate from this implementation.
