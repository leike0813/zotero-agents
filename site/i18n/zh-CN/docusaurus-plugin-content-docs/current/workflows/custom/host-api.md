# Host API 参考

`runtime.hostApi` 是 workflow hook 与 Zotero 交互的主要接口。它封装了对 Zotero 库、条目、文件系统、偏好设置等的完整操作能力。

## 条目操作（hostApi.items）

```ts
hostApi.items = {
  get: (ref) => Zotero.Item | null,          // 通过引用获取条目
  resolve: (ref) => Zotero.Item,             // 同 get，但条目不存在时抛出异常
  getByLibraryAndKey: (libraryID, key) => Zotero.Item | null,  // 通过库 ID + Key 获取
  getAll: () => Promise<Zotero.Item[]>,      // 获取所有条目
}
```

`ref` 可以是 `Zotero.Item` 对象、数字 ID 或字符串 Key。

**示例：**

```js
// 通过 ID 获取条目
const item = hostApi.items.get(12345);

// 通过库 Key 获取
const item = hostApi.items.getByLibraryAndKey(1, "ABCD1234");
```

## 上下文（hostApi.context）

```ts
hostApi.context = {
  getCurrentView: () => ZoteroHostCurrentViewDto,  // 当前活动视图信息
  getSelectedItems: () => ZoteroHostItemSummaryDto[],  // 当前选中的条目列表
}
```

**示例：**

```js
const view = hostApi.context.getCurrentView();
// { libraryID: 1, selectedItems: [...], ... }

const selected = hostApi.context.getSelectedItems();
// [{ id, key, libraryID, title, ... }, ...]
```

## 库操作（hostApi.library）

```ts
hostApi.library = {
  listItems: (args) => Promise<LibraryListResponse>,       // 分页列出条目
  searchItems: (args) => Promise<ItemSummaryDto[]>,        // 搜索条目
  getItemDetail: (ref) => Promise<ItemDetailDto | null>,   // 获取条目详细信息
  getItemNotes: (ref, args?) => Promise<NoteDto[]>,        // 获取条目的笔记列表
  getNoteDetail: (ref, args?) => Promise<NoteDetailChunkDto>, // 获取笔记正文
  listNotePayloads: (ref) => Promise<NotePayloadDto[]>,    // 列出笔记的 embedded payload
  getNotePayload: (ref, args?) => Promise<NotePayloadDto>, // 获取指定 payload
  getItemAttachments: (ref) => Promise<AttachmentDto[]>,   // 获取条目的附件列表
}
```

**示例：**

```js
// 搜索条目
const results = await hostApi.library.searchItems({
  query: "transformer",
  limit: 10,
});

// 获取条目的笔记
const notes = await hostApi.library.getItemNotes(ref);

// 获取条目的附件
const attachments = await hostApi.library.getItemAttachments(ref);
```

## 变更操作（hostApi.mutations）

用来创建、更新、删除 Zotero 中的数据。写操作需要用户审批（在 Zotero UI 中确认）。

```ts
hostApi.mutations = {
  preview: (request) => Promise<MutationPreviewResponse>,   // 预览变更效果
  execute: (request) => Promise<MutationExecuteResponse>,   // 执行变更
}
```

### 支持的变更操作

| `operation` | 用途 | 说明 |
|-------------|------|------|
| `item.updateFields` | 更新条目字段 | 修改标题、作者、日期等字段 |
| `item.addTags` | 添加标签 | 为条目添加一个或多个标签 |
| `item.removeTags` | 移除标签 | 从条目移除指定标签 |
| `note.createChild` | 创建子笔记 | 在父条目下创建新的笔记 |
| `note.update` | 更新笔记 | 修改已有笔记的内容 |
| `note.upsertPayload` | 更新 embedded payload | 更新笔记的工作流负载附件 |
| `literature.ingest` | 导入文献 | 将一篇论文导入到 Zotero |
| `collection.addItems` | 添加到合集 | 将条目添加到合集 |
| `collection.removeItems` | 从合集移除 | 从合集中移除条目 |

**示例：创建笔记**

```js
const result = await hostApi.mutations.execute({
  operation: "note.createChild",
  parentItem: parentItem.getField("id"),
  data: {
    content: htmlContent,
    tags: ["generated"],
  },
});
```

**示例：添加标签**

```js
await hostApi.mutations.execute({
  operation: "item.addTags",
  item: itemId,
  data: { tags: ["field:computer_science", "method:deep_learning"] },
});
```

## 笔记操作（hostApi.notes）

```ts
hostApi.notes = {
  importEmbeddedImage: (noteRef, image) => Promise<{
    attachmentKey: string;
    attachmentItem: Zotero.Item;
    mimeType: string;
    bytes: number;
  }>,
}
```

### 图片处理（hostApi.images）

```ts
hostApi.images = {
  prepareForNoteEmbedding: (source, options?) => Promise<PreparedNoteImage>,
}
```

用于将图片处理为可在笔记中嵌入的格式：

```js
const prepared = await hostApi.images.prepareForNoteEmbedding(filePath, {
  maxLongEdge: 720,
  targetBytes: 180 * 1024,
});

const result = await hostApi.notes.importEmbeddedImage(noteRef, prepared);
```

## 附件操作（hostApi.attachments）

```ts
hostApi.attachments = {
  // 底层附件 handler 的所有方法
  // 包括：列出附件、获取附件路径、创建附件等
}
```

## 标签操作（hostApi.tags）

```ts
hostApi.tags = {
  // 底层标签 handler 的所有方法
  // 包括：列出标签、获取标签、创建标签等
}
```

## 合集操作（hostApi.collections）

```ts
hostApi.collections = {
  // 底层合集 handler 的所有方法
  // 包括：列出合集、获取子合集等
}
```

## 文件操作（hostApi.file）

```ts
hostApi.file = {
  readText: (path) => Promise<string>,                    // 读取文本文件
  writeText: (path, content) => Promise<void>,            // 写入文本文件
  readBytes: (path) => Promise<Uint8Array>,               // 读取二进制文件
  writeBytes: (path, bytes) => Promise<void>,             // 写入二进制文件
  copy: (source, target) => Promise<void>,                // 复制文件
  exists: (path) => Promise<boolean>,                     // 检查文件是否存在
  makeDirectory: (path) => Promise<void>,                 // 创建目录（含父目录）
  pathToFile: (path) => nsIFile,                          // 路径转 Zotero 文件对象
  getTempDirectoryPath: () => string,                     // 获取临时目录路径
  pickDirectory: (args?) => Promise<string | null>,       // 打开目录选择器
  pickFile: (args?) => Promise<string | null>,            // 打开文件选择器
  pickFiles: (args?) => Promise<string[] | null>,         // 打开多文件选择器
}
```

**示例：**

```js
// 读取文件
const content = await hostApi.file.readText("/path/to/file.md");

// 写入文件
await hostApi.file.writeText("/path/to/output.md", newContent);

// 打开目录选择器让用户选择导出目录
const dir = await hostApi.file.pickDirectory({
  title: "选择导出目录",
});
if (dir) {
  await hostApi.file.writeText(`${dir}/result.md`, content);
}
```

## 偏好设置（hostApi.prefs）

```ts
hostApi.prefs = {
  get: (key, global?) => unknown,      // 读取偏好设置
  set: (key, value, global?) => void,  // 写入偏好设置
  clear: (key, global?) => void,       // 清除偏好设置
}
```

前缀由插件自动处理，只需传入键名即可。

**示例：**

```js
// 读取配置
const vocab = hostApi.prefs.get("tagVocabularyJson");

// 写入配置
hostApi.prefs.set("mySetting", "myValue");
```

## UI 通知（hostApi.notifications）

```ts
hostApi.notifications = {
  toast: ({ text, type? }) => void,
}
// type: "default" | "success" | "error"
```

**示例：**

```js
hostApi.notifications.toast({
  text: "处理完成！",
  type: "success",
});
```

## 运行时日志（hostApi.logging）

```ts
hostApi.logging = {
  appendRuntimeLog: (input) => void,
}
```

用于向运行时日志记录器追加诊断信息。

## 插件配置（hostApi.addon）

```ts
hostApi.addon = {
  getConfig: () => ({ addonName, addonRef, prefsPrefix }),
}
```

## API 版本（hostApi.version）

```ts
hostApi.version: number
```

当前 Host API 版本号。可用于编写跨版本兼容的 hook 时的版本校验。

## 父条目操作（hostApi.parents）

```ts
hostApi.parents = {
  // 底层父条目 handler 操作
}
```

提供父条目管理的底层访问。除非需要更底层的 handler 接口，否则优先使用 `hostApi.library` 和 `hostApi.mutations`。

## 命令操作（hostApi.command）

```ts
hostApi.command = {
  // 底层命令 handler 操作
}
```

命令执行的底层接口。通常不需要在 workflow hook 中使用。

## 编辑器操作（hostApi.editor）

```ts
hostApi.editor = {
  openSession: (args) => ReturnType<typeof openWorkflowEditorSession>,
  registerRenderer: (rendererId, renderer) => void,
  unregisterRenderer: (rendererId) => void,
}
```

管理工作流编辑器会话。`registerRenderer` 和 `unregisterRenderer` 允许为工作流特定的输出格式注册自定义渲染器。

## Synthesis 操作（hostApi.synthesis）

```ts
hostApi.synthesis?: SynthesisService
```

提供对 Synthesis Workbench 服务的访问（主题、概念、标签、引文图谱等）。仅在 Synthesis 系统已初始化时可用。

## 完整示例

```js
export async function applyResult({ parent, bundleReader, runtime }) {
  const { hostApi, helpers } = runtime;

  // 1. 解析父条目
  const parentItem = helpers.resolveItemRef(parent);

  // 2. 读取 bundle 中的产物
  const markdownContent = await bundleReader.readText("result/output.md");

  // 3. 转换为 HTML 笔记
  const htmlContent = helpers.toHtmlNote("处理结果", markdownContent);

  // 4. 创建笔记
  const noteResult = await hostApi.mutations.execute({
    operation: "note.createChild",
    parentItem: parentItem.getField("id"),
    data: { content: htmlContent },
  });

  // 5. 添加标签
  await hostApi.mutations.execute({
    operation: "item.addTags",
    item: parentItem.getField("id"),
    data: { tags: ["processed"] },
  });

  // 6. 通知用户
  hostApi.notifications.toast({
    text: `处理完成：${parentItem.getField("title")}`,
    type: "success",
  });

  return { applied: true, noteId: noteResult.id };
}
```

## 下一步

- [打包与部署](packaging) — 发布自定义 workflow
- [调试与测试](debugging) — 验证 workflow 的正确性
