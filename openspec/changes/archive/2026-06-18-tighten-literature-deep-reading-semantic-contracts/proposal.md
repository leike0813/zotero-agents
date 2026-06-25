# Tighten literature deep-reading semantic contracts

## Why

`literature-deep-reading` has a reader-first workflow, packet-first handoffs, and
submit/validate gates, but the agent-authored payload schemas still allow
semantically empty or overly generic submissions. A payload can be structurally
valid while missing core reading goals, concept definitions, reference roles, or
the intent behind Host context requests.

Stage 30 instructions also repeat many checks that the runtime already performs
deterministically, which wastes tokens and can distract the main agent from the
actual merge-and-repair responsibility.

## What changes

- Tighten Stage 10 context request schema and runtime cross-field validation.
- Tighten Stage 20 reading enrichment schema and runtime semantic minimums.
- Keep citation reference roles as free-form semantic labels, while documenting
  recommended examples from `literature-analysis`.
- Tighten Stage 30/40 static schema and final-review consistency checks.
- Compress Stage 30 instructions to rely on batch prompt output, runtime
  validation, and targeted repair by returned errors.

## Non-goals

- Do not add, remove, or reorder runtime stages.
- Do not change final HTML rendering semantics.
- Do not change workflow request or result apply contracts.
- Do not make agent payloads contain runtime audit fields.
- Do not add hard enum validation for `citation_reference_roles[].role`.
