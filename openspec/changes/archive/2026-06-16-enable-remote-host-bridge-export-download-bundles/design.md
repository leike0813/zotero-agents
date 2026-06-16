# Remote Host Bridge Export Bundles Design

## Connection Mode Source

The Rust CLI reads `connectionMode` from the active profile and preserves it in
`BridgeConfig`. Authenticated requests send
`X-Zotero-Bridge-Connection-Mode: local|remote`. Missing or unrecognized headers
are treated as `local` by the Host Bridge server.

## Capability Context

The Host Bridge server parses the header once per capability call and supplies
`connectionMode` through `HostBridgeCapabilityContext`. Synthesis MCP mirror
capabilities receive it as a secondary service context so normal tool inputs and
schemas remain unchanged.

## Bundle Delivery

Remote bundle responses include:

- the existing relative result path, such as `output.path` or `manifest_file`;
- `delivery.mode = "bridge-download"`;
- `delivery.bundle` with the registered file descriptor;
- `delivery.downloadCommand`;
- `delivery.unpackHint`.

The zip file uses a store-only implementation shared by TypeScript code and does
not add a compression dependency. Zip entries are normalized relative paths and
never expose the host temporary path.

## Capability Behavior

`topics.get_context` keeps local `outputPath` writes. In remote mode, the full
view JSON is written into a zip entry named by the requested output path.

`paper_artifacts.export_filtered` keeps local `run_root/runtime/payloads/...`
writes. In remote mode, it generates the same relative structure in a host temp
export directory, zips the manifest and content files, registers the zip, and
returns the same relative `manifest_file`.
