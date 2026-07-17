## Why

The sidecar now owns a persistent isolated repository foundation, but no application use case reads it through the real authenticated service boundary. Workbench chrome is the next WS5 slice because its stable operational core depends only on cache-basis and operation rows and can be extracted without granting the sidecar production database, canonical-file, or Host authority.

## What Changes

- Add an environment-neutral Synthesis application package that projects bounded Workbench operational chrome state from the shared repository foundation.
- Reuse that projection in the plugin's existing production chrome/progress composition while retaining plugin-owned storage, sync, review, canonical maintenance, and production routing.
- Add an authenticated `workbench.chrome.read` sidecar canary with strict request/result rebuilding and a deadline/abort-aware internal client.
- Separate general RPC transport failures from worker-specific failures while preserving existing compute and transfer error behavior.
- Include the application package and Workbench contract in service boundaries, bundles, fingerprints, governance, and active documentation.
- Keep `mutationEnabled: false`, the 108-method/one-consumer inventory, production database/canonical ownership, and all existing production routes unchanged.

## Capabilities

### New Capabilities

- `synthesis-application-foundation`: Defines the environment-neutral application package and its narrow repository read port.
- `synthesis-sidecar-workbench-chrome-read-model`: Defines the strict bounded operational chrome projection, authenticated canary capability, client, and failure behavior.

### Modified Capabilities

- `synthesis-workbench`: Requires production chrome/progress composition to reuse the shared operational projection without changing its source, output, or surface-refresh behavior.
- `synthesis-layer-doc-system`: Records the second WS5 slice and preserves the WS6 parity/WS7 cutover boundary.

## Impact

This affects Synthesis contracts, a new application package, the plugin application composition, the sidecar HTTP server and internal RPC client, service boundary checks, runtime packaging/fingerprints, Core tests, migration inventory, and Synthesis documentation. It adds no dependency, schema table, preference, UI, production route, or release prebuild.
