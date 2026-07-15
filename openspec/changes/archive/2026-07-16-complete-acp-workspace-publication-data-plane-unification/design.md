## Context

Round2 证明，仅共享 publication envelope 和 mutation 名称不足以形成同构数据面。Chat child 使用 `transcriptState`，Skills child 使用 `selectedTranscript`，共享 receiver 又写入 Skills 字段；producer则继续读取完整page并反向diff。Node测试与严格OpenSpec全部通过，但真实Replay出现Chat永久loading、Skills transcript不可见、forced publication超时和Chat累计成本仍高等问题。

本次迁移以Round1提交`a3e02615`为实现基线。Chat conversation store、Skills run store、JSONL/索引格式和现有boundary分类仍是事实源；Workspace publication是内部协议，Host、Shell和两个child随插件整体发布，因此无需保留旧wire兼容。

## Goals / Non-Goals

**Goals:**

- 让Chat与Skills使用一个字段词典、一个transcript region read model和一套publication/ACK状态机。
- 从Workspace生产代码删除`selectedTranscript`、`selectedTranscriptPage`和`transcriptState`，不保留alias或decoder。
- 让steady transcript mutation直接来自producer event seam，成本随新增mutation而非累计page/text增长。
- 让initial snapshot、delta、resync、child-ready、ACK、force和Replay barrier形成可证明的闭环。
- 用参数化production-adapter conformance和字段词汇guard阻止后续surface漂移。

**Non-Goals:**

- 不修改Chat/Skills store、持久化、恢复、归档、JSONL/索引或外部API。
- 不改变用户选择的execution display mode。
- 不治理R1 diagnostic/persistence、R2 Host socket reader或无关业务性能路径。
- 不为旧Workspace publication schema提供兼容层。

## Decisions

### 1. v3采用唯一字段词典并原子切换

`assistantWorkspacePublication.ts`和`assistantWorkspaceTranscriptPublication.ts`是字段与类型的唯一事实源。Host、Shell、child、profiler和Replay同一change切换到v3。删除旧schema解析、双写和fallback，因为内部组件同版本发布，兼容层只会延长语义分叉。

publication envelope只包含`schema`、`publicationId`、`owner`、`publicationKind`、`publicationForm`、`publicationCause`、`regionRevision`、`deliverySequence`和typed `payload`。owner自身携带`source`；不再重复`source/tab`。signature留在coordinator内部，ACK只回传`publicationId`和stage/outcome/reason。

### 2. 两侧共享一个TranscriptRegion

所有Workspace read model与child使用：

```ts
type AssistantWorkspaceTranscriptRegion = {
  owner: AssistantWorkspaceOwner | null;
  status: "idle" | "loading" | "ready" | "failed";
  error: { code: string; message: string } | null;
  page: AssistantWorkspaceTranscriptPage | null;
  uiRevision: number;
};
```

不变量为：idle无owner/page/error；loading有owner但无page/error；ready有owner/page且无error；failed有owner/error但无page。空transcript是ready加空items。旧字段从Chat、Skills、shared panel model、Sidebar和child同步删除。

### 3. Owner、Page、Item与Revision各有单义字段

共享状态机只读取`owner.source`和`owner.ownerKey`。业务身份只留在owner variant中。page使用稳定`pageKey`、`startCursor`、`limit`、`totalItemCount`、nullable相邻cursor、`eventSeq`和items；page不携带requestId或其他owner字段。tail pageKey按owner/limit稳定，历史pageKey按cursor/limit稳定。

共享item使用`itemId/itemKind`。surface store的`id/kind`在producer/page adapter入口一次转换。revision只保留：store `eventSeq`、region `regionRevision`、page continuity `uiRevision`和Shell排序`deliverySequence`。底层store的历史字段不得越过adapter。

### 4. Producer直接提供UI mutation

Chat在`queueChatTranscriptEvent()`邻近seam、Skills在`queueTranscriptEvent()`邻近seam投影共享item/mutation。两个adapter调用同一个projection；projection复用`acpTranscriptBoundary.ts`，统一held text、hard-boundary release、visible-row soft patch和page window。coordinator不读取store或完整page，也不反向diff。

explicit snapshot page只用于initialization、activation、owner/page switch、page request、rebase和diagnostic。inactive owner在mutation构建前丢弃，重新激活时snapshot恢复。

### 5. Coordinator拥有唯一publication状态机

状态key为`owner.source + ownerKey + pageKey`。initial snapshot与delta进入同一single-flight。Shell receive/forward只记录观测；render-complete或明确终态rejection才能推进。512 mutations或256 KiB溢出后发送resync-required并等待强制snapshot，不能继续残余delta。

forced diagnostic跳过equal-signature guard并返回精确barrier。Replay只等待该barrier及调用前已排队的同surface工作，不等待全局pending为空。

### 6. Shell与receiver无surface状态

Shell缓存当前typed in-flight并在child-ready/frame reload后幂等重放。两个child加载同一receiver并维护同一个TranscriptRegion。page request统一发送`owner + request`，Host按`owner.source`路由；child不再分别构造Chat/Skills action schema。

receiver按owner/page校验regionRevision和uiRevision，处理old-owner、stale、gap、superseded及off-page metadata。streaming append更新既有text node；finalization/结构patch只重绘目标row。

### 7. 同构通过类型和行为双重锁定

domain kind使用两个穷尽mapping table；每个kind必须映射共享kind或`not-applicable`。同一conformance suite运行Chat和Skills production adapter；归一化业务owner/item后，字段集合、null语义、publication form/cause、revision、queue、ACK和rebase必须一致。

静态词汇guard只扫描Workspace生产路径，禁止旧transcript字段和v2 publication别名重新出现。store持久化字段不在该guard范围内。

## Risks / Trade-offs

- [原子字段迁移影响面大] → 先迁移类型和失败测试，再成对迁移Host read model、Shell和两个child；任何阶段不允许双字段过渡提交。
- [producer mutation与snapshot短暂不一致] → production-adapter conformance对同一event序列比较mutation结果与显式snapshot；snapshot仍是rebase真值。
- [ACK丢失阻塞队列] → Shell持有并重放当前in-flight，receiver对重复publicationId幂等回复终态ACK。
- [tail page窗口随新增item移动] → tail pageKey保持稳定，projection维护bounded窗口并在超出已知模型时请求rebase。
- [字段guard误扫store] → guard仅覆盖Workspace publication/read-model/browser路径；store schema保持不变。

## Migration Plan

1. 在Round1验证Chat/Skills transcript和forced drain恢复。
2. 建立v3类型、runtime validator、字段词汇guard和参数化失败测试。
3. 两侧full snapshot/read model原子切换到TranscriptRegion。
4. 实现共享projection并成对迁移Chat/Skills producer。
5. 实现coordinator、Shell重放、receiver和统一page action。
6. 删除全部旧字段、反向diff和重复状态机。
7. 接入profiler/Replay并完成Node、Zotero、lint、build、OpenSpec和formal replay。

失败时通过备份分支`backup/acp-workspace-publication-round2-failed-20260716`审计历史；不在v3代码中保留运行时回退。

## Open Questions

无。字段词汇、允许差异、迁移方式和性能预算均已确定。
