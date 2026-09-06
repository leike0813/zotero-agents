# 选择上下文

插件在触发工作流时获取按原顺序排列的精确选择，完成全部 Broker 分页后锁定输入。分页期间选择发生变化会使本次获取失败。设置预览与执行共用这份输入；显式输入与持久化输入使用完整的 `{libraryId, key}` 引用。

## 结构

`items` 是一个有序数组。每项包含 `kind`、`ref`、`itemType`，并可包含 `title` 和 `parentRef`。附件事实还可包含 `filename`、`contentType`、`createdAt`、`fileState`。上下文不携带宿主对象、数字条目 ID 或本地路径。空选择表示为 `items: []`。

```ts
const selectionContext = {
  items: [
    {
      kind: "attachment",
      ref: { libraryId: 1, key: "ATTACH01" },
      itemType: "attachment",
      title: "Paper.pdf",
      parentRef: { libraryId: 1, key: "PARENT01" },
    },
  ],
  sampledAt: "2026-09-06T00:00:00.000Z",
};
```

## 在 Hook 中读取事实

Hook 消费已经准备好的输入单元，用锁定引用经 `runtime.hostApi.library` 获取补充事实。列表读取需要在 `hasMore` 为 true 时继续消费 `nextCursor`，不要重新采样实时选择。

```js
export async function buildRequest({ selectionContext, runtime }) {
  const refs = selectionContext.items.map((item) => item.ref);
  const details = [];
  for (const ref of refs) {
    details.push(await runtime.hostApi.library.getItemDetail(ref));
  }
  return {
    kind: "pass-through.run.v1",
    selectionContext,
    parameter: { titles: details.map((detail) => detail.item.title || "") },
  };
}
```

## 源文件与任务策略

优先声明文件来源。最终本地输入适配器通过 `library.getItemDetail(ref)` 获取附件描述符，仅在 `file.state === "available"` 时使用 `file.path`。选择、任务元数据和持久化输入保留附件引用；文件不可用时准备失败，不替换来源。

提升父条目、去重和来源优先级属于 `validateSelection` 中的命名选择器。文献选择器保留每篇文献一个来源及 Markdown/PDF 优先级；MinerU 直接选 PDF 时只处理该 PDF，选父条目时才展开全部合适的 PDF。`inputs.member` 与 `inputs.grouping` 定义准备好的输入单元。

```json
{
  "inputs": {
    "member": { "kind": "attachment", "accepts": { "mime": ["application/pdf"] } },
    "grouping": { "mode": "each" }
  },
  "validateSelection": {
    "select": { "policy": "input-member", "source": "selected" },
    "filters": [{ "kind": "source-file-exists", "phase": "availability" }]
  }
}
```

允许空输入时，使用 `member.kind: "selection"`、`grouping.mode: "all"`、`selection` 选择器和 `trigger.requiresSelection: false`，并确保选择要求允许空输入。

- [Host API](host-api)
- [Manifest](manifest#selection-validation)
