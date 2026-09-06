# Selection/Context 组件说明

SelectionContext 保存一次触发时锁定的有序 Zotero 事实，供 settings preview、Input Planning v2 和请求构建共用。类型定义位于 `src/modules/selectionContext.ts`，JSON Schema 位于 `src/schemas/selectionContextSchema.ts` 和本目录的 `selection-context.schema.json`。

## 获取与身份

`readSelectionContext(api, control?)` 消费 Broker 的精确选择页。每页默认 25、最多 100 项；cursor 绑定当前有序 refs 的 digest 与 after-index，仅当前页物化详情。attachment、note、annotation 保留自身 ref 和 parentRef，Broker 不提升、去重或排序，也不维护选择缓存、TTL 或持久化快照。

全部页成功后锁定 `items` 与其中的 refs；`sampledAt` 只记录采样时间。分页遇到 `conflict.details.reason = basis_mismatch`、取消或读取失败时，丢弃整次获取并沿现有失败路径返回，不自动换成另一份选择。不可用 context 与有效空选择分别处理。

显式远程输入、durable agent-run 和调用方指定输入使用 `buildSelectionContext(refs, api, control?)`，只接受完整 `{ libraryId, key }`。它通过 canonical library detail 读取事实，不采样 UI，不把 refs 还原成 raw item 再调用旧 builder。缺少完整 refs 的历史记录保留，但不能执行。

## 数据结构

```typescript
SelectionContext {
  items: readonly {
    kind: "parent" | "child" | "attachment" | "note";
    ref: { libraryId: number; key: string };
    itemType: string;
    title?: string;
    parentRef?: { libraryId: number; key: string };
    filename?: string | null;
    contentType?: string | null;
    createdAt?: string;
    fileState?: "available" | "missing" | "not_applicable";
  }[];
  sampledAt: string;
}
```

数组保留精确输入顺序和重复项；`selectionCounts` 从当前数组计算类型数量。metadata、notes、payload、附件拓扑等按任务需要通过 canonical library API 获取，不放入通用 rich tree。路径和 native numeric ID 不属于选择事实。

## 任务投影

Input Planning v2 按固定顺序消费锁定事实：

```text
trigger.requiresSelection
  -> validateSelection.require.selection
  -> validateSelection.select
  -> inputs.member compatibility
  -> validateSelection.filters
  -> validateSelection.require.candidates
  -> inputs.grouping
  -> immutable prepared units
```

命名 selector 持有 paper promotion、去重和来源优先级。Literature source 每 paper 一个 source，parent 优先于同 paper 的直接附件，Markdown 优先，按最早 PDF 同名 stem 和创建时间选择。MinerU 的直接 PDF 保持自身；parent 展开所有符合条件 PDF。Metadata selector 解析 regular parent；note export 保留直接 note 并展开 parent 的 generated notes；digest image 要求唯一 digest；bundle selection 只接收 top-level regular refs。

每个 candidate 只携带所属 member 的 scoped facts 和 portable parent identity；grouping 生成不可变 prepared unit。preview 固定输入，确认后的执行模式可根据参数重新过滤，但已准入的 units 不得重新选择或分组。generated-note 与 digest-image selector 可附加各自最小 task target，不能恢复通用树形投影。

## 本地文件与结果

请求元数据使用 `targetParentRef` 和 `sourceAttachmentRefs`。本地准备上传时通过 `library.getItemDetail(ref)` 的 attachment file descriptor 取路径，只有 `state: available` 可以进入既有 materialization/upload mapping。文件消失时明确失败，不猜路径或数字 ID。Apply、sequence 和 recovery 保留请求中的 portable refs。

`context.getCurrentView()` 是独立同步轻量读取：返回 `libraryIds/selectedSources` 等视图事实，多选树行保留顺序，Saved Search 使用 portable ref，不嵌入 selected items。
