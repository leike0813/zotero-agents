# Proposal

## Why

The transient Pi runtime has no controlled entry for tool calls. W1 C07 establishes the shared policy and lifecycle boundary before later changes register Native, Web, MCP, and Zotero tools or connect durable owners.

## What Changes

- Freeze a validated, project-owned tool catalog and capability snapshot for each Pi Runtime Turn.
- Preflight whole tool-call batches against system admissibility, current authorization, runtime capability, schema, and resource constraints.
- Execute eligible calls with conflict-aware scheduling, exact-call permission continuation, durable started/receipt callbacks, and conservative effect certainty.

## Capabilities

### New Capabilities

- `pi-tool-gateway-policy`: Per-turn catalog, policy, batch, approval, scheduling, and generic attempt lifecycle.

### Modified Capabilities

None. C07 does not change the C01 runtime or C02 persistence behavior.

## Impact

Adds one browser-safe Gateway module and shared Node/Zotero tests. Later owners provide persistence and permission callbacks; later catalogs provide concrete descriptors and executors. No new dependency, preference, feature flag, UI, or production tool is introduced. Follows [#26 C07](https://github.com/leike0813/zotero-agents/issues/26#issuecomment-5526801101), its [authorization correction](https://github.com/leike0813/zotero-agents/issues/26#issuecomment-5527194426), and the [final change order](https://github.com/leike0813/zotero-agents/issues/26#issuecomment-5552013273).
