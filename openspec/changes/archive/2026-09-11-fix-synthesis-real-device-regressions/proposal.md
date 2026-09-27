## Why

Real-device verification still cannot open the Synthesis Index when one child note exceeds the payload limit, the first Topic Report load can continue using stale page assets, and the literature migration surface misclassifies a supported auxiliary payload while lacking the controls needed to resolve real candidates safely.

## What Changes

- Normalize note payload resource-limit failures at the Zotero Host Broker boundary so one oversized note degrades to an artifact diagnostic instead of failing the Index surface.
- Version every Synthesis workbench page asset together so a same-version plugin update cannot reuse the pre-fix Report bundle or stylesheet.
- Recognize `literature-matching-metadata-json` as preserved auxiliary evidence and advance the migration definition.
- Add bounded scan progress, whole-result filtering, candidate detail, per-issue remediation, explicit approval/skip, and verified legacy cleanup to the Dashboard migration flow.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `synthesis-host-artifact-read-port`: Resource-limited child notes are represented as per-artifact diagnostics while the page remains available.
- `synthesis-workbench-ui`: The hosted workbench loads a coherent asset revision and renders the first Topic Report immediately.
- `literature-artifact-migration`: Supported auxiliary payloads are preserved and migration candidates expose bounded progress, filtering, detail, remediation, approval, and cleanup behavior.

## Impact

The change affects the Zotero Host Broker, the Synthesis page resource URLs, Dashboard migration wire DTOs/actions, the process-local migration plan and converter, Dashboard UI/localization, existing specifications and component documentation. It does not change Rust sidecar, Host Bridge, Workflow Host API, dependencies, or persistent database schemas.
