## Why

2026-08-31 完成了对 61bf8772 以来 Workflow Host v12 系列改动（15 提交、429 文件）的架构审阅（对照 `artifact/workflow-host-v12-architecture-decisions.md`，下称 ADR）与修复，其中包含若干 spec 级行为修正（fail-closed tag 读取、stable 错误 taxonomy、DTO 对齐、attachment role 门禁、mutation admission 与幂等语义）。实施与验证均已完成（`npx tsc --noEmit` 通过；test/core + test/node/core 3214 passing / 0 failing；test/workflow-* 254 passing / 0 failing；Rust synthesis-application + synthesis-repository 96+61 passed / 0 failed）。本 change 是审计记录型 change：补齐治理轨迹，并让归档把已落地的行为修正同步进 main specs。

## What Changes

- 修正 tag audit coverage digest 的跨进程确定性：插件侧 traversal 完成时按 (libraryId, key) 码元序排序已交付的 (ref, revision, tagDigest) tuple 后再哈希；跨语言 tag 排序统一为码元序；删除交付前的 revision 二次读取（TOCTOU）。
- 写路径与 snapshot feed 的 tag 读取改为 fail-closed：`item.updateTags`、`statusTags.transition`、`serializeLibrarySyncSnapshotItem` 在 tag 读取失败或超限时拒绝，不再静默丢 tag 或签发 completion evidence。
- Mutation admission 与幂等：未知 operation 在 admission 以 stable `unsupported_operation` 拒绝；`retry_same_operation` 的 failed terminal 不再 replay 陈旧失败，重试删除记录并在同一 operation identity 下形成 successor attempt。
- Attachment 写成员（updateMetadata/replaceFile/move/remove）增加 ordinary-role 门禁，note_image/note_payload 目标以 `invalid_ref`/`wrong_kind` 拒绝。
- Synthesis facade 14 成员错误统一经 workflowHostErrorContract 归一化，sidecar 冲突原因映射到 stable conflict reason，sidecar 细节不进入 details。
- Tag audit run 生命周期：begin 携带 active run ids 并由 facade 串行化，sidecar 回收同 host 不活跃 run；re-promote 幂等命中返回已持久化 snapshot；aborted signal 的 acknowledgeRegulation 抛 stable canceled；publish 与 acknowledge 后触发 ledger invalidation。
- Workflow runtime 每次 hook run 创建 AbortController，scoped hostApi 注入 defaultControl 与 inputScope；file/archive/metadata 成员接线 control 取消检查；file/archive DTO 对齐 ADR §13.2（picker DTO、makeDirectory recursive、archive `{entries}`/content discriminated union/sizeBytes/case-fold 去重/写后复核、withExtractedZip v12 形态）。
- 对齐 owner DTO：related-item mutation 结果（outcome 枚举 + sourceRevision + 端点校验）、StableIssueDto 五变体 closed union、collection mutations 校验补齐、snapshot item DTO（structured creators/identifiers）、editor.openSession detached 语义。
- 同步 workflows_builtin 消费方（`host.interactionMode`、archive v12 调用形态）、host-bridge capabilities.v2.json 与 materialized surfaces、静态门禁与测试 fixtures。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `workflow-host-api-v12`: 新增/明确 v12 执行控制接线（AbortController、defaultControl、inputScope）、file/archive/input materialization 契约、Synthesis facade 错误归一化、owner DTO 对齐（related-item、StableIssueDto、collection、snapshot item、editor detached）等行为要求。
- `zotero-host-broker-capability-api`: 新增/明确 coverage digest 跨进程确定性、写路径与 snapshot tag 读取 fail-closed、mutation admission/重试幂等、attachment ordinary-role 门禁、tag audit run 生命周期与 promote 幂等等行为要求。

## Impact

- 插件侧：`src/modules/zoteroHostCapabilityBroker.ts`、`src/modules/zoteroHostMutationAuthority.ts`、`src/modules/synthesisClient/workflowHostClient.ts`、`src/modules/workflowEditorHost.ts`、`src/workflows/runtime.ts`、`src/workflows/hostApi.ts`、`src/workflows/file.ts`、`src/workflows/archive.ts`、`src/workflows/types.ts`、`src/workflows/workflowHostOwners.ts`。
- Rust sidecar：`native/synthesis-sidecar/crates/synthesis-application`、`native/synthesis-sidecar/crates/synthesis-repository`（tag audit begin/promote/abandon）。
- 共享合约：`packages/synthesis-contracts/src/tags.ts`（码元序 tag 校验）。
- 消费方与门禁：`workflows_builtin` 六个包文件、`host-bridge/contracts/capabilities.v2.json` 及 materialized surfaces、`test/node/core/187` 静态门禁、`test/core/102/173/240` 等测试。
- 无新增依赖、无持久化数据迁移、无发布动作。
