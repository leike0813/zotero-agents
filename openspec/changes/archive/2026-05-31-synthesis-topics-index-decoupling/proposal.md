## Why

Topic synthesis is drifting into a model where registry cache rebuilds, artifact hash drift, and background freshness workers can continuously drive Topics. That coupling is expensive for reliability and user experience, especially because digest artifacts are normally stable after creation.

Current topic create/update workflows already use the Host Bridge Synthesis library/artifact facade as their primary input and only use citation graph metrics as optional enrichment. This change records that boundary as the target architecture so Paper Registry Cache and Citation Graph maintenance can focus on registry/graph correctness without becoming a hidden driver for topic artifacts.

## What Changes

- Document Topics as an explicit workflow artifact domain, not a continuously synchronized registry cache projection.
- Define the Host Library / Artifact Facade as the primary input boundary for topic create/update:
  - `get-library-index`
  - `resolve-resolver`
  - `export-filtered-paper-artifacts`
  - `get-topic-context` for update base state
- Define Citation Graph metrics as optional topic workflow enrichment, not required evidence or a freshness driver.
- Reframe topic freshness as an explicit source-check diagnostic, not a background invariant maintained by registry cache events.
- Remove target contracts that make registry cache rebuild, incremental registry updates, or startup reconcile enqueue topic source-check/discovery work.
- Keep discovery as an optional hint cache produced by digest apply-time matching or explicit repair, separate from topic artifact lifecycle.
- Update Synthesis domain diagrams, governance docs, event/rebuild contracts, and engineering YAML guardrails.

## Capabilities

### New Capabilities

- `synthesis-topics-index-decoupling`: Defines the target boundary between Topics, Host Library / Artifact Facade, Paper Registry Cache, and Citation Graph.

### Modified Capabilities

None. This change introduces a documentation contract that future implementation changes can map onto existing runtime capabilities.

## Impact

- Documentation and OpenSpec contract change.
- No runtime migration.
- No dependency changes.
- No `literature-digest` submodule upgrade.
- Future implementation work can use this change to remove topic freshness background coupling, narrow event fan-out, and simplify Workbench topic state semantics.
