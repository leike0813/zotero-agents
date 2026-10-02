
# src/modules/synthesisClient/workflowHostClient.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesisClient](../../../../modules/src/modules/synthesisClient.md)
<!-- node: file:src/modules/synthesisClient/workflowHostClient.ts -->

Workflow 宿主侧的 Synthesis API 实现：把工作流传入的 bundle 物化为 topic apply 请求，并代理 topic/digest/tag 等工作流对 sidecar 的调用。
源码：[src/modules/synthesisClient/workflowHostClient.ts](../../../../../../src/modules/synthesisClient/workflowHostClient.ts)

## 符号（5）
<!-- node: function:src/modules/synthesisClient/workflowHostClient.ts:createWorkflowSynthesisHostApi -->
<!-- node: function:src/modules/synthesisClient/workflowHostClient.ts:materializeTopicApplyRequest -->
<!-- node: function:src/modules/synthesisClient/workflowHostClient.ts:normalizeWorkflowSynthesisError -->
<!-- node: function:src/modules/synthesisClient/workflowHostClient.ts:resolveWorkflowItem -->
<!-- node: function:src/modules/synthesisClient/workflowHostClient.ts:snapshotWorkflowSynthesisItem -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createWorkflowSynthesisHostApi | 函数 | 543–933 | 复杂 | factory、workflow-host、rpc-代理、核心 | 0 | 构造工作流侧 Synthesis API：代理 topic plan/apply、digest apply、tag audit 与文献快照等全部工作流能力。 |
| [materializeTopicApplyRequest](../../../../symbols/src/modules/synthesisClient/workflowHostClient.ts/materializeTopicApplyRequest.md) | 函数 | 313–500 | 复杂 | 物化、topic、workflow-host、校验 | 1 | 把工作流传入的原始 bundle 物化为 topic apply 请求：校验输入上限、解析条目引用并补齐物化资产。 |
| normalizeWorkflowSynthesisError | 函数 | 104–155 | 中等 | 错误处理、契约、workflow-host | 1 | 把 sidecar 与契约异常归一为 WorkflowHostError，使工作流可按错误码而非文案决策。 |
| resolveWorkflowItem | 函数 | 274–293 | 简单 | 解析、workflow-host、快照 | 1 | 按工作流传入的条目引用解析出 Zotero 条目并生成快照，缺失时返回结构化错误。 |
| snapshotWorkflowSynthesisItem | 函数 | 216–272 | 中等 | 投影、workflow-host、快照 | 1 | 把 Zotero 条目投影为工作流侧可用的 item snapshot，收敛字段并裁剪多余属性。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [defaultClient.ts](defaultClient.ts.md) | src/modules/synthesisClient/defaultClient.ts | 默认 SynthesisClient 的代际管理：以 generation 计数持有 native composition，支持失效重建、排空清理任务与优雅关闭。 |
| [index.ts](../../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [synthesisWorkbenchInvalidation.ts](../synthesis/workbench/synthesisWorkbenchInvalidation.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchInvalidation.ts | 工作台失效广播：维护 sidecar 变化监听者集合，把受影响的 Surface 名单、来源引用与原因一次性广播出去，供各区域按自身 signature 决定是否重渲染。 |
| [types.ts](../../workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowHostErrorContract.ts](../../workflows/workflowHostErrorContract.ts.md) | src/workflows/workflowHostErrorContract.ts | Workflow Host 错误契约：错误码、严格 JSON 值校验、details 字段的逐码白名单清洗与脱敏，以及取消检查和错误构造的单一事实源。 |
| [zoteroHostCapabilityBroker.ts](../zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |
| [zoteroHostMutationAuthority.ts](../zoteroHostMutationAuthority.ts.md) | src/modules/zoteroHostMutationAuthority.ts | canonical mutation 权威层：生成语义摘要、在 SQLite 中做 durable insert winner 选举、驱动 attempt 状态机与终态证据保留，并提供 operation 查询、重放与 receipt 钉住能力。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostApi.ts](../../workflows/hostApi.ts.md) | src/workflows/hostApi.ts | Workflow Host API v12 的显式组合与投影点：把 logging、editor、clipboard、file、archive、bibliography、synthesis client 与 Zotero 宿主能力投影装配成一个受版本约束的 host api 对象。 |
| [runtime.ts](../../workflows/runtime.ts.md) | src/workflows/runtime.ts | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |
| [workflowHostOwners.ts](../../workflows/workflowHostOwners.ts.md) | src/workflows/workflowHostOwners.ts | Workflow Host 各类 owner 的构造函数集合：受管附件源、Broker 投影、叶子作用域、实时读适配、research bundle 导入与物化、库条目快照、addon 与环境 owner。 |

## 相关

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [defaultClient.ts](defaultClient.ts.md) | src/modules/synthesisClient/defaultClient.ts | 默认 SynthesisClient 的代际管理：以 generation 计数持有 native composition，支持失效重建、排空清理任务与优雅关闭。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createWorkflowSynthesisHostApi | 函数 | 543–933 | 构造工作流侧 Synthesis API：代理 topic plan/apply、digest apply、tag audit 与文献快照等全部工作流能力。 |
| [materializeTopicApplyRequest](../../../../symbols/src/modules/synthesisClient/workflowHostClient.ts/materializeTopicApplyRequest.md) | 函数 | 313–500 | 把工作流传入的原始 bundle 物化为 topic apply 请求：校验输入上限、解析条目引用并补齐物化资产。 |
| snapshotWorkflowSynthesisItem | 函数 | 216–272 | 把 Zotero 条目投影为工作流侧可用的 item snapshot，收敛字段并裁剪多余属性。 |
