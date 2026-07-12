## Why

Dashboard Products are stored in the plugin's workflow-product domain, but are
currently visible only inside Zotero. Host Bridge and `zotero-bridge` cannot
list, inspect, download, or remove them, leaving workflow outputs inaccessible
to CLI and remote users.

## What Changes

- Add a public `workflow_products` Host Bridge read surface for normal Dashboard
  Products, with safe product metadata and opaque per-asset file handles.
- Add a product export capability that writes selected assets locally for local
  callers or returns a remote-download ZIP delivery for remote callers.
- Add an approval-gated product-record removal capability; it preserves managed
  asset files for the persistence scanner's existing orphan-retention policy.
- Add canonical `zotero-bridge product` list, get, download, and remove
  commands, including bounded listing and safe output handling.
- Synchronize capability, CLI, MCP, wrapper, profile, and generated Host Bridge
  documentation surfaces.

## Capabilities

### New Capabilities

- `workflow-product-bridge-access`: Expose normal workflow products safely to
  Host Bridge callers and the CLI, including remote-compatible export delivery.

### Modified Capabilities

- `host-bridge-cli-interface`: Define the canonical product command family and
  its download, pagination, and generated-surface behavior.
- `host-bridge-approval-prompts`: Define a specific human-readable approval for
  product-record removal.
- `acp-embedded-zotero-mcp-server`: Mirror the new read-only product
  capabilities while excluding export and removal side effects.

## Impact

Affected areas include workflow-product storage path validation, the Host Bridge
capability registry and protocol, opaque file-handle registration, the Rust CLI,
the Host Bridge surface catalog, generated CLI guidance, and related tests. The
change does not alter Synthesis `paper_artifacts` or the workflow-product SQLite
storage format.
