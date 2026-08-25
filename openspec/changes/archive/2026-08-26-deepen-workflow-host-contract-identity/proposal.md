## Why

Workflow Host contract identity is repeated across composition, diagnostics, loader globals, compatibility guards, tests, and current documentation. The copies already disagree about capability coverage and version semantics, so contract changes require scattered edits and can silently widen or misreport the workflow interface.

## What Changes

- Add one side-effect-free Workflow Host Contract Identity module that owns the current version, declared top-level capabilities, diagnostic probes, version resolution, and variant conformance.
- Distinguish interactive and non-interactive Workflow Host Contract Variants from hook execution modes.
- Derive loader, runtime, input-planning, and debug-probe identity diagnostics from the shared owner while preserving runtime late binding.
- Keep the built-in workflow package's `[2, current]` compatibility range as a self-contained consumer policy, and verify that it accepts the current identity.
- Add strict test/build conformance for missing and undeclared top-level capabilities without introducing a production-wide startup rejection.
- Make active documentation current-state only and gate explicit Workflow Host version declarations against the contract owner.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `zotero-host-capability-broker`: Define the single owner of current Workflow Host contract identity, variant-specific capability requirements, version resolution, and conformance behavior.

## Impact

- Workflow Host composition and diagnostics under `src/workflows/`.
- Workflow debug probing and the Host Bridge non-interactive projection.
- Built-in package compatibility verification; package runtime behavior and its self-contained module graph remain unchanged.
- Workflow Host contract tests, developer SSOT documentation, active OpenSpec, and domain vocabulary.
- No dependency changes, public member removals, or Host Bridge/MCP contract changes.
