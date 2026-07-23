---
name: host-bridge-semantic-surface-review
description: Review Host Bridge's three agent-facing surfaces against their operational contracts. Use when Host Bridge behavior, surface composition, Skill guidance, or release identity changes before rendering governed content.
---

# Host Bridge Semantic Surface Review

## Goal

Verify that the minimum-core CLI, Generic research-task suite, and Hermes hosted facet have complete, non-overlapping current guidance that matches the Agent Control Contract, preserves the declared semantic baseline without downgrade, and follows the surface manifest.

## Inputs

- The current working tree and changed-file context.
- `host-bridge/surfaces.json`, CLI release identity, and affected behavior or OpenSpec contracts.
- The source Skill packages and hosted facet sources named by the surface map.
- The baseline commit and semantic-parity matrix declared by the active surface-design change when a structural rewrite is in scope.

## Workflow

1. Run the read-only collector from the repository root:

   ```sh
   npx tsx scripts/host-bridge-semantic-review-context.ts
   ```

2. Read [review operations](references/review-operations.md). Select every changed source and contract required by the returned focus.
3. Resolve affected surfaces from `host-bridge/surfaces.json`. Check that minimum-core owns exact CLI facts, Generic owns bounded research-task policy, and Hermes owns resident automation policy.
4. Check each governed Skill as an executable contract: `SKILL.md` contains goal, process, hard constraints, completion, and failure handling; all references are directly linked; no required constraint is only in a reference.
5. For a rewrite, compare every unique baseline goal, decision, procedure, constraint, evidence rule, completion condition, failure path, recovery rule, and near miss with the semantic-parity matrix. Require one current owner or a complete generated equivalent.
6. Check package-local uniqueness: `SKILL.md` owns normative workflow and constraints; references add domain decisions and examples without repeating the same meaning. Run the deterministic duplicate gate after semantic review.
7. Run the materialized package depth gate. Treat hard failures as blockers. Review every item in the structured instruction-depth warnings and record whether its content is accepted or expanded; a warning may not disappear silently from the handoff.
8. Compare guidance with the current command contract, handles, approvals, recovery, workflow ownership, result contracts, component composition, and release identity.
9. Edit only source guidance when it is incomplete, duplicated, downgraded, or would lead an agent to cross a boundary or misstate a result. Then hand off using the return contract in [review operations](references/review-operations.md).

## Hard constraints

- Treat `host-bridge/surfaces.json` as the composition source of truth and resolve inheritance before judging a surface.
- Keep operational command facts in minimum-core, research-task semantics in Generic, and resident automation policy in Hermes; do not duplicate them across layers.
- Treat `SKILL.md` as the minimum complete execution contract. References expand detail but never contain the only required hard constraint.
- A rewritten surface must be a semantic superset of its declared clean baseline after baseline duplicates are collapsed. No valid semantic unit may be omitted or weakened into a summary.
- Within one Skill package, assign every semantic rule one normative owner. Do not duplicate the same instruction between `SKILL.md` and references or across references.
- Enforce materialized instruction-depth floors without confusing them for semantic proof: a `SKILL.md` below 100 lines or a reference below 200 lines blocks; a `SKILL.md` below 200 lines or a reference below 350 lines produces an instruction-depth warning that the reviewer must explicitly accept or expand.
- Use current behavior only. Do not add compatibility, migration, or historical wording to governed instructions.
- Do not edit generated targets, publish releases, dispatch workflows, synchronize prebuilds, or make release-version decisions during semantic review.

## Completion

Return the following fields: semantic review ran; context reviewRequired; baseline commit; semantic source edits; minimum-core result; Generic result; Hermes result; Skill-package result; semantic parity result; unmapped semantic count; downgraded semantic count; intra-package duplicate count; reference-depth result; instruction-depth warnings and their accepted-or-expanded disposition; Agent Control Contract result; release identity result; alignment result; next commands; and blocker only when blocked. Finish only when all three counts are zero, every warning is accepted or expanded with a reason, and every applicable result is aligned or corrected, or when a named unresolved contract makes the review blocked.

## Failure handling

When a behavior, ownership boundary, result contract, or source of truth cannot be confirmed, report `blocked`, name the uncertain contract and affected surface, and stop before rendering or release preparation. Do not infer command syntax, approvals, handles, or generated contents. A blocked review is terminal until that contract or source changes.

## References

Read [review operations](references/review-operations.md) before selecting sources, comparing the three surface contracts, running gates, or handing the review to release preparation.
