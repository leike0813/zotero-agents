# Hook 系统

Hook 是 workflow 的可扩展点——在 workflow 执行的不同阶段，插件的 Workflow Runtime 会调用对应的 Hook 脚本，让你能以 JavaScript 干预和控制执行流程。

一个 workflow 最多可以包含 **3 个 Hook**，其中 `applyResult` 是唯一必需的。

> **关于输入过滤**：旧的 `filterInputs` Hook 已被声明式 `validateSelection` 机制替代。建议使用 `workflow.json` 中的 `validateSelection` 定义输入约束，无需编写 JavaScript。详见 [工作流清单文件编写](#doc/workflows%2Fcustom%2Fmanifest#selection-validation)。

## Hook 脚本结构

每个 Hook 脚本都是 `.mjs`（ES Module）文件，导出命名函数：

```js
// hooks/buildRequest.mjs
export function buildRequest({ selectionContext, manifest, executionOptions, runtime }) {
  // 实现逻辑
  return requestSpec;
}
```

## 运行时上下文（runtime）

所有 Hook 都接收一个 `runtime` 参数，提供对 Zotero 和各种工具的直接访问。

```js
runtime = {
  zotero,           // Zotero 全局对象
  handlers,         // 底层数据处理 handler
  hostApi,          // 高级 Host API（推荐使用）
  helpers,          // Hook 辅助工具函数
  addon,            // 插件配置

  workflowId,       // 当前 workflow ID
  workflowRootDir,  // workflow.json 所在目录的绝对路径
  workflowSourceKind, // "official" | "dev-local" | "user" | ""
  packageId,        // 所属 package ID（仅在工作流包中可用）
  packageRootDir,   // package 根目录的绝对路径

  hostApiVersion,   // Host API 版本号
  hookName,         // 当前 Hook 名称: "buildRequest" | "applyResult" | ""
  debugMode,        // 是否处于调试模式

  fetch,            // 全局 fetch（如果可用）
  Buffer,           // Node.js Buffer（如果可用）
  btoa,             // Base64 编码（如果可用）
  atob,             // Base64 解码（如果可用）
  TextEncoder,      // 文本编码器（如果可用）
  TextDecoder,      // 文本解码器（如果可用）
  FileReader,       // 文件读取器（如果可用）
  navigator,        // Navigator 对象（如果可用）
}
```

**最佳实践：** 优先使用 `runtime.hostApi`（高级 API），只在 `hostApi` 不满足需求时使用 `runtime.handlers` 或 `runtime.zotero`。

## 1. buildRequest — 构建请求

当 `workflow.json` 中的声明式 `request` 不足以描述复杂请求时，使用 `buildRequest` 动态构建请求负载。

**签名：**

```ts
function buildRequest({
  selectionContext,  // 过滤后的选择上下文
  manifest,         // workflow.json
  executionOptions, // { workflowParams, providerOptions }
  runtime,          // 运行时上下文
}): unknown
```

**与声明式 request 的关系：** `buildRequest` 与 `workflow.json` 中的 `request` 字段互斥。如果同时存在，`buildRequest` 优先。

**示例：传递式请求（pass-through）**

```js
export function buildRequest({ selectionContext, executionOptions, runtime }) {
  return {
    kind: "pass-through.run.v1",
    selectionContext,
    parameter: executionOptions?.workflowParams || {},
  };
}
```

**示例：多步骤 sequence 请求**

```js
export async function buildRequest({ selectionContext, executionOptions, runtime }) {
  const sourcePath = resolveAttachmentPath(selectionContext, runtime);
  const language = executionOptions?.workflowParams?.language || "zh-CN";

  return {
    kind: "skillrunner.sequence.v1",
    sequence: {
      steps: [
        {
          id: "step1",
          skill_id: "my-analysis-skill",
          mode: "auto",
          workspace: "new",
          parameter: { language, source_path: sourcePath },
        },
        {
          id: "step2",
          skill_id: "my-enrichment-skill",
          mode: "auto",
          workspace: "reuse-workflow",
          handoff: {
            bindings: [
              {
                kind: "value",
                source: "output_field_name",
                target: "/input/field_name",
                step: "step1",
              },
            ],
          },
        },
      ],
    },
  };
}
```

## 2. normalizeSettings — 规范化参数

在设置持久化之前或执行之前对参数进行规范化。

**签名：** 此 Hook 根据阶段接收不同参数：

```ts
function normalizeSettings(args: {
  // persisted 阶段：参数保存到偏好设置时
  phase: "persisted";
  workflowId: string;
  manifest: WorkflowManifest;
  previous: { backendId?, workflowParams?, providerOptions? };
  incoming: { backendId?, workflowParams?, providerOptions? };
  merged: { backendId?, workflowParams?, providerOptions? };
} | {
  // execution 阶段：执行之前
  phase: "execution";
  workflowId: string;
  manifest: WorkflowManifest;
  rawWorkflowParams: Record<string, unknown>;
  normalizedWorkflowParams: Record<string, unknown>;
}): unknown
```

**用途：**

- 参数之间的联动校验（如 A 选项选了某个值后，B 选项的默认值应变化）
- 参数降级处理（如旧版参数迁移到新版）
- 执行前清理非法值

## 3. applyResult — 处理结果（必需）

这是 workflow **唯一必需的 Hook**，负责将后端的执行结果写入 Zotero。

**签名：**

```ts
function applyResult({
  parent,           // 父 Zotero 条目
  bundleReader,     // 结果包读取器
  resultContext,    // 结构化结果上下文
  sequenceStep,     // 序列步骤元数据（sequence 执行中存在）
  productStorage,   // 产物存储 API
  request,          // 发出的原始请求
  runResult,        // 运行结果元数据
  manifest,         // workflow.json
  runtime,          // 运行时上下文
}): unknown

// sequenceStep 结构：
// {
//   id: string;           // 步骤 ID
//   index: number;        // 序列中的零基索引
//   workflowId: string;   // 此步骤的子 workflow ID
//   skillId: string;      // 此步骤执行的 skill ID
//   finalStep: boolean;   // 是否是最后一步
//   phase: "sequence-step";
// }
```

**bundleReader 的用法：**

```js
// 读取产物 ZIP 包中的文件
const digestMd = await bundleReader.readText("artifacts/digest.md");

// 获取解压后的产物目录路径
const extractedDir = await bundleReader.getExtractedDir();
```

**示例：从 bundle 写入笔记**

```js
export async function applyResult({ parent, bundleReader, runtime }) {
  if (!parent) return { applied: false };

  const parentItem = runtime.helpers.resolveItemRef(parent);
  const digestMd = await bundleReader.readText("artifacts/digest.md");

  const htmlContent = runtime.helpers.toHtmlNote("文献摘要", digestMd);
  const newNote = await runtime.hostApi.mutations.execute({
    operation: "note.createChild",
    parentItem: parentItem.getField("id"),
    data: { content: htmlContent },
  });

  return { applied: true, noteId: newNote.id };
}
```

**示例：从 bundle 提取文件到磁盘（MinerU 风格）**

```js
export async function applyResult({ parent, bundleReader, runtime }) {
  if (!parent) return { applied: false };

  const extractedDir = await bundleReader.getExtractedDir();
  const { file } = runtime.hostApi;

  const mdContent = await bundleReader.readText("full.md");
  const targetPath = `/path/to/output.md`;
  await file.writeText(targetPath, mdContent);

  return { applied: true, output_path: targetPath };
}
```

## Hook 辅助函数（helpers）

`runtime.helpers` 提供了一系列辅助函数：

| 函数 | 说明 |
|------|------|
| `getAttachmentParentId(entry)` | 获取附件的父条目 ID |
| `getAttachmentFilePath(entry)` | 获取附件的本地文件路径 |
| `getAttachmentFileName(entry)` | 获取附件文件名 |
| `getAttachmentFileStem(entry)` | 获取附件文件名（无扩展名） |
| `getAttachmentDateAdded(entry)` | 获取附件的 `dateAdded` 时间戳 |
| `basenameOrFallback(path, fallback)` | 提取基名或返回回退字符串 |
| `isMarkdownAttachment(entry)` | 判断是否为 Markdown 附件 |
| `isPdfAttachment(entry)` | 判断是否为 PDF 附件 |
| `pickEarliestPdfAttachment(entries)` | 从附件列表中选最早的 PDF |
| `cloneSelectionContext(ctx)` | 深拷贝选择上下文 |
| `withFilteredAttachments(ctx, items)` | 在上下文中保留指定的附件 |
| `resolveItemRef(ref)` | 将条目引用解析为 Zotero.Item |
| `toHtmlNote(title, body)` | 将 Markdown 转换为 HTML 笔记内容 |
| `normalizeReferenceAuthors(value)` | 规范化参考文献作者列表 |
| `normalizeReferenceEntry(entry, index)` | 规范化单条参考文献条目 |
| `normalizeReferencesArray(value)` | 规范化参考文献数组 |
| `normalizeReferencesPayload(payload)` | 规范化参考文献 payload 对象 |
| `replacePayloadReferences(payload, refs)` | 替换 payload 中的参考文献 |
| `resolveReferenceSource(entry)` | 解析参考文献的来源字段 |
| `renderReferenceLocator(entry)` | 渲染卷/期/页码的定位字符串 |
| `renderReferencesTable(references)` | 将参考文献渲染为 HTML 表格 |

## 下一步

- [选择上下文](#doc/workflows%2Fcustom%2Fselection-context) — selectionContext 的结构详解
- [Host API 参考](#doc/workflows%2Fcustom%2Fhost-api) — 完整的 API 功能参考
- [打包与部署](#doc/workflows%2Fcustom%2Fpackaging) — 如何打包和部署 workflow
