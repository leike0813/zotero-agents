# Selection/Context 组件说明

## 目标

准确识别用户当前选择的对象类型与范围，并生成完整上下文（Metadata、注释、标签、集合、附件、父/子条目），为后续 Job 构建提供统一输入。

## Schema 引用

- JSON Schema: `doc/components/selection-context.schema.json`

## 职责

- 识别选中对象类型：父条目、子条目、附件条目、笔记条目（含多选）
- 构建按类型分支的上下文结构
- 聚合父/子条目与附件信息，形成完整数据快照
- 统一输出上下文结构供 Job/Workflow 使用

SelectionContext 只描述原始 Zotero 选择与稳定关系，不负责决定 workflow
执行单元。v2 input planner 按固定顺序消费它：

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

`require.selection` 每次 confirmed planning 只读取原始 SelectionContext
一次；selector 生成的 candidate 会携带 scoped context，grouping 再将这些
context 合并为 request/preflight 实际消费的顶层执行单元。SelectionContext
本身不是候选列表或执行单元的事实源。

## 输入

- Zotero 当前选中对象列表（可能为空、单选、多选）
- Zotero APIs：条目、附件、注释、标签、集合、文件元信息

## 输出（按类型分支）

### A. 选中父条目（Parent Item）

输出包含：
- `item`: 父条目 Metadata
- `attachments`: 父条目的附件列表（AttachmentContext）
- `notes`: 父条目的笔记列表（NoteLite，包含 `note` 文本）
- `tags`: 父条目标签
- `collections`: 父条目所属集合
- `children`: 子条目列表（仅 ItemBase，非附件/非笔记）

### B. 选中子条目（Child Item）

输出包含：
- `item`: 子条目 Metadata
- `parent`: 对应父条目 Metadata
- `attachments`: 子条目相关附件（AttachmentContext）
- `notes`: 子条目笔记（NoteLite）
- `tags`: 子条目标签
- `collections`: 子条目所属集合

### C. 选中附件条目（Attachment Item）

输出包含：
- `item`: 附件 Metadata（AttachmentContext.item）
- `parent`: 对应父条目 Metadata
- `filePath`: 附件路径（可能为 null）
- `mimeType`: MIME 类型（可能为 null）

### D. 多选混合（Mixed Selection）

输出包含：
- `items`: 按类型分组的结果集合（parent/child/attachment/note）
- `summary`: 统计信息（数量、类型分布）
- `warnings`: 异常情况（缺失父条目、附件路径不可用等）
 
### E. 选中笔记（Note）

输出包含：
- `item`: 笔记 Metadata
- `parent`: 对应父条目 Metadata（可能为 null）
- `tags`: 笔记标签
- `collections`: 笔记所属集合

说明：
- 笔记内容不直接挂在 NoteContext 上，但 `item.data.note` 会包含原始笔记内容

## 数据结构（建议）

```
SelectionContext {
  selectionType: "parent" | "child" | "attachment" | "note" | "mixed" | "none"
  items: {
    parents: ParentContext[]
    children: ChildContext[]
    attachments: AttachmentContext[]
    notes: NoteContext[]
  }
  summary: {
    parentCount: number
    childCount: number
    attachmentCount: number
    noteCount: number
  }
  warnings: string[]
  sampledAt: string
}
```

## Schema（固定）

SelectionContext:

- selectionType: "parent" | "child" | "attachment" | "note" | "mixed" | "none"
- items.parents: ParentContext[]
- items.children: ChildContext[]
- items.attachments: AttachmentContext[]
- items.notes: NoteContext[]
- summary.parentCount: number
- summary.childCount: number
- summary.attachmentCount: number
- summary.noteCount: number
- warnings: string[]
- sampledAt: ISO-8601 string

ParentContext:
- item: ItemBase
- attachments: AttachmentContext[]
- notes: NoteLite[]
- tags: Tag[]
- collections: string[]
- children: ItemBase[]

ChildContext:
- item: ItemBase
- parent: ItemBase | null
- attachments: AttachmentContext[]
- notes: NoteLite[]
- tags: Tag[]
- collections: string[]

AttachmentContext:
- item: ItemBase
- parent: ItemBase | null
- filePath: string | null
- mimeType: string | null

NoteContext:
- item: ItemBase
- parent: ItemBase | null
- tags: Tag[]
- collections: string[]

ItemBase:
- id: number
- key: string
- itemType: string
- title: string
- libraryID: number
- parentItemID: number | null
- data: object | null

NoteLite:
- ItemBase fields
- note: string (HTML)  // 仅在 parent/child 的 notes 列表中提供

Tag:
- tag: string
- type?: number

## 行为与边界

- 空选择时返回 `selectionType = "none"` 与空集合
- 缺失父条目时记录 `warnings`
- 附件路径不可读时不抛错，记录 `warnings` 并保留元数据
- `children` 仅包含非附件/非笔记的子条目
- 仅负责“读取与聚合”，不做修改与写回

## 失败模式

- Zotero API 读取失败：返回空结构并记录错误信息
- 附件文件丢失：仅记录警告，不终止流程

## 测试点（TDD）

- 单选父条目，输出包含完整 Metadata、附件、注释、标签、集合、子条目
- 单选子条目，输出包含父条目信息
- 单选附件，输出包含父条目与父条目附件
- 多选混合，输出类型分组与 summary
- 缺失父条目/附件路径不可读时的 warnings
