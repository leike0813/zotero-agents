## 1. Boundary and Behavior TDD

- [x] 1.1 Update Core 168/130 first to require `125 methods / 1 direct consumer`, forbid Topic mirror service symbols/Zotero access, and preserve Workflow Host exposure.
- [x] 1.2 Update Core 120/126 first for a mirror-free foundation and recovery DTO while retaining canonical/hash/lock, root/index/conflict/startup behavior.
- [x] 1.3 Update Core 125/129 first for mirror-free storage/result projections and canonical-only apply/delete/purge behavior.

## 2. Runtime Retirement

- [x] 2.1 Remove Topic mirror types, result fields, public methods, payload assembly, and the Zotero adapter from the Synthesis service.
- [x] 2.2 Remove note-shard and mirror-manifest primitives from foundation without changing canonical storage primitives.
- [x] 2.3 Remove mirror validation, actions, inputs, outputs, and shard-recovery planning from sync recovery while preserving active local recovery semantics.
- [x] 2.4 Remove synthetic anchor/mirror storage fields from UI models, default inputs, and service snapshots.

## 3. Inventory and Documentation

- [x] 3.1 Remove mirror method groups from the service migration inventory and update boundary expectations to `125 / 1`.
- [x] 3.2 Update Synthesis README, runtime/rebuild, persistence, and SSOT documentation to describe canonical-only runtime and inert legacy mirror data.
- [x] 3.3 Confirm no production client/composition/Host Bridge/MCP surface acquires a replacement mirror port or command.

## 4. Validation

- [x] 4.1 Run targeted Core 120/125/126/129/130/131/168/175/176/178/179/180/181 regressions and fix change-related failures.
- [x] 4.2 Run readonly UI harness, Synthesis invariants, contract/root TypeScript, service-boundary, targeted formatting/lint, `git diff --check`, and production build.
- [x] 4.3 Run strict OpenSpec validation and confirm all tasks complete without committing, publishing, archiving, or touching legacy Zotero data.
