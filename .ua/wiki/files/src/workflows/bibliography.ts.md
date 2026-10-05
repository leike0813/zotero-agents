
# src/workflows/bibliography.ts
所属分层：[工作流引擎与执行](../../../layers/workflow-engine.md)  
所属目录：[src/workflows](../../../modules/src/workflows.md)
<!-- node: file:src/workflows/bibliography.ts -->

工作流参考文献渲染 owner：按 bibliography 格式调用 Zotero 内置 export translator 渲染书目，并规范化格式选项与 portable ref 输入。

规模：399 行
源码：[src/workflows/bibliography.ts](../../../../../src/workflows/bibliography.ts)

## 符号（5）
<!-- node: function:src/workflows/bibliography.ts:createWorkflowBibliographyOwner -->
<!-- node: function:src/workflows/bibliography.ts:formatDto -->
<!-- node: function:src/workflows/bibliography.ts:normalizeFormatOptions -->
<!-- node: function:src/workflows/bibliography.ts:requirePortableItemRef -->
<!-- node: function:src/workflows/bibliography.ts:resolveFormat -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| [createWorkflowBibliographyOwner](../../../symbols/src/workflows/bibliography.ts/createWorkflowBibliographyOwner.md) | 函数 | 194–398 | 复杂 | factory、bibliography、owner、exported | 1 | 创建书目 owner，绑定翻译器解析与宿主调用接缝。 |
| formatDto | 函数 | 140–152 | 简单 | bibliography、serialization、dto | 0 | 把解析出的翻译器信息序列化为 bibliography 格式 DTO。 |
| normalizeFormatOptions | 函数 | 154–177 | 简单 | bibliography、validation、options | 0 | 规范化书目渲染的显示选项。 |
| requirePortableItemRef | 函数 | 179–192 | 简单 | validation、portable-ref、security | 0 | 校验请求项为可移植条目引用，拒绝原生 ID 与路径。 |
| resolveFormat | 函数 | 117–138 | 简单 | bibliography、zotero-translator、resolution | 0 | 按请求的格式 ref 解析出 Zotero 导出翻译器。 |

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
| [zoteroHostCapabilityBroker.ts](../modules/zoteroHostCapabilityBroker.ts.md) | src/modules/zoteroHostCapabilityBroker.ts | Zotero 宿主能力 Broker：Zotero 宿主能力语义的唯一事实源，实现库读取、导航选择、快照、文献摄取、条目/笔记/附件/分类变更与回收站等全部 canonical mutation，并强制 preflight—审批—重校验—宿主 slice 执行的固定次序。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [createWorkflowBibliographyOwner](../../../symbols/src/workflows/bibliography.ts/createWorkflowBibliographyOwner.md) | 函数 | 194–398 | 创建书目 owner，绑定翻译器解析与宿主调用接缝。 |
