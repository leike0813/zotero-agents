# Hook 系统

Hook 是 workflow 的可扩展点——在 workflow 执行的不同阶段，插件的 Workflow Runtime 会调用对应的 Hook 脚本，让你能以 JavaScript 干预和控制执行流程。

一个 workflow 最多可以包含 **4 个 Hook**，其中 `applyResult` 是唯一必需的。

> **关于输入过滤**：旧的 `filterInputs` Hook 已被声明式 `validateSelection` 机制替代。使用 `workflow.json` 中的 `validateSelection` 定义输入约束，无需编写 JavaScript。详见 [工作流清单文件编写](manifest#selection-validation)。

## Hook 脚本结构

每个 Hook 脚本都是 `.mjs`（ES Module）文件，导出命名函数：

```js
// hooks/buildRequest.mjs
export function buildRequest({ selectionContext, preflight, manifest, executionOptions, runtime }) {
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
  hookName,         // 当前 Hook 名称: "preflight" | "buildRequest" | "applyResult" | ""
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
  preflight,         // 可选的 preflight 方案/单元/上下文
  manifest,         // workflow.json
  executionOptions, // { workflowParams, providerOptions }
  runtime,          // 运行时上下文
}): unknown
```

**与声明式 request 的关系：** `buildRequest` 与 `workflow.json` 中的 `request` 字段互斥。如果同时存在，`buildRequest` 优先。

当 workflow 声明了 `hooks.preflight` 时，runtime 会将规范化后的 preflight 上下文作为 `preflight` 参数传入 `buildRequest`。此上下文不会合并到 `selectionContext` 中；请将其视为独立的执行规划元数据。

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

**示例：使用 Preflight 单元上下文的请求**

```js
export function buildRequest({ selectionContext, preflight, runtime }) {
  const attachment = selectionContext.items.attachments[0];
  return {
    kind: "generic-http.steps.v1",
    file: {
      path: runtime.helpers.getAttachmentFilePath(attachment),
      page_ranges: preflight?.unit?.context?.page_ranges,
    },
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

## 2. preflight — 规划或短路执行

`preflight` 在声明式选择解析之后、`buildRequest` 或声明式请求构造之前运行。用于需要已解析的输入单元但不属于菜单启用判断的轻量级本地决策。

`preflight` 不得写入 Zotero 数据，不得构造后端请求，也不得替代 `validateSelection`。所有 Zotero 写入仍属于 `applyResult`，所有后端请求负载仍属于 `buildRequest` 或清单中的 `request` 字段。

**签名：**

```ts
function preflight({
  selectionContext,  // 已解析的输入单元上下文
  parent,            // 当前单元的父条目（如果可用）
  attachment,        // 当前单元的附件条目（如果可用）
  note,              // 当前单元的笔记条目（如果可用）
  manifest,          // workflow.json
  executionOptions,  // { workflowParams, providerOptions }
  runtime,           // 运行时上下文
}): PreflightOutcome
```

**结果：Continue（继续）**

继续正常请求构造，并可附带规划上下文：

```js
export async function preflight({ parent }) {
  return {
    kind: "continue",
    context: {
      doi: parent?.DOI || "",
      source: "selected-parent",
    },
  };
}
```

`context` 可在 `buildRequest` 中通过 `preflight.context` 以及在 `applyResult` 中通过 `resultContext.preflight.context` 访问。

**结果：Skip（跳过）**

仅跳过当前输入单元：

```js
export function preflight({ parent }) {
  if (!parent?.DOI) {
    return { kind: "skip", reason: "缺少 DOI" };
  }
  return { kind: "continue" };
}
```

如果所有输入单元都被跳过，执行将结束而不提交后端任务。

**结果：Short-Circuit Apply（短路执行）**

跳过后端执行，直接调用标准的 `applyResult` 路径：

```js
export async function preflight({ parent, runtime }) {
  const metadata = await lookupMetadataLocally(parent?.DOI, runtime);
  if (!metadata) {
    return { kind: "continue" };
  }
  return {
    kind: "short-circuit-apply",
    apply: {
      result: { ok: true, source: "local-metadata", item: metadata },
      request: { kind: "local.metadata.preflight.v1" },
      runResult: { status: "success" },
    },
    context: { source: "local-metadata" },
  };
}
```

这对于元数据管理类 workflow 很有用：如果可信标识符的本地查询成功，`applyResult` 可以直接更新父条目而无需调用后端。如果查询缺失或质量较低，返回 `continue` 让 `buildRequest` 构造正常的后端请求。

**结果：Replace Units（替换单元）**

将一个已解析的输入单元替换为多个虚拟请求单元：

```js
export function preflight({ attachment }) {
  const chunks = [
    { id: "part-1", order: 0, context: { page_ranges: "1-200" } },
    { id: "part-2", order: 1, context: { page_ranges: "201-360" } },
  ];
  return {
    kind: "replace-units",
    units: chunks,
  };
}
```

每个虚拟单元都会经过正常的 `buildRequest` 路径。单元特定的上下文可在 `preflight.unit.context` 中访问。

**聚合单次 Apply**

对于需要将多个后端结果合并为一次最终 Zotero 写入的拆分输入类 workflow，可添加聚合计划：

```js
export function preflight() {
  return {
    kind: "replace-units",
    units: [
      { id: "part-1", order: 0, context: { page_ranges: "1-200" } },
      { id: "part-2", order: 1, context: { page_ranges: "201-360" } },
    ],
    aggregate: {
      id: "pdf-pages",
      mode: "single-apply",
      applyWhen: "all-succeeded",
      orderBy: "unit.order",
    },
  };
}
```

v1 版本中，聚合 apply 仅支持 `mode: "single-apply"`、`applyWhen: "all-succeeded"` 和 `orderBy: "unit.order"`。子后端任务会被收集，待所有子任务成功后调用一次 `applyResult`。如有任何子任务失败，不会执行部分聚合 apply。

## 3. normalizeSettings — 规范化参数

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

## 4. applyResult — 处理结果（必需）

这是 workflow **唯一必需的 Hook**，负责将后端的执行结果写入 Zotero。

**签名：**

```ts
function applyResult({
  parent,           // 父 Zotero 条目
  bundleReader,     // 结果包读取器
  resultContext,    // 结构化结果上下文，包含 preflight/aggregate 元数据
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

当声明了 `preflight` 时，`resultContext.preflight` 暴露当前 apply 调用的执行方案、单元 ID、单元上下文和共享上下文。`selectionContext` 不会被 preflight 修改。

当 `replace-units` 使用 `aggregate.single-apply` 时，`resultContext.aggregate.children` 包含有序的子结果：

```ts
resultContext.aggregate.children = [
  {
    unitId: "part-1",
    order: 0,
    request,
    runResult,
    resultContext,
    bundleReader,
  },
  {
    unitId: "part-2",
    order: 1,
    request,
    runResult,
    resultContext,
    bundleReader,
  },
];
```

聚合 `applyResult` 应从 `child.bundleReader` 读取每个子 bundle，按顺序合并产物，并一次性写入最终 Zotero 结果。例如，类似 MinerU 的 workflow 可将一个 PDF 提交为多个 `page_ranges` 任务，然后合并 `full.md` 文件并命名空间化图片路径，最后创建一个最终的 Markdown 附件。

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

- [选择上下文](selection-context) — selectionContext 的结构详解
- [Host API 参考](host-api) — 完整的 API 功能参考
- [打包与部署](packaging) — 如何打包和部署 workflow
