# Proposal: Refine Topic Synthesis Skill Stages and Contract Alignment

## Summary

Split the heaviest topic synthesis cross-paper analysis step into smaller gated
actions, package the topic content contract as skill-local references, and align
the skill/runtime/schema/frontend contracts with the target structured artifact
shape.

## Motivation

The current create/update topic synthesis skills put too much semantic work into
one cross-paper step. The gate can only provide coarse instructions, so agents
are more likely to skip details or produce shallow sections. The new topic
content contract also requires `taxonomy.summary` and object-shaped
`timeline_events`, but the skill schemas, validators, and UI readers still
mostly assume the older shape.

## Change

- Add package-local content-contract references for both create/update skills.
- Split Stage 5 into separate gated authoring actions for evidence map,
  route/timeline synthesis, core analytic sections, and external/statistics/report
  sections.
- Require `taxonomy.summary` and `timeline_events: { summary, events }` in new
  structured topic synthesis outputs.
- Update runtime/host validation and topic detail reading to use the new shape.

## Out of Scope

- Redesigning citation graph metrics, MCP smoke, product storage, or sync.
- Migrating all historical topic artifacts in place.
- Auto-generating substantive semantic prose in runtime scripts.
