## Why

The project currently exercises Zotero through one developer-installed runtime and an Ubuntu-only CI path, so regressions tied to Zotero 7, 9, 10 or Windows packaging can pass without ever starting the affected host. Zotero 10 also changes collection-tree selection semantics, which must be represented without leaking version-specific host objects through the public broker contract.

## What Changes

- Add a content-addressed compatibility matrix and an automated fixture that acquires exact Zotero releases, starts isolated real GUI host sessions, runs the existing lite/full behavioral suites, and emits machine-readable receipts and diagnostics.
- Add a formal-XPI smoke path which installs the same built artifact through Zotero's add-on manager and verifies activation, shutdown, and uninstall cleanup.
- Run blocking Windows x64 and Linux x64 Zotero 7.0.32, 9.0.6, and 10.0.1 cells in CI; run non-blocking macOS Intel and ARM64 Zotero 10.0.1 smoke cells.
- Extend declared plugin support through Zotero 10 and centralize supported-major parsing for runtime compatibility branches.
- Replace the host broker's implicit single collection-tree selection model with an ordered portable selection DTO, while retaining scalar compatibility projections only when the selection is unambiguous.
- Document local and CI operation, evidence layout, cache trust rules, and unsupported-host failure behavior.

## Capabilities

### New Capabilities

- `zotero-cross-platform-compatibility-fixture`: Exact-version host acquisition, isolated session execution, formal-XPI smoke testing, receipts, cleanup, and CI matrix policy.

### Modified Capabilities

- `test-suite-gating-strategy`: Makes the Windows/Linux Zotero 7/9/10 compatibility matrix a blocking project gate and defines the non-blocking macOS evidence lane.
- `zotero-host-capability-broker`: Represents plural collection-tree selections as portable JSON and preserves scalar projections only for unique selections.

## Impact

The change affects test orchestration under `scripts/` and `test/zotero/`, GitHub Actions, the add-on manifest, runtime-version compatibility branches, the Zotero host broker and its explicit projections, and testing/support documentation. It uses Node.js and operating-system tools only in the external test fixture; no Node-only API enters the plugin runtime and no production dependency is added.
