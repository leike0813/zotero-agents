# Clarify literature deep-reading skill contract

## Why

The `literature-deep-reading` skill now has packet-first stage handoffs and
submit/validate gates, but its instructions still read mostly like a stage
command manual. They do not clearly define the reader-first product goal, the
LLM/runtime responsibility boundary, general recovery rules, or the exact
subagent delegation boundary for translation batches.

That leaves room for agents to treat the skill as a report generator, a pure
translation task, or a runtime-driving script wrapper instead of a guided
paper-reading workflow.

## What changes

- Add current-state skill instructions for the reader-first task goal.
- Add explicit LLM/runtime responsibility boundaries.
- Add general safety, recovery, and packet-first notes.
- Clarify Stage 30 subagent delegation as optional batch work with main-agent
  review and submission responsibility.
- Keep runner prompt compact while preserving the same execution contract.

## Non-goals

- Do not change runtime stages.
- Do not change agent-authored payload schemas.
- Do not change packet schemas.
- Do not change final HTML semantics.
- Do not change workflow request or result-apply contracts.
