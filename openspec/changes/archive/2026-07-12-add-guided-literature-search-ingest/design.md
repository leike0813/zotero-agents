## Context

The workflow already runs through ACP interactive execution. Its current parameter schema rejects blank input, and its runner prompt duplicates the full business workflow from `SKILL.md`.

## Decisions

### Guided routing

`query` remains a required string so request shape is stable, but it may be empty. The skill computes blankness with `query.trim()`. Blank `auto` requests and explicit `guided` requests enter the guided flow. Explicit existing modes remain selected when their query is blank and ask only for the seed required by that mode.

### Guided flow and side effects

After a minimum research goal is known, the agent may read local Zotero/Synthesis context to identify coverage and duplicates. It must not search the web, download, create, or write before the user confirms the structured search brief. Confirmation enters candidate search directly; guided work is not mapped to a legacy search strategy.

### Output and authority

The final concise output stays structurally unchanged, with `guided` added to `search_mode`. `SKILL.md` owns routing, interaction, evidence, and ingest rules. `runner.json` only injects parameters and requires the skill to be read.

## Non-Goals

- Do not add a new UI surface, backend state store, or transcript protocol.
- Do not change the permission-gated single-paper `literature-ingest` mutation path.
- Do not add candidate-search logs to final result JSON.
