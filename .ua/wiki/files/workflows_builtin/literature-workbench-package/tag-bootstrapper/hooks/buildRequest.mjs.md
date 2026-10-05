
# workflows_builtin/literature-workbench-package/tag-bootstrapper/hooks/buildRequest.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/literature-workbench-package/tag-bootstrapper/hooks](../../../../../modules/workflows_builtin/literature-workbench-package/tag-bootstrapper/hooks.md)
<!-- node: file:workflows_builtin/literature-workbench-package/tag-bootstrapper/hooks/buildRequest.mjs -->

标签引导工作流的请求构建 hook：加载受控词表与笔记语言设置，组装用于生成标签建议的请求。
源码：[workflows_builtin/literature-workbench-package/tag-bootstrapper/hooks/buildRequest.mjs](../../../../../../../workflows_builtin/literature-workbench-package/tag-bootstrapper/hooks/buildRequest.mjs)

## 符号（4）
<!-- node: function:workflows_builtin/literature-workbench-package/tag-bootstrapper/hooks/buildRequest.mjs:buildRequest -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-bootstrapper/hooks/buildRequest.mjs:buildRequestImpl -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-bootstrapper/hooks/buildRequest.mjs:normalizeEntries -->
<!-- node: function:workflows_builtin/literature-workbench-package/tag-bootstrapper/hooks/buildRequest.mjs:resolveTagNoteLanguage -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildRequest | 函数 | 74–76 | 简单 | workflow-hook、entry-point | 0 | buildRequest 公开入口，在包级 runtime scope 内执行并保留测试注入点。 |
| buildRequestImpl | 函数 | 51–72 | 简单 | request-builder、tag-vocabulary、prompt-assembly | 0 | 组装标签引导请求：加载词表、解析语言与已有标签，拼装提示词输入。 |
| normalizeEntries | 函数 | 25–49 | 简单 | normalization、tag-vocabulary、validation | 0 | 归一化词表条目：规范标签名与 facet 标记，剔除非法项并保持稳定顺序。 |
| resolveTagNoteLanguage | 函数 | 9–15 | 简单 | i18n、locale、configuration | 0 | 解析标签笔记使用的内容语言，缺省时回落到宿主语言。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtime.mjs](../../lib/runtime.mjs.md) | workflows_builtin/literature-workbench-package/lib/runtime.mjs | 工作流包运行时适配层：把当前执行作用域、Zotero 宿主 API、选择集、附件路径与 fetch/base64 等运行时能力收敛为工作流 hook 可直接调用的入口。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| buildRequest | 函数 | 74–76 | buildRequest 公开入口，在包级 runtime scope 内执行并保留测试注入点。 |
