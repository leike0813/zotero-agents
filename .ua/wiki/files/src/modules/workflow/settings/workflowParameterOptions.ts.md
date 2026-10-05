
# src/modules/workflow/settings/workflowParameterOptions.ts
所属分层：[工作流引擎与执行](../../../../../layers/workflow-engine.md)  
所属目录：[src/modules/workflow/settings](../../../../../modules/src/modules/workflow/settings.md)
<!-- node: file:src/modules/workflow/settings/workflowParameterOptions.ts -->

工作流动态参数候选项的来源解析器，按参数声明的来源类型从 Synthesis sidecar 合约或 Zotero Host 能力 Broker 拉取可选值并附带诊断信息。
源码：[src/modules/workflow/settings/workflowParameterOptions.ts](../../../../../../../src/modules/workflow/settings/workflowParameterOptions.ts)

## 符号（1）
<!-- node: function:src/modules/workflow/settings/workflowParameterOptions.ts:resolveWorkflowParameterOptionsSource -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| resolveWorkflowParameterOptionsSource | 函数 | 51–164 | 中等 | dynamic-options、synthesis、broker、diagnostics、async | 0 | 按参数来源类型动态解析候选项：合成侧合约走 Synthesis client，宿主类来源走 Zotero Host 能力 Broker，并返回诊断信息。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [defaultClient.ts](../../synthesisClient/defaultClient.ts.md) | src/modules/synthesisClient/defaultClient.ts | 默认 SynthesisClient 的代际管理：以 generation 计数持有 native composition，支持失效重建、排空清理任务与优雅关闭。 |
| [index.ts](../../../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [types.ts](../../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [zoteroHostCapabilityBroker.ts](../../zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [workflowSettings.ts](workflowSettings.ts.md) | src/modules/workflow/settings/workflowSettings.ts | 工作流设置的核心状态与投影模块：读写持久化设置记录、合并 run-once 临时覆盖，按后端/Provider 能力生成设置 UI 描述符，并解析出实际执行上下文与选项预览。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| resolveWorkflowParameterOptionsSource | 函数 | 51–164 | 按参数来源类型动态解析候选项：合成侧合约走 Synthesis client，宿主类来源走 Zotero Host 能力 Broker，并返回诊断信息。 |
