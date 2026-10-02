
# src/workflows/clipboard.ts
所属分层：[工作流引擎与执行](../../../layers/workflow-engine.md)  
所属目录：[src/workflows](../../../modules/src/workflows.md)
<!-- node: file:src/workflows/clipboard.ts -->

工作流剪贴板 owner：优先解析 Gecko 剪贴板、次选 navigator.clipboard，并提供纯内存 adapter 作为降级实现，统一的读写限额与取消语义在此收敛。

规模：234 行
源码：[src/workflows/clipboard.ts](../../../../../src/workflows/clipboard.ts)

## 符号（4）
<!-- node: function:src/workflows/clipboard.ts:createMemoryWorkflowClipboardAdapter -->
<!-- node: function:src/workflows/clipboard.ts:createWorkflowClipboardOwner -->
<!-- node: function:src/workflows/clipboard.ts:resolveGeckoClipboardAdapter -->
<!-- node: function:src/workflows/clipboard.ts:resolveNavigatorClipboardAdapter -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| createMemoryWorkflowClipboardAdapter | 函数 | 76–97 | 简单 | clipboard、adapter、fallback | 0 | 创建纯内存剪贴板 adapter，用作宿主无剪贴板能力时的降级实现。 |
| createWorkflowClipboardOwner | 函数 | 178–234 | 中等 | factory、clipboard、owner、exported | 1 | 创建剪贴板 owner，按优先级选定 adapter 并统一限额、取消与错误语义。 |
| resolveGeckoClipboardAdapter | 函数 | 99–145 | 简单 | clipboard、runtime、probe | 0 | 解析 Gecko 剪贴板运行时能力并构造对应 adapter。 |
| resolveNavigatorClipboardAdapter | 函数 | 147–172 | 简单 | clipboard、runtime、adapter | 0 | 解析 navigator.clipboard 并构造其 adapter。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [runtimeBridge.ts](../utils/runtimeBridge.ts.md) | src/utils/runtimeBridge.ts | 运行时宿主桥：跨 Zotero 7/9/10 差异地定位 Zotero、addon、console、窗口与宿主能力对象，容忍多种全局变量与隐藏 DOM 窗口的暴露方式，并支持测试注入覆盖。 |
| [types.ts](types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowHostErrorContract.ts](workflowHostErrorContract.ts.md) | src/workflows/workflowHostErrorContract.ts | Workflow Host 错误契约：错误码、严格 JSON 值校验、details 字段的逐码白名单清洗与脱敏，以及取消检查和错误构造的单一事实源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostApi.ts](hostApi.ts.md) | src/workflows/hostApi.ts | Workflow Host API v12 的显式组合与投影点：把 logging、editor、clipboard、file、archive、bibliography、synthesis client 与 Zotero 宿主能力投影装配成一个受版本约束的 host api 对象。 |
| [workflowHostOwners.ts](workflowHostOwners.ts.md) | src/workflows/workflowHostOwners.ts | Workflow Host 各类 owner 的构造函数集合：受管附件源、Broker 投影、叶子作用域、实时读适配、research bundle 导入与物化、库条目快照、addon 与环境 owner。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| createMemoryWorkflowClipboardAdapter | 函数 | 76–97 | 创建纯内存剪贴板 adapter，用作宿主无剪贴板能力时的降级实现。 |
| createWorkflowClipboardOwner | 函数 | 178–234 | 创建剪贴板 owner，按优先级选定 adapter 并统一限额、取消与错误语义。 |
