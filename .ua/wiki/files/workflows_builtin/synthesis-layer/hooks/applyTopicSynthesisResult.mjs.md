
# workflows_builtin/synthesis-layer/hooks/applyTopicSynthesisResult.mjs
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[workflows_builtin/synthesis-layer/hooks](../../../../modules/workflows_builtin/synthesis-layer/hooks.md)
<!-- node: file:workflows_builtin/synthesis-layer/hooks/applyTopicSynthesisResult.mjs -->

Synthesis 工作流包的 hook 脚本，负责把主题综合阶段的执行结果整理并写回工作流状态，是综合产物生成的收口逻辑。
源码：[workflows_builtin/synthesis-layer/hooks/applyTopicSynthesisResult.mjs](../../../../../../workflows_builtin/synthesis-layer/hooks/applyTopicSynthesisResult.mjs)

## 符号（4）
<!-- node: function:workflows_builtin/synthesis-layer/hooks/applyTopicSynthesisResult.mjs:applyResult -->
<!-- node: function:workflows_builtin/synthesis-layer/hooks/applyTopicSynthesisResult.mjs:isCanceledBundle -->
<!-- node: function:workflows_builtin/synthesis-layer/hooks/applyTopicSynthesisResult.mjs:readJsonCandidate -->
<!-- node: function:workflows_builtin/synthesis-layer/hooks/applyTopicSynthesisResult.mjs:readMarkdownArtifact -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyResult | 函数 | 80–140 | 中等 | hook、入口点、错误处理、异步 | 0 | 导出的 hook 入口：识别取消 bundle 并直接返回 skipped 结果，否则解析 Markdown 后调用 Workflow Host 的 applyTopicSynthesisResult 落库，失败时抛出带 status 错误码、structuredResult 与 warnings 的异常。 |
| isCanceledBundle | 函数 | 40–45 | 简单 | 取消语义、谓词、工具函数 | 1 | 判断结果 bundle 是否属于用户取消语义，命中 kind=topic_synthesis_canceled 或 status=canceled 即返回真。 |
| readJsonCandidate | 函数 | 5–27 | 简单 | 解析、结果读取、工具函数、容错 | 1 | 与规划侧同构的 JSON 结果提取函数，依次尝试 runResult 的多种字段与文本解析路径。 |
| readMarkdownArtifact | 函数 | 47–78 | 中等 | 产物读取、校验、artifact、异步 | 1 | 读取综合产物的 Markdown 正文：禁止 bundle 内嵌 markdown，结构化结果不得依赖 markdown_path；否则经 resultContext.resolveArtifact 或 bundleReader.readText 读取，缺通道时报错。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyResult | 函数 | 80–140 | 导出的 hook 入口：识别取消 bundle 并直接返回 skipped 结果，否则解析 Markdown 后调用 Workflow Host 的 applyTopicSynthesisResult 落库，失败时抛出带 status 错误码、structuredResult 与 warnings 的异常。 |
