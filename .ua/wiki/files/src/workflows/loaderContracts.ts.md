
# src/workflows/loaderContracts.ts
所属分层：[工作流引擎与执行](../../../layers/workflow-engine.md)  
所属目录：[src/workflows](../../../modules/src/workflows.md)
<!-- node: file:src/workflows/loaderContracts.ts -->

工作流 manifest 契约：基于 JSON Schema 校验 manifest 形状，并补充选择计数、输入规划与序列步骤等跨字段语义校验。

规模：595 行
源码：[src/workflows/loaderContracts.ts](../../../../../src/workflows/loaderContracts.ts)

## 符号（14）
<!-- node: function:src/workflows/loaderContracts.ts:createLoaderDiagnostic -->
<!-- node: function:src/workflows/loaderContracts.ts:formatManifestValidationError -->
<!-- node: function:src/workflows/loaderContracts.ts:getWorkflowManifestValidator -->
<!-- node: function:src/workflows/loaderContracts.ts:getWorkflowPackageManifestValidator -->
<!-- node: function:src/workflows/loaderContracts.ts:parseWorkflowManifestFromText -->
<!-- node: function:src/workflows/loaderContracts.ts:parseWorkflowPackageManifestFromText -->
<!-- node: function:src/workflows/loaderContracts.ts:resolveBuildStrategy -->
<!-- node: function:src/workflows/loaderContracts.ts:sortLoaderDiagnostics -->
<!-- node: function:src/workflows/loaderContracts.ts:toDiagnosticFromUnknown -->
<!-- node: function:src/workflows/loaderContracts.ts:validateCountRule -->
<!-- node: function:src/workflows/loaderContracts.ts:validateInputPlanningSemantics -->
<!-- node: function:src/workflows/loaderContracts.ts:validateSelectionCountSemantics -->
<!-- node: function:src/workflows/loaderContracts.ts:validateSequenceManifestSemantics -->
<!-- node: class:src/workflows/loaderContracts.ts:WorkflowLoaderDiagnosticError -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createLoaderDiagnostic | 函数 | 515–528 | 简单 | diagnostics、factory、loader | 1 | 构造标准形状的 LoaderDiagnostic，规范化 category、level 与条目路径。 |
| formatManifestValidationError | 函数 | 97–113 | 中等 | diagnostics、formatting、schema | 1 | 把 Ajv 错误对象格式化为带实例路径与关键字的可读消息。 |
| getWorkflowManifestValidator | 函数 | 68–81 | 简单 | schema、validation、caching | 1 | 惰性构建并缓存工作流 manifest 的 Ajv 校验函数。 |
| getWorkflowPackageManifestValidator | 函数 | 83–95 | 简单 | schema、validation、caching | 1 | 惰性构建并缓存工作流包 manifest 的 Ajv 校验函数。 |
| [parseWorkflowManifestFromText](../../../symbols/src/workflows/loaderContracts.ts/parseWorkflowManifestFromText.md) | 函数 | 424–475 | 复杂 | parsing、validation、contract | 2 | 解析并校验工作流 manifest 文本，返回规范化 manifest 或带诊断的错误。 |
| [parseWorkflowPackageManifestFromText](../../../symbols/src/workflows/loaderContracts.ts/parseWorkflowPackageManifestFromText.md) | 函数 | 477–513 | 复杂 | parsing、validation、contract | 1 | 解析并校验工作流包 manifest 文本，含官方内容声明与默认配置。 |
| resolveBuildStrategy | 函数 | 411–422 | 简单 | resolution、loader、strategy | 0 | 按 manifest 声明解析 hook 构建策略（源码动态加载或预编译包）。 |
| sortLoaderDiagnostics | 函数 | 534–562 | 中等 | diagnostics、sorting、determinism | 0 | 按 level、category、path 与 message 对诊断排序，保证加载输出稳定可复现。 |
| toDiagnosticFromUnknown | 函数 | 571–595 | 中等 | diagnostics、error-handling、loader | 0 | 把任意抛出值转成 LoaderDiagnostic，未知错误归入通用扫描错误类别。 |
| validateCountRule | 函数 | 211–226 | 简单 | validation、selection、contract | 0 | 校验选择计数规则：min/max 顺序合法且与整除约束一致。 |
| validateInputPlanningSemantics | 函数 | 327–409 | 复杂 | validation、input-planning、contract | 0 | 校验输入规划语义：分组方式、候选选择与产物路径声明之间不得矛盾。 |
| [validateSelectionCountSemantics](../../../symbols/src/workflows/loaderContracts.ts/validateSelectionCountSemantics.md) | 函数 | 240–325 | 复杂 | validation、selection、contract | 1 | 校验选择计数的完整语义：各条目 kind 的计数区间不得重叠冲突，并与输入规划对齐。 |
| validateSequenceManifestSemantics | 函数 | 127–182 | 复杂 | validation、sequence、contract | 0 | 校验序列 manifest 的跨字段语义：步骤非空、id 唯一、依赖与短路声明自洽。 |
| WorkflowLoaderDiagnosticError | 类 | 29–56 | 简单 | error-type、loader、diagnostics | 0 | 加载器内部使用的错误类型，携带 category、entry、workflowId、path 与 reason，随后会被转成 LoaderDiagnostic。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [defaults.ts](../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [types.ts](types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflow-package.schema.json](../schemas/workflow-package.schema.json.md) | src/schemas/workflow-package.schema.json | 工作流包 manifest 的 JSON Schema，定义包标识、版本、入口 workflow 与目录布局等字段约束。 |
| [workflow.schema.json](../schemas/workflow.schema.json.md) | src/schemas/workflow.schema.json | 单个工作流定义的 JSON Schema，完整描述 task/step 声明、输入物化、输入输出契约与构建策略等结构。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [loader.ts](loader.ts.md) | src/workflows/loader.ts | 工作流加载器：扫描工作流目录与工作流包，解析并校验 manifest，按宿主环境（Zotero 沙箱或 Node 预编译）加载 hook 模块并汇总诊断。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createLoaderDiagnostic | 函数 | 515–528 | 构造标准形状的 LoaderDiagnostic，规范化 category、level 与条目路径。 |
| [parseWorkflowManifestFromText](../../../symbols/src/workflows/loaderContracts.ts/parseWorkflowManifestFromText.md) | 函数 | 424–475 | 解析并校验工作流 manifest 文本，返回规范化 manifest 或带诊断的错误。 |
| [parseWorkflowPackageManifestFromText](../../../symbols/src/workflows/loaderContracts.ts/parseWorkflowPackageManifestFromText.md) | 函数 | 477–513 | 解析并校验工作流包 manifest 文本，含官方内容声明与默认配置。 |
| resolveBuildStrategy | 函数 | 411–422 | 按 manifest 声明解析 hook 构建策略（源码动态加载或预编译包）。 |
| sortLoaderDiagnostics | 函数 | 534–562 | 按 level、category、path 与 message 对诊断排序，保证加载输出稳定可复现。 |
| toDiagnosticFromUnknown | 函数 | 571–595 | 把任意抛出值转成 LoaderDiagnostic，未知错误归入通用扫描错误类别。 |
| WorkflowLoaderDiagnosticError | 类 | 29–56 | 加载器内部使用的错误类型，携带 category、entry、workflowId、path 与 reason，随后会被转成 LoaderDiagnostic。 |
