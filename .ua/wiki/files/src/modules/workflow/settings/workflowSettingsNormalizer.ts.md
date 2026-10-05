
# src/modules/workflow/settings/workflowSettingsNormalizer.ts
所属分层：[工作流引擎与执行](../../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflow/settings](../../../../../modules/src/modules/workflow/settings.md)
<!-- node: file:src/modules/workflow/settings/workflowSettingsNormalizer.ts -->

针对已加载工作流目录的设置归一化层，在持久化设置与执行时选项中剥离陈旧字段并按当前已注册工作流集合补齐缺失配置。
源码：[src/modules/workflow/settings/workflowSettingsNormalizer.ts](../../../../../../../src/modules/workflow/settings/workflowSettingsNormalizer.ts)

## 符号（2）
<!-- node: function:src/modules/workflow/settings/workflowSettingsNormalizer.ts:applyExecutionWorkflowParamsNormalizer -->
<!-- node: function:src/modules/workflow/settings/workflowSettingsNormalizer.ts:applyPersistedWorkflowSettingsNormalizer -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyExecutionWorkflowParamsNormalizer | 函数 | 84–108 | 简单 | normalization、execution、workflow-params | 0 | 对执行时工作流参数套用归一化层，保证与已加载 catalog 一致。 |
| applyPersistedWorkflowSettingsNormalizer | 函数 | 53–82 | 简单 | normalization、persistence、catalog、cleanup | 0 | 对持久化设置套用归一化层：剥离不再注册的工作流与已失效的 Host 选项。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [types.ts](../../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowRuntime.ts](../catalog/workflowRuntime.ts.md) | src/modules/workflow/catalog/workflowRuntime.ts | 工作流运行时目录：解析工作流/skill 目录、加载并合并 manifest、维护注册表状态与重扫，是工作流 catalog 的运行时事实源。 |
| [workflowSettingsDomain.ts](workflowSettingsDomain.ts.md) | src/modules/workflow/settings/workflowSettingsDomain.ts | 工作流设置的领域层：定义执行选项与 Host 选项类型，负责设置记录的解析/序列化、参数按 schema 归一化、必填校验与多来源选项合并。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [workflowSettings.ts](workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts | 工作流设置的核心状态与投影模块：读写持久化设置记录、合并 run-once 临时覆盖，按后端/Provider 能力生成设置 UI 描述符，并解析出实际执行上下文与选项预览。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| applyExecutionWorkflowParamsNormalizer | 函数 | 84–108 | 对执行时工作流参数套用归一化层，保证与已加载 catalog 一致。 |
| applyPersistedWorkflowSettingsNormalizer | 函数 | 53–82 | 对持久化设置套用归一化层：剥离不再注册的工作流与已失效的 Host 选项。 |
