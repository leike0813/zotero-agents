## Why

Workflow writes use canonical Broker mutations while Bridge/MCP/CLI still use legacy mutations, and mutation identity survives only in memory. The third Issue #39 change closes these paths together so retries, approval, file effects and result observation share one durable authority.

## What Changes

- **BREAKING**: replace legacy mutation operations and request/result envelopes with the Broker canonical contract, effect-free preflight and private prepared plans for every write.
- Persist caller-scoped operation identity and terminal receipt/attempt before returning success; add read-only mutation observation and permanent expired-identity protection.
- Unify related lists, 100-target limits and native Trash/restore; require trusted prepared files for managed attachment writes.
- Make single-paper ingest canonical: item and explicit collection membership are required effects; PDF and landing attachments are optional enrichment with explicit outcomes.
- **BREAKING**: migrate production handler consumers and remove the public handler DSL, public revision/token fields and linked-path write authority.
- Update affected Workflow, Bridge, MCP, CLI, specifications, documentation and governed surfaces together.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `zotero-host-broker-capability-api`: all-write preflight, durable mutation authority/observation, related/Trash/files/ingest.
- `zotero-host-capability-broker`: private native effects replace handler DSL.
- `workflow-host-api-v12`: canonical signatures and explicit mutation observation.
- `host-bridge-service`: canonical mutation transport and namespace.
- `host-bridge-operation-receipts`: distinguish canonical mutation evidence from generic HTTP operation history.
- `host-bridge-approval-prompts`: approval-bound plans and reevaluation.
- `host-bridge-file-downloads`: prepared uploads, consumption and replay.
- `host-bridge-output-boundaries`: canonical receipt/attempt and attachment locality.
- `host-bridge-cli-interface`: canonical builders and mutation observation.
- `host-bridge-cli-literature-ingest`: required core effects and optional enrichment.
- `result-apply-handlers`: canonical Broker writeback replaces public handlers.

## Impact

Implementation baseline: `a60879d6e669b148fcf22d1d16433045c7080f54`. Cumulative surface baseline: `4fb76b73f3ec9744e905c39e45d0b86ac03b34ed`. Read and selection prerequisites are archived. Existing note/artifact workflows remain functional; semantic artifact hard cut, migration UI and navigation belong to later changes. No dependency installation, Git commit/push, prebuild publication or release dispatch is included.
