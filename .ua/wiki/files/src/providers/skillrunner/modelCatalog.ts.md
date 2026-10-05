
# src/providers/skillrunner/modelCatalog.ts
所属分层：[Agent 协议与后端运行时](../../../../layers/agent-runtime.md)  
所属目录：[src/providers/skillrunner](../../../../modules/src/providers/skillrunner.md)
<!-- node: file:src/providers/skillrunner/modelCatalog.ts -->

SkillRunner 模型目录：解析静态 manifest 与远端快照，展开 engine/provider/model 层级并把模型规格归一为 UI 与运行时可用形态。

规模：744 行
源码：[src/providers/skillrunner/modelCatalog.ts](../../../../../../src/providers/skillrunner/modelCatalog.ts)

## 符号（13）
<!-- node: function:src/providers/skillrunner/modelCatalog.ts:compareSemver -->
<!-- node: function:src/providers/skillrunner/modelCatalog.ts:findModelEntry -->
<!-- node: function:src/providers/skillrunner/modelCatalog.ts:getLatestSnapshot -->
<!-- node: function:src/providers/skillrunner/modelCatalog.ts:isSkillRunnerProviderScopedEngine -->
<!-- node: function:src/providers/skillrunner/modelCatalog.ts:listSkillRunnerModelEffortOptions -->
<!-- node: function:src/providers/skillrunner/modelCatalog.ts:listSkillRunnerModelOptionsForProvider -->
<!-- node: function:src/providers/skillrunner/modelCatalog.ts:matchesModelEntry -->
<!-- node: function:src/providers/skillrunner/modelCatalog.ts:normalizeSkillRunnerModel -->
<!-- node: function:src/providers/skillrunner/modelCatalog.ts:normalizeSkillRunnerModelForProvider -->
<!-- node: function:src/providers/skillrunner/modelCatalog.ts:normalizeSupportedEffort -->
<!-- node: function:src/providers/skillrunner/modelCatalog.ts:resolveEngineModels -->
<!-- node: function:src/providers/skillrunner/modelCatalog.ts:splitSkillRunnerModelId -->
<!-- node: function:src/providers/skillrunner/modelCatalog.ts:splitSkillRunnerModelSpec -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| compareSemver | 函数 | 260–277 | 中等 | utility、comparison、versioning | 0 | 按语义化版本比较两个 manifest 快照版本号，用于挑选最新快照。 |
| findModelEntry | 函数 | 455–471 | 中等 | model-catalog、lookup、utility | 1 | 在模型条目中定位与规格匹配的首个条目，未命中返回 undefined。 |
| getLatestSnapshot | 函数 | 319–333 | 简单 | model-catalog、versioning、resolution | 0 | 在 manifest 快照列表中选出语义化版本最新的一个。 |
| isSkillRunnerProviderScopedEngine | 函数 | 534–543 | 简单 | model-catalog、predicate、skillrunner | 0 | 判断 engine 是否属于 provider 作用域，决定模型 id 是否需要携带 provider 前缀。 |
| listSkillRunnerModelEffortOptions | 函数 | 636–660 | 中等 | model-catalog、query、normalization | 0 | 列出模型可用的推理强度选项，兼容按模型推导与全局默认两种来源。 |
| listSkillRunnerModelOptionsForProvider | 函数 | 599–634 | 复杂 | model-catalog、query、ui-contract | 0 | 列出指定 provider 作用域下可选的模型选项，附带各自支持的 effort 集合。 |
| matchesModelEntry | 函数 | 422–453 | 中等 | model-catalog、matching、predicate | 0 | 判断模型条目是否匹配给定的 engine/provider/model 与 effort 规格。 |
| normalizeSkillRunnerModel | 函数 | 721–744 | 中等 | normalization、model-catalog、entry-point | 1 | SkillRunner 模型规格归一入口，自动补全 provider 前缀并校验 effort 合法性。 |
| [normalizeSkillRunnerModelForProvider](../../../../symbols/src/providers/skillrunner/modelCatalog.ts/normalizeSkillRunnerModelForProvider.md) | 函数 | 679–710 | 复杂 | normalization、model-catalog、skillrunner | 1 | 把任意模型输入归一为该 provider 作用域下的合法模型名，非法值回退默认模型。 |
| normalizeSupportedEffort | 函数 | 285–299 | 简单 | normalization、model-catalog、utility | 0 | 归一模型声明支持的推理强度列表：去空白、去重并按已知顺序排序。 |
| resolveEngineModels | 函数 | 354–396 | 复杂 | model-catalog、resolution、caching | 0 | 解析指定 engine 下的模型条目，依次尝试缓存与静态 manifest，并合并两者结果。 |
| splitSkillRunnerModelId | 函数 | 473–494 | 中等 | parsing、model-catalog、skillrunner | 0 | 按斜杠拆分 SkillRunner 模型 id，识别 provider 作用域前缀。 |
| splitSkillRunnerModelSpec | 函数 | 496–527 | 中等 | parsing、model-catalog、compatibility | 1 | 把模型规格串拆为 model 与 effort 变体，容忍以冒号或空格分隔的历史写法。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [modelCache.ts](modelCache.ts.md) | src/providers/skillrunner/modelCache.ts | SkillRunner 模型缓存：从各后端拉取引擎与模型清单、归一化 provider/model 与 effort 支持，按后端维度缓存到首选项并提供定时自动刷新。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [provider.ts](provider.ts.md) | src/providers/skillrunner/provider.ts | SkillRunner Provider：解析后端协议能力与认证信息，声明运行时选项枚举，并把 job/sequence 请求交给 SkillRunnerClient 执行。 |
| [workflowSettings.ts](../../modules/workflow/settings/workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts | 工作流设置的核心状态与投影模块：读写持久化设置记录、合并 run-once 临时覆盖，按后端/Provider 能力生成设置 UI 描述符，并解析出实际执行上下文与选项预览。 |
| [workflowSettingsDialogModel.ts](../../modules/workflow/settings/workflowSettingsDialogModel.ts.md) | src/modules/workflow/settings/workflowSettingsDialogModel.ts | 设置对话框的纯模型层：把工作流参数 schema 与 Provider 运行时选项 schema 转换为统一表单条目，产出渲染模型、Host 选项草稿与收集后的设置草稿。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| isSkillRunnerProviderScopedEngine | 函数 | 534–543 | 判断 engine 是否属于 provider 作用域，决定模型 id 是否需要携带 provider 前缀。 |
| listSkillRunnerModelEffortOptions | 函数 | 636–660 | 列出模型可用的推理强度选项，兼容按模型推导与全局默认两种来源。 |
| listSkillRunnerModelOptionsForProvider | 函数 | 599–634 | 列出指定 provider 作用域下可选的模型选项，附带各自支持的 effort 集合。 |
| normalizeSkillRunnerModel | 函数 | 721–744 | SkillRunner 模型规格归一入口，自动补全 provider 前缀并校验 effort 合法性。 |
| [normalizeSkillRunnerModelForProvider](../../../../symbols/src/providers/skillrunner/modelCatalog.ts/normalizeSkillRunnerModelForProvider.md) | 函数 | 679–710 | 把任意模型输入归一为该 provider 作用域下的合法模型名，非法值回退默认模型。 |
| splitSkillRunnerModelId | 函数 | 473–494 | 按斜杠拆分 SkillRunner 模型 id，识别 provider 作用域前缀。 |
| splitSkillRunnerModelSpec | 函数 | 496–527 | 把模型规格串拆为 model 与 effort 变体，容忍以冒号或空格分隔的历史写法。 |
