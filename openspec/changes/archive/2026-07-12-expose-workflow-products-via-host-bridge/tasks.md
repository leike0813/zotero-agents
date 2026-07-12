## 1. Product boundary and capability contracts

- [x] 1.1 Add focused storage and capability regression tests for normal-product filtering, public DTO redaction, managed-asset resolution, and stable not-found outcomes.
- [x] 1.2 Add the shared managed workflow-product asset resolver and public DTO mapping without changing persisted records or feedback behavior.
- [x] 1.3 Register the read, single-asset, export, and approval-gated removal capabilities through the existing Host Bridge call route and file registry.
- [x] 1.4 Update protocol, permission prompt, and embedded MCP routing so only side-effect-free product reads are MCP tools.

## 2. Product CLI and delivery

- [x] 2.1 Add parse and command-mapping tests for the canonical `zotero-bridge product` command family.
- [x] 2.2 Implement bounded product list/get/remove commands and Host Bridge approval propagation.
- [x] 2.3 Implement local direct export and remote ZIP delivery instructions with collision protection for `product download`.

## 3. Surface alignment and verification

- [x] 3.1 Update the Host Bridge surface catalog and semantic sources for product commands and delivery guidance.
- [x] 3.2 Run Host Bridge semantic surface review, render generated surfaces, and update only generated outputs produced by the renderer.
- [x] 3.3 Run targeted TypeScript and Rust tests, OpenSpec validation, and surface-catalog checks; resolve failures and mark completed tasks.
