# ADR 0001: Repository ownership layout

Status: accepted

The repository groups files by the owner that changes and releases them.
TypeScript runtime modules use domain directories under `src/modules`; Rust
programs live under `rust`; cross-language contracts live under `contracts`;
release identity and receipts live under `releases`; operational scripts are
grouped by delivery domain. Documentation, development artifacts, tests, and
external references use the plural roots `docs`, `artifacts`, `tests`, and
`references`.

`src/modules` keeps only cross-domain owners and stable process-wide seams at
its root. Domain modules do not gain barrel files or compatibility forwarding
paths: imports name the owning module directly. Host Bridge owns the network
listener and routes `/mcp` to the MCP adapter; the adapter does not start or
inspect the listener. Workflow submission and preparation receive production
adapters from the workflow-domain composition entry; the run orchestrator
receives its UI adapters there as well. Internal execution seams do not own UI,
Host Bridge, or the process-wide submission queue.

Generated or governed identities continue to include their declared repository
paths. Moving a fingerprint input therefore creates a new identity; existing
prebuild manifests and release receipts remain immutable and may report stale
until a separately authorized prebuild or release workflow supplies new bytes.
