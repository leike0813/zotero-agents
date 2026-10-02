
# workflows_builtin/literature-workbench-package/debug-digest-apply-fixture/hooks/applyResult.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/debug-digest-apply-fixture/hooks](../../../../../modules/workflows_builtin/literature-workbench-package/debug-digest-apply-fixture/hooks.md)
<!-- node: file:workflows_builtin/literature-workbench-package/debug-digest-apply-fixture/hooks/applyResult.mjs -->

调试专用 hook：用内嵌的固定 base64 PNG 在本地构造测试 digest 笔记，用于在没有真实文献源时验证 digest 应用链路。
源码：[workflows_builtin/literature-workbench-package/debug-digest-apply-fixture/hooks/applyResult.mjs](../../../../../../../workflows_builtin/literature-workbench-package/debug-digest-apply-fixture/hooks/applyResult.mjs)

## 符号（3）
<!-- node: function:workflows_builtin/literature-workbench-package/debug-digest-apply-fixture/hooks/applyResult.mjs:applyResult -->
<!-- node: function:workflows_builtin/literature-workbench-package/debug-digest-apply-fixture/hooks/applyResult.mjs:applyResultImpl -->
<!-- node: function:workflows_builtin/literature-workbench-package/debug-digest-apply-fixture/hooks/applyResult.mjs:decodeBase64Bytes -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyResult | 函数 | 204–206 | 简单 | hook、entry-point、debug | 0 | hook 入口，在 package runtime scope 内跑调试 fixture 应用流程。 |
| applyResultImpl | 函数 | 35–202 | 复杂 | debug、digest、fixture | 0 | 解码内嵌测试图片、构造 digest 笔记与生成笔记 upsert 请求，并落盘到目标路径。 |
| decodeBase64Bytes | 函数 | 13–33 | 简单 | utility、encoding、runtime-fallback | 0 | 在缺少 Node Buffer 的插件沙箱里按 runtime 能力逐级回退地解码 base64 字节。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [literatureDigestNotes.mjs](../../lib/literatureDigestNotes.mjs.md) | workflows_builtin/literature-workbench-package/lib/literatureDigestNotes.mjs | 生成类笔记（digest、引用分析、文献评分等）的写入与导出核心：分类收集既有笔记、upsert 生成内容、准备代表图，并提供自定义笔记与 conversation 笔记的创建能力。 |
| [path.mjs](../../lib/path.mjs.md) | workflows_builtin/literature-workbench-package/lib/path.mjs | 文献工作台工作流包的跨平台路径工具模块，提供 POSIX/Windows 双风格路径拼接、basename 提取与文件名片段净化。 |
| [runtime.mjs](../../lib/runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyResult | 函数 | 204–206 | hook 入口，在 package runtime scope 内跑调试 fixture 应用流程。 |
