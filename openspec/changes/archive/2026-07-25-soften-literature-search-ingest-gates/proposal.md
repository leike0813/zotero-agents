## Why

`literature-search-ingest` currently couples its literature workflow to a
package-local state machine. Agents must author intermediate action payloads,
invoke gate scripts after nearly every step, accept runtime-created fixed
assignments, and wait at a global worker barrier. Those mechanics add latency
without improving the literature-quality decisions that actually protect
Zotero data.

The valuable part of the existing Skill is its business workflow: guided
planning, cumulative high-recall discovery, user-approved ingest scope,
direct-work identity, metadata resolution, three-route public-PDF probing,
canonical Zotero fields, serial Host mutation, receipts, ledger, recovery, and
stable final output. This change keeps that workflow and removes only the
script-enforced orchestration layer.

## What Changes

- Express every stage transition as an instruction-backed completion
  condition in the Skill.
- Keep Stage 10 search-plan confirmation and Stage 30 ingest-scope
  confirmation as the only user waiting points.
- Keep metadata resolution, direct-work identity, and the three-route PDF
  probe mandatory for every approved paper.
- Let the main agent choose candidate grouping, concurrency, dispatch timing,
  and waiting strategy.
- Let one subagent research multiple candidates while preserving one
  independent Host ingest payload per metadata-qualified paper.
- Let the main agent collect and process any completed payload immediately;
  Host mutations remain main-agent-only, one paper at a time, and serial.
- Allow subagents to report research sources and uncertainty in stdout; any
  internal audit summary is optional, non-blocking, and excluded from final
  output.
- Compress `SKILL.md` to approximately 500 lines by moving detailed current
  workflow guidance into the existing references.
- Remove the package-local gate, stage, and batch scripts plus the semantic
  action schema after their business rules have been migrated.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `literature-workbench-package`: use instruction-backed stage completion
  while preserving interaction, discovery, metadata/PDF, ledger, and output
  behavior.
- `literature-workbench-workflows`: support agent-chosen subagent grouping,
  direct per-paper Host payload files, incremental payload collection, and
  serial main-agent mutation.

## Impact

- The Skill, its four references, runner prompt, workflow description, and
  workflow documentation are updated together.
- Tests move from the package-local state-machine implementation to stable
  workflow behavior and package composition.
- `gate_runtime.py`, `stage_runtime.py`, `batch_runtime.py`, and
  `runtime-action.schema.json` are removed only after all retained semantics
  are represented in instructions and tests.
- `parameter.schema.json`, `output.schema.json`, the Host single-paper ingest
  contract, the workflow apply hook, and existing workflow versions remain
  unchanged.
