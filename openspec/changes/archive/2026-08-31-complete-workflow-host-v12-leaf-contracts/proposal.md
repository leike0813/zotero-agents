# Proposal: complete-workflow-host-v12-leaf-contracts

## Why

2026-08-31 的 Workflow Host v12 审阅（对照 `artifact/workflow-host-v12-architecture-decisions.md`，下称 ADR）确认：v12 的物理 manifest 已闭合（23 keys / 87 members、单一 runtime literal、conformance 全绿），但有四个成员的**公开语义契约仍停留在 v11**——它们名义上进入了 v12 surface，实际 DTO、outcome、原子性与错误语义并未按 ADR 落地。本轮阻断/高危/中低危修复已全绿收尾，唯独这四项各自是一个完整契约切片，被明确延期到本 change 按 TDD 补齐。

不补齐的直接风险：consumer 依据 ADR 编码时会拿到与文档不符的形状；`attachments.replaceFile` 生产恒返回 `unsupported_operation` 却在公开类型中声明可用；`notes.create` 仍是 ADR §11.4 明文拒绝的 optional-field bag；`notes.upsertPayload` 失败时残留孤儿 attachment；`metadata.translateIdentifier` 仍取 `itemList[0]` 且无三态 outcome。

## What Changes

- **M1 `metadata.translateIdentifier`**（ADR §12.0）：关闭输入 DTO（拒绝 `normalized` alias 与开放 `type`）；实现 `matched / ambiguous / not_found` 三态 outcome union 与 exact-match candidate selection（禁止直接取 `itemList[0]`）；补齐 lookup evidence、hard budgets；translator 异常进入 stable error taxonomy 而非降级为 `ok:false` 正常返回；creators 不再 `.slice(0,50)` 静默截断；diagnostics 改为 closed code union。**BREAKING**：`MetadataLookupResultDto` 形状变化（当前仅是 v11 类型的 alias）。
- **M2 `attachments.replaceFile`**（ADR §11.14）：生产 broker 接线 stored 原子切换与 linked-file relocation；file 替换经 managed staging，失败保留原文件与原错误为主错误；receipt 覆盖替换前后事实。**BREAKING**：成员从恒 `unsupported_operation` 变为真实可用（语义新增，非形状破坏）。
- **M3 `notes.upsertPayload`**（ADR §11.7/§11.2）：相同 payload hash 短路返回 `unchanged`（幂等）；多个同 payloadType 以 `conflict/ambiguous_state` 拒绝而非静默全替；新 attachment 已建而 note 更新失败时补偿删除并保留主错误、孤儿 attachment 进 `residualRefs`；result DTO 对齐 ADR 的 `{note, payload, outcome}`。**BREAKING**：result DTO 形状变化。
- **M4 `notes.create`**（ADR §11.4）：DTO 从 optional-field bag 改为 placement discriminated union（top-level 带 collectionRefs / child-of-parent），支持 initialTags；research import 不再在 create 后另行编排 `item.updateTags` 设置初始 tag。**BREAKING**：request DTO 形状变化，research import 编排路径同步修改。

四项共享约束：错误一律经 `workflowHostErrorContract` 的 stable taxonomy（closed code + closed details）；写路径接入既有 mutation authority（reservation / receipt / idempotency）；每项先写测试再实现。

## Capabilities

### New Capabilities

（无）

### Modified Capabilities

- `workflow-host-api-v12`：四个成员（`metadata.translateIdentifier`、`notes.create`、`notes.upsertPayload`、`attachments.replaceFile`）的公开契约语义从 v11 遗留形状对齐到 ADR exact DTO/outcome/错误语义。
- `zotero-host-broker-capability-api`：metadata translate identifier 的三态 outcome 与 evidence、notes/attachments 相关 canonical mutation 的原子性与幂等要求随之上移为 broker 级需求。

## Impact

- 代码：`src/modules/zoteroHostCapabilityBroker.ts`、`src/modules/zoteroHostMutationAuthority.ts`（如需）、`src/workflows/types.ts`、`src/workflows/hostApi.ts`、`src/workflows/workflowHostOwners.ts`、research import 编排（`workflowHostOwners.ts` / `researchBundleService.ts`）。
- 消费方：`workflows_builtin/**` 中对这四成员的调用点、Host Bridge / MCP 中复用这些 broker 路径的 projection（remote locality 投影不变）、相关 test/core 与 test/workflow-* 套件。
- 契约：上述 **BREAKING** 项均发生在 v12 已声明的 member 内部语义层，不改变 23/87 manifest identity；由于 v12 尚未对外发布，不引入 v13。
- 治理：Host Bridge 三个 agent-facing surface 的语义源如引用这四成员的 DTO，需同步评审与重新 materialize。
