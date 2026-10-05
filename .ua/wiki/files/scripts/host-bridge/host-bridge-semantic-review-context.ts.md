
# scripts/host-bridge/host-bridge-semantic-review-context.ts
所属分层：[构建、发布与工程配置](../../../layers/build-tooling.md)  
所属目录：[scripts/host-bridge](../../../modules/scripts/host-bridge.md)
<!-- node: file:scripts/host-bridge/host-bridge-semantic-review-context.ts -->

依据 git 变更文件分类出语义审阅上下文：区分语义源码、spec 层、Profile/包发布元数据、生成目标与 agent 控制契约，产出审阅重点。
源码：[scripts/host-bridge/host-bridge-semantic-review-context.ts](../../../../../scripts/host-bridge/host-bridge-semantic-review-context.ts)

## 符号（11）
<!-- node: function:scripts/host-bridge/host-bridge-semantic-review-context.ts:classifyChangedFiles -->
<!-- node: function:scripts/host-bridge/host-bridge-semantic-review-context.ts:collectChangedFiles -->
<!-- node: function:scripts/host-bridge/host-bridge-semantic-review-context.ts:focusFor -->
<!-- node: function:scripts/host-bridge/host-bridge-semantic-review-context.ts:gitLines -->
<!-- node: function:scripts/host-bridge/host-bridge-semantic-review-context.ts:isAgentControlContract -->
<!-- node: function:scripts/host-bridge/host-bridge-semantic-review-context.ts:isGeneratedTarget -->
<!-- node: function:scripts/host-bridge/host-bridge-semantic-review-context.ts:isHostBridgeOpenSpec -->
<!-- node: function:scripts/host-bridge/host-bridge-semantic-review-context.ts:isReleaseContract -->
<!-- node: function:scripts/host-bridge/host-bridge-semantic-review-context.ts:isSemanticReviewCandidate -->
<!-- node: function:scripts/host-bridge/host-bridge-semantic-review-context.ts:isSemanticSource -->
<!-- node: function:scripts/host-bridge/host-bridge-semantic-review-context.ts:isSpecLayer -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| classifyChangedFiles | 函数 | 261–307 | 中等 | review、classification、entry-point、governance | 0 | 把变更文件列表分类为语义源码、spec 层、发布元数据与生成目标，并输出审阅焦点。 |
| collectChangedFiles | 函数 | 42–57 | 简单 | git、discovery、review、diff | 0 | 收集工作区相对目标 ref 的全部变更文件，作为语义审阅输入。 |
| focusFor | 函数 | 213–259 | 中等 | review、focus、aggregation、governance | 0 | 依据各分类的变更数量决定本次审阅的焦点提示，突出 agent 面与 spec 层风险。 |
| gitLines | 函数 | 28–40 | 简单 | git、utility、wrapper、parsing | 0 | 执行 git 命令并把输出按行拆分为数组，失败时返回空结果而不抛出。 |
| isAgentControlContract | 函数 | 100–117 | 中等 | classification、agent-surface、contract、governance | 0 | 识别 agent 控制面契约文件（agent-facing surface 与其控制规则）。 |
| isGeneratedTarget | 函数 | 84–98 | 简单 | classification、generated、review、governance | 0 | 识别自动生成的构建目标路径，避免把生成物纳入语义审阅范围。 |
| isHostBridgeOpenSpec | 函数 | 144–158 | 简单 | classification、openspec、spec、review | 0 | 判断变更文件是否落在 Host Bridge 的 OpenSpec 规格与变更记录中。 |
| isReleaseContract | 函数 | 119–142 | 中等 | classification、release、contract、governance | 0 | 识别 Profile 与包发布元数据等受治理的发布契约路径。 |
| isSemanticReviewCandidate | 函数 | 198–211 | 简单 | classification、review、filter、governance | 0 | 判定某个变更文件是否需要进入语义审阅队列。 |
| isSemanticSource | 函数 | 59–74 | 简单 | classification、review、path-resolution、governance | 0 | 判断路径是否属于语义源码，区别于生成产物、发布元数据与文档。 |
| isSpecLayer | 函数 | 169–196 | 中等 | classification、spec、review、aggregation | 0 | 综合规格、契约与发布元数据判断变更是否属于 spec 层变更。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| classifyChangedFiles | 函数 | 261–307 | 把变更文件列表分类为语义源码、spec 层、发布元数据与生成目标，并输出审阅焦点。 |
| collectChangedFiles | 函数 | 42–57 | 收集工作区相对目标 ref 的全部变更文件，作为语义审阅输入。 |
