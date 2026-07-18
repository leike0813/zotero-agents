## Why

ACP backends launched through `npx` currently share the user's global npm execution cache, so concurrent npm package materialization can terminate an otherwise valid ACP launch with `_npx` rename `ENOTEMPTY` or `EEXIST`. Fast subprocess exits can also lose stderr before diagnostics are finalized, while the client connection discards receive-loop failures and reduces actionable failures to a generic “ACP connection closed” message.

## What Changes

- Add a plugin-owned, generation-based npx launch cache with a single source of truth for launch detection, cache keys, single-flight initialization, and one bounded recovery attempt for npm cache rename conflicts.
- Apply the npx launch-cache policy at the shared ACP adapter-to-transport boundary so ACP Chat, ACP Skills, and backend probes use the same behavior without backend-specific branches.
- Start Mozilla subprocess pipe drains immediately after spawn and finalize transport close snapshots only after bounded pipe draining.
- Preserve structured ACP client close origin and reason, and prioritize receive-loop errors, drained stderr, and nonzero exit codes in adapter diagnostics.
- Extend deterministic Node and Zotero regression coverage, including suite membership checks that ensure targeted Zotero ACP integration tests actually execute.
- Document the npx cache ownership and subprocess close-diagnostic lifecycle.

## Capabilities

### New Capabilities

- `acp-npx-launch-cache`: Defines plugin-managed npx cache isolation, stable cache identity, single-flight initialization, bounded generation rollover, and explicit-cache authority.

### Modified Capabilities

- `provider-adapter`: ACP provider initialization gains shared npx cache policy, retry lifecycle isolation, and ordered close-failure diagnostics.
- `runtime-platform-services`: Subprocess transports must drain output from spawn time and expose finalized close snapshots after bounded pipe completion.
- `high-risk-regression-coverage`: ACP launch and close regressions must be assigned to executable Node and Zotero suites with a nonzero-execution guard.

## Impact

- Affected runtime modules: `acpConnectionAdapter.ts`, `acpTransport.ts`, `acpClientConnection.ts`, and a new `acpNpxLaunchCache.ts` policy module.
- Affected tests: ACP transport/client/adapter integration tests and the Zotero core suite manifest/entrypoint.
- Affected documentation: ACP transport lifecycle and backend preset/runtime cache behavior.
- No ACP protocol, backend profile schema, dependency, or user-owned npm cache is changed or deleted.
