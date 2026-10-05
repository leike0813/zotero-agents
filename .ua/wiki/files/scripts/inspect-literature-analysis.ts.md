
# scripts/inspect-literature-analysis.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/inspect-literature-analysis.ts -->

调研脚本：针对 literature-analysis 工作流，检查 manifest 输入过滤、附件候选与选区解析结果，用于调试工作流输入物化。
源码：[scripts/inspect-literature-analysis.ts](../../../../scripts/inspect-literature-analysis.ts)

## 符号（5）
<!-- node: function:scripts/inspect-literature-analysis.ts:applyManifestInputFilter -->
<!-- node: function:scripts/inspect-literature-analysis.ts:collectAttachmentCandidates -->
<!-- node: function:scripts/inspect-literature-analysis.ts:flattenAttachments -->
<!-- node: function:scripts/inspect-literature-analysis.ts:main -->
<!-- node: function:scripts/inspect-literature-analysis.ts:resolveSelectionForInspection -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| applyManifestInputFilter | 函数 | 90–148 | 中等 | validation、workflow、filtering、diagnostics | 0 | 按 manifest 声明的输入过滤规则筛掉不合格条目与附件，复现工作流运行时的筛选语义。 |
| collectAttachmentCandidates | 函数 | 76–88 | 简单 | utility、attachment、aggregation | 0 | 按条目汇总附件候选，标注每个附件的父条目 id 与内容类型。 |
| flattenAttachments | 函数 | 49–74 | 简单 | utility、attachment、traversal | 0 | 递归展开文献条目的子附件树，得到扁平附件列表。 |
| main | 函数 | 225–282 | 中等 | entry-point、diagnostics、orchestration | 0 | 脚本主流程：加载工作流与 Host API，跑一遍输入过滤后打印候选与产物摘要。 |
| resolveSelectionForInspection | 函数 | 186–209 | 简单 | selection、diagnostics、workflow | 0 | 为检查场景构造选区事实，输出条目数与附件计数。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [hostApi.ts](../src/workflows/hostApi.ts.md) | src/workflows/hostApi.ts | Workflow Host API v12 的显式组合与投影点：把 logging、editor、clipboard、file、archive、bibliography、synthesis client 与 Zotero 宿主能力投影装配成一个受版本约束的 host api 对象。 |
| [loader.ts](../src/workflows/loader.ts.md) | src/workflows/loader.ts | 工作流加载器：扫描工作流目录与工作流包，解析并校验 manifest，按宿主环境（Zotero 沙箱或 Node 预编译）加载 hook 模块并汇总诊断。 |
| [runtime.ts](../src/workflows/runtime.ts.md) | src/workflows/runtime.ts | 工作流运行时：构造 hook 运行时上下文与宿主能力作用域，执行 preflight/buildRequest/applyResult 三类 hook，并把声明式请求编译与执行单元计划串成完整执行链。 |
| [types.ts](../src/workflows/types.ts.md) | src/workflows/types.ts | 工作流领域类型中心：定义 manifest、hook 签名、宿主 API 形状、产物与错误契约，是整个工作流子系统的事实源。 |
| [workflowHostContract.ts](../src/workflows/workflowHostContract.ts.md) | src/workflows/workflowHostContract.ts | Workflow Host API 契约：以候选 manifest 声明期望的能力面，检查实际实现的缺失、冗余与形状偏差，并解析契约版本。 |
