
# src/modules/workflow/catalog/workflowRequestKind.ts
所属分层：[工作流引擎与执行](../../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflow/catalog](../../../../../modules/src/modules/workflow/catalog.md)
<!-- node: file:src/modules/workflow/catalog/workflowRequestKind.ts -->

请求类型解析：按后端类型与显式声明判定一次工作流请求的 kind（ACP prompt、ACP skill run、SkillRunner sequence 或透传），是队列分派的输入。
源码：[src/modules/workflow/catalog/workflowRequestKind.ts](../../../../../../../src/modules/workflow/catalog/workflowRequestKind.ts)

## 符号（1）
<!-- node: function:src/modules/workflow/catalog/workflowRequestKind.ts:resolveWorkflowRequestKind -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| resolveWorkflowRequestKind | 函数 | 15–33 | 简单 | workflow、routing、validation、core | 0 | 解析请求的 kind：优先采用显式声明，否则按后端类型取默认值，未知后端类型直接拒绝。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [defaults.ts](../../../config/defaults.ts.md) | src/config/defaults.ts | 全局默认配置常量：定义默认 SkillRunner endpoint、各类后端类型标识、请求类型判别值与默认后端 id。 |
| [types.ts](../../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [workflowSettings.ts](../settings/workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts | 工作流设置的核心状态与投影模块：读写持久化设置记录、合并 run-once 临时覆盖，按后端/Provider 能力生成设置 UI 描述符，并解析出实际执行上下文与选项预览。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| resolveWorkflowRequestKind | 函数 | 15–33 | 解析请求的 kind：优先采用显式声明，否则按后端类型取默认值，未知后端类型直接拒绝。 |
