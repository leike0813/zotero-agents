# Design

## Instruction boundary

This change updates the skill-level execution contract only. The runtime
continues to own deterministic state, packet generation, validation, and final
rendering. Agent-authored payloads remain the semantic decision surface.

## Reader-first goal

The skill instructions should frame the output as a self-contained HTML reading
experience for the current paper. The source paper remains primary. Translation,
topic context, citation graph, reference digests, and concept explanations are
supporting layers used to improve reading, not separate deliverables.

## Responsibility split

The LLM must handle semantic and scholarly decisions:

- paper understanding and reading strategy
- Host context request intent
- preface and section reading guidance
- concept explanation and citation role judgment
- translation quality review
- final review observations

The runtime must handle deterministic and authoritative artifacts:

- source bundle extraction and structural parsing
- Host Bridge invocation and diagnostics
- SQLite state and gate validation
- packet/view materialization
- translation batch preparation
- final HTML rendering and result JSON output

The instructions should explicitly forbid agents from editing runtime-owned
views, SQLite state, or final HTML by hand.

## Recovery and delegation

Recovery remains packet-first: run `status`, identify the current handoff, and
read the current packet. If a packet is missing, run the matching validation and
repair or rerun the current stage instead of skipping forward.

Stage 30 subagent delegation remains optional. A subagent may translate one
runtime-prepared batch, but the main agent keeps responsibility for review,
merge, `block-translations.json`, submit, and validation.
