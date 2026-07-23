# 选择上下文

当用户在 Zotero 中选中条目后，插件会构建一个结构化的**选择上下文（SelectionContext）**，描述用户选择了什么、选中的条目各属于哪种类型。这个上下文是 `buildRequest` Hook 的输入基础。

## 选择类型

根据用户选中的条目类型组合，`selectionContext.selectionType` 返回以下值之一：

| 类型 | 说明 |
|------|------|
| `"parent"` | 选中的都是父条目（顶层条目） |
| `"child"` | 选中的都是子条目（非顶层条目） |
| `"attachment"` | 选中的都是附件 |
| `"note"` | 选中的都是笔记 |
| `"mixed"` | 选中的混合了多种类型 |
| `"none"` | 没有选中任何条目 |

## 上下文结构

```ts
selectionContext = {
  selectionType: "parent",       // 选择类型
  items: {
    parents: [ /* 父条目列表 */ ],
    children: [ /* 子条目列表 */ ],
    attachments: [ /* 附件列表 */ ],
    notes: [ /* 笔记列表 */ ],
  },
  summary: {
    parentCount: 2,
    childCount: 0,
    attachmentCount: 0,
    noteCount: 0,
  },
  warnings: [],                  // 警告信息
  sampledAt: "2026-01-15T...",   // 上下文创建时间
}
```

每个类型条目都包含丰富的上下文信息。

### 父条目（ParentContext）

父条目是 Zotero 库中的顶层条目（如期刊论文、书籍、网页等）。每个父条目上下文包含：

```ts
{
  item: Zotero.Item,         // 条目对象
  id: number,                // 条目 ID
  title: string,             // 标题
  attachments: [             // 该条目下的子附件
    { type, filePath, mimeType, dateAdded, ... }
  ],
  notes: [                   // 该条目下的子笔记
    { id, content, ... }
  ],
  tags: string[],            // 标签列表
  collections: string[],     // 所属合集
  children: [                // 其他子条目
    { id, type, ... }
  ],
}
```

### 附件（AttachmentContext）

附件是条目的文件附件（PDF、Markdown 等）。每个附件上下文包含：

```ts
{
  item: Zotero.Item,         // 附件条目对象
  id: number,                // 条目 ID
  filePath: string,          // 本地文件路径
  fileName: string,          // 文件名
  mimeType: string,          // MIME 类型（如 "application/pdf"）
  dateAdded: Date,           // 添加日期
  parentItem: {              // 所属父条目
    id: number,
    key: string,
    libraryID: number,
  },
  tags: string[],
  collections: string[],
}
```

### 笔记（NoteContext）

```ts
{
  item: Zotero.Item,
  id: number,
  content: string,           // 笔记内容（HTML）
  parentItem: { id, key, libraryID },
  tags: string[],
}
```

## 在 Hook 中使用选择上下文

### 获取选中的附件

```js
export function buildRequest({ selectionContext, runtime }) {
  const attachments = selectionContext.items.attachments;

  return {
    kind: "skillrunner.job.v1",
    create: { skill_id: "my-skill" },
    input: {
      files: attachments.map((attachment) => ({
        path: runtime.helpers.getAttachmentFilePath(attachment),
        name: runtime.helpers.getAttachmentFileName(attachment),
      })),
    },
  };
}
```

### 获取选中的父条目及其子内容

```js
export function buildRequest({ selectionContext, runtime }) {
  const parents = selectionContext.items.parents;

  for (const parent of parents) {
    const title = parent.item.getField("title");
    const attachments = parent.attachments;  // 该父条目下的附件
    const notes = parent.notes;              // 该父条目下的笔记
  }

  // ...
}
```

### 检查选择类型决定行为

```js
export function preflight({ selectionContext }) {
  const { selectionType } = selectionContext;

  if (selectionType === "none") {
    // 没有选中任何条目，跳过
    return { kind: "skip", reason: "未选中条目" };
  }

  if (selectionType === "attachment") {
    // 用户选中的都是附件，走附件处理逻辑
  } else if (selectionType === "parent") {
    // 用户选中的都是父条目，展开第一个符合条件的附件
  }

  return { kind: "continue", context: { selectionType } };
}
```

### Attachment Candidate Planning

```json
{
  "inputs": {
    "member": {
      "kind": "attachment",
      "accepts": { "mime": ["application/pdf"] }
    },
    "grouping": { "mode": "each" }
  },
  "validateSelection": {
    "require": {
      "selection": {
        "counts": { "attachments": { "min": 1 } },
        "allowMixed": false
      }
    },
    "select": { "policy": "input-member", "source": "selected" },
    "filters": [
      { "kind": "source-file-exists", "phase": "availability" }
    ]
  }
}
```

`require.selection` reads the original SelectionContext once. The selector
produces ordered candidates, attachment MIME compatibility runs before filters,
and `inputs.grouping` creates immutable top-level units.

### Workflows Without Selected Items

Use `member.kind: "selection"`, `grouping.mode: "all"`, the `selection`
selector, and `trigger.requiresSelection: false`. The selector then produces
the complete empty SelectionContext as the single member. Selection
requirements remain active and must not make the empty selection impossible.

## Declarative Candidate Filters

```json
{
  "validateSelection": {
    "select": { "policy": "generated-note-candidates" },
    "filters": [
      {
        "kind": "generated-note-kinds-absent",
        "phase": "availability",
        "noteKinds": ["digest"]
      }
    ]
  }
}
```

`validateSelection` owns candidate production and filtering. `inputs` owns
the execution member and grouping. Hooks consume the prepared unit and must not
reconstruct selection planning.
## 下一步

- [Host API 参考](host-api) — 在 hook 中操作 Zotero 数据的完整 API
- [清单文件编写](manifest) — 定义 workflow 的输入单元类型
