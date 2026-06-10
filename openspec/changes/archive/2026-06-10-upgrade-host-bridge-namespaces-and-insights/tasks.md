## 1. Implementation

- [x] Rename public Host Bridge synthesis capabilities to domain namespaces.
- [x] Add read-only insight facade capabilities.
- [x] Split Rust CLI semantic command families.
- [x] Update MCP constants/tool definitions and Host Bridge mirror output.
- [x] Update generated Host Bridge surface docs and wrapper skill reference.
- [x] Update agent-facing built-in skill guidance.

## 2. Verification

- [x] Run `npm run render:host-bridge-surface -- --check`.
- [x] Run `npm run check:host-bridge-doc-sync`.
- [x] Run `cargo test --manifest-path cli/zotero-bridge/Cargo.toml`.
- [x] Run targeted TypeScript tests.
- [x] Run `npx tsc --noEmit`.
- [x] Run `openspec validate --all --strict`.
