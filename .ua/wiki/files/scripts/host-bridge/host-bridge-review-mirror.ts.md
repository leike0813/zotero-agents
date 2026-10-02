
# scripts/host-bridge/host-bridge-review-mirror.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/host-bridge-review-mirror.ts -->

构建 Host Bridge surface 的审阅镜像：把物化后的 skill/reference 文档与基线做逐条映射，统计 unmapped、downgraded、unauthorized dropped 与重复项，支撑语义 parity 审阅。
源码：[scripts/host-bridge/host-bridge-review-mirror.ts](../../../../../scripts/host-bridge/host-bridge-review-mirror.ts)

## 符号（11）
<!-- node: function:scripts/host-bridge/host-bridge-review-mirror.ts:assertInside -->
<!-- node: function:scripts/host-bridge/host-bridge-review-mirror.ts:buildHostBridgeReviewMirrorInventory -->
<!-- node: function:scripts/host-bridge/host-bridge-review-mirror.ts:checkHostBridgeReviewMirror -->
<!-- node: function:scripts/host-bridge/host-bridge-review-mirror.ts:finalizeHostBridgeReviewMirror -->
<!-- node: function:scripts/host-bridge/host-bridge-review-mirror.ts:listMarkdown -->
<!-- node: function:scripts/host-bridge/host-bridge-review-mirror.ts:prepareHostBridgeReviewMirror -->
<!-- node: function:scripts/host-bridge/host-bridge-review-mirror.ts:protectedMarkdownStructure -->
<!-- node: function:scripts/host-bridge/host-bridge-review-mirror.ts:releaseIdentity -->
<!-- node: function:scripts/host-bridge/host-bridge-review-mirror.ts:renderIndex -->
<!-- node: function:scripts/host-bridge/host-bridge-review-mirror.ts:sourceCommit -->
<!-- node: function:scripts/host-bridge/host-bridge-review-mirror.ts:validateTranslations -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| assertInside | 函数 | 146–157 | 简单 | validation、security、path | 0 | 断言路径位于允许的仓库根内，防止审阅过程越界读取。 |
| buildHostBridgeReviewMirrorInventory | 函数 | 159–267 | 复杂 | inventory、governance、metrics | 0 | 盘点全部 agent-facing surface 文档，记录条目归属、指令行数与字符数基线。 |
| checkHostBridgeReviewMirror | 函数 | 489–584 | 复杂 | validation、governance、entry-point | 0 | 审阅闸门：厚度或语义 parity 相对固定 baseline 下降即失败，阻止 surface 被压缩。 |
| finalizeHostBridgeReviewMirror | 函数 | 428–487 | 中等 | governance、metrics、review | 0 | 收尾审阅镜像：计算 unmapped、downgraded、unauthorized dropped 与 intra-package duplicate 四类计数。 |
| listMarkdown | 函数 | 94–109 | 简单 | filesystem、discovery、documentation | 0 | 递归列出目录下的 Markdown 文件，忽略生成物与非文档资产。 |
| prepareHostBridgeReviewMirror | 函数 | 276–309 | 中等 | governance、preparation、baseline | 0 | 准备审阅镜像：复制文档、记录来源 commit 与基线路径，作为逐条比对的工作区。 |
| protectedMarkdownStructure | 函数 | 120–140 | 简单 | documentation、structure、contract | 0 | 提取受保护 Markdown 结构（标题层级与表格骨架），作为语义 parity 的结构契约。 |
| releaseIdentity | 函数 | 82–92 | 简单 | release、loading、identity | 0 | 读取发布身份文件，得到审阅镜像对应的基线标识。 |
| renderIndex | 函数 | 382–414 | 中等 | rendering、documentation、inventory | 0 | 渲染审阅索引文档，列出条目映射关系与统计指标。 |
| sourceCommit | 函数 | 416–426 | 简单 | git、traceability、release | 0 | 解析镜像来源 commit，保证审阅结论可追溯。 |
| validateTranslations | 函数 | 321–380 | 中等 | i18n、validation、governance | 0 | 校验多语言 surface 镜像的完整性，确认各语种条目覆盖与结构一致。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [host-bridge-surface-model.ts](host-bridge-surface-model.ts.md) | scripts/host-bridge/host-bridge-surface-model.ts | Host Bridge surface 的共享领域模型：定义 surface 身份、版本、层级与指令条目的类型与不变量，是多个治理脚本的公共底座。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildHostBridgeReviewMirrorInventory | 函数 | 159–267 | 盘点全部 agent-facing surface 文档，记录条目归属、指令行数与字符数基线。 |
| checkHostBridgeReviewMirror | 函数 | 489–584 | 审阅闸门：厚度或语义 parity 相对固定 baseline 下降即失败，阻止 surface 被压缩。 |
| finalizeHostBridgeReviewMirror | 函数 | 428–487 | 收尾审阅镜像：计算 unmapped、downgraded、unauthorized dropped 与 intra-package duplicate 四类计数。 |
| prepareHostBridgeReviewMirror | 函数 | 276–309 | 准备审阅镜像：复制文档、记录来源 commit 与基线路径，作为逐条比对的工作区。 |
| protectedMarkdownStructure | 函数 | 120–140 | 提取受保护 Markdown 结构（标题层级与表格骨架），作为语义 parity 的结构契约。 |
