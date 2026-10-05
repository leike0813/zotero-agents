
# workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs
所属分层：[内置工作流包与 Skill 资产](../../../../layers/workflow-assets.md)  
所属目录：[workflows_builtin/workflow-debug-probe/hooks](../../../../modules/workflows_builtin/workflow-debug-probe/hooks.md)
<!-- node: file:workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs -->

调试 apply 契约的产物回写 hook，负责把 apply 阶段生成的 bundle（产物文件、manifest、附件源）解析、校验并写入 Zotero，同时处理单条与序列两种结果模式。
源码：[workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs](../../../../../../workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs)

## 符号（14）
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs:applyBundle -->
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs:applyResult -->
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs:applyResultMode -->
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs:confirmed -->
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs:getCanonicalResult -->
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs:joinPath -->
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs:readArtifactManifest -->
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs:readArtifactText -->
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs:readBundleArtifact -->
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs:resolveParent -->
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs:resolveParentRef -->
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs:resolvePathSeparator -->
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs:sanitizeFileName -->
<!-- node: function:workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs:writeAttachmentSource -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyBundle | 函数 | 178–196 | 中等 | 产物提交、附件、宿主写入、异步 | 1 | bundle 模式提交：读取产物文本、写入宿主临时文件作为附件源，再通过 attachments.create 在父条目下创建 stored_file 附件。 |
| applyResult | 函数 | 228–245 | 中等 | hook、入口、结果分派、异步 | 1 | apply 契约的导出入口：取规范结果、解析目标父条目，再按 apply_mode 分派到 bundle 附件提交或 result 标签回写，并附加 workflow/step/run 标识。 |
| applyResultMode | 函数 | 198–226 | 中等 | 标签写入、产物提交、宿主写入、调试标记 | 1 | result 模式提交：以 debug-apply、workflow、step、run 四类标签标记父条目，作为「结果已应用」的可观测证据。 |
| confirmed | 函数 | 68–71 | 简单 | 错误处理、宿主写入、断言、工具函数 | 1 | 断言宿主 mutation 已 committed/unchanged 并返回其结果，否则抛出 attempt 中的错误信息。 |
| getCanonicalResult | 函数 | 48–56 | 简单 | 结果归一化、工具函数、容错 | 1 | 从 resultContext 或 runResult 中取出规范结果对象，缺失时返回空对象。 |
| joinPath | 函数 | 24–46 | 中等 | 路径处理、跨平台、工具函数 | 1 | 跨平台路径拼接：自动识别盘符前缀与分隔符风格，兼容 POSIX 绝对路径与 Windows 驱动器路径。 |
| readArtifactManifest | 函数 | 135–159 | 中等 | manifest、契约校验、错误处理、解析 | 1 | 读取并严格校验 artifact manifest：必须是扁平 JSON 对象且每个值都是非空路径字符串，否则抛出明确错误。 |
| [readArtifactText](../../../../symbols/workflows_builtin/workflow-debug-probe/hooks/applyDebugApplyContractResult.mjs/readArtifactText.md) | 函数 | 118–133 | 中等 | 产物读取、适配器、回退策略 | 2 | 读取产物文本，优先走宿主注入的 resultContext.readArtifactText，否则回退到 bundleReader.readText。 |
| readBundleArtifact | 函数 | 93–116 | 中等 | 产物解析、manifest、回退策略、异步 | 1 | 解析 bundle 产物来源：没有直接 artifact_path 时经 manifest 解析出产物路径，并提供默认回退路径。 |
| resolveParent | 函数 | 73–91 | 中等 | 父条目解析、宿主读取、条目创建、异步 | 1 | 解析 apply 的目标父条目：优先按请求/结果中的 ref 读取既有条目，否则通过 mutations.execute 新建一条期刊条目作为测试父条目。 |
| resolveParentRef | 函数 | 58–66 | 简单 | 引用解析、回退策略、工具函数 | 1 | 按请求 targetParentRef、结果字段、父条目对象的顺序回退解析父条目引用。 |
| resolvePathSeparator | 函数 | 16–22 | 简单 | 路径处理、跨平台、工具函数 | 0 | 根据路径片段中的盘符或反斜杠推断应使用的路径分隔符。 |
| sanitizeFileName | 函数 | 9–14 | 简单 | 文件名规范化、安全、工具函数 | 1 | 把任意标识符规整为安全文件名：替换非法字符、去首尾连字符并限制长度，缺省回退到固定名。 |
| writeAttachmentSource | 函数 | 161–176 | 中等 | 文件写入、文件名规范化、附件源、异步 | 1 | 把产物文本写入宿主临时目录中的规范化文件名，作为待导入附件的本地源文件。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [applyExistingParentDebugBundleResult.mjs](applyExistingParentDebugBundleResult.mjs.md) | workflows_builtin/workflow-debug-probe/hooks/applyExistingParentDebugBundleResult.mjs | 在已有父条目上下文上复用 bundle 回写逻辑的薄包装 hook，解析请求指定的父条目后委托给通用 applyDebugApplyContractResult 实现。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyResult | 函数 | 228–245 | apply 契约的导出入口：取规范结果、解析目标父条目，再按 apply_mode 分派到 bundle 附件提交或 result 标签回写，并附加 workflow/step/run 标识。 |
