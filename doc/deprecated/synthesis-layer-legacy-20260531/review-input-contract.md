# Synthesis Review Input 合同

本文档记录下游文献综述写作 workflow 从 Synthesis layer 读取的 v1 输入合同。它描述 read-only DTO，不描述新的 synthesis 生成流程。

Status: `implemented`。`synthesis.get_review_input` 已作为 read-only DTO 合同存在；后续扩展必须继续保持只读、有界和不触发 worker。

## DTO 合同

Review workflow input 是 JSON-safe DTO，`kind` 固定为：

```text
synthesis.review_workflow_input
```

当前 DTO 包含：

- topic synthesis Markdown；
- topic synthesis metadata；
- saved Topic Definition 与 Topic Resolver snapshot；
- saved Resolved Paper Set snapshot；
- resolved papers 的 Paper Registry readiness rows；
- resolved papers 的 Citation Graph bounded slice；
- missing artifact diagnostics；
- topic synthesis artifact 中的 timeline content；
- 可选 `structured_topic`，包含 artifact、manifest、claims、timeline、paper evidence、external literature analysis、taxonomy、coverage、review outline 等结构化 section。

DTO 使用 `libraryId:itemKey` 这类 portable paper refs。Zotero numeric item id 不是主要身份合同。

## MCP 入口

只读 MCP 工具：

```text
synthesis.get_review_input
```

该工具接受 `topicId` 以及可选 size/slice 控制参数。它通过 Synthesis service 返回 review input DTO。

当前实现锚点：

- `src/modules/synthesis/reviewInput.ts`
  - `ReviewWorkflowInput`
  - `buildReviewWorkflowInput`
- `src/modules/synthesis/service.ts`
  - `getReviewInput`
- `src/modules/synthesis/mcpService.ts`

## 有界读取与裁剪

`getReviewInput` 是 read-only 路径：

- 不写 assets；
- 不重新运行 topic resolver；
- 不触发 agent synthesis；
- 不 enqueue worker；
- 不扫描旧 JSON 作为普通 fallback。

为了避免向下游 workflow 传递过大的上下文，service 会根据调用参数裁剪：

- topic markdown 最大字符数；
- citation graph nodes 数量；
- citation graph edges 数量；
- 是否包含 `structured_topic`。

裁剪结果应通过 diagnostics/warnings 表达，而不是静默伪装成完整输入。

## 边界

Synthesis Layer v1 不提供以下 review-specific assets：

- method lineage graph；
- claim conflict graph；
- research gap graph；
- topic timeline graph；
- generated review prose。

这些资产可以由后续 workflow 生成，但它们不是 Synthesis Layer v1 canonical infrastructure。
