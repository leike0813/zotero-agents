
# packages/synthesis-contracts/src/workbench.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/workbench.ts -->

Synthesis 工作台契约：surface 枚举、各 surface 读结果、topic 详情、论文摘要读取与 operational chrome 快照重建。
源码：[packages/synthesis-contracts/src/workbench.ts](../../../../../../packages/synthesis-contracts/src/workbench.ts)

## 符号（14）
<!-- node: function:packages/synthesis-contracts/src/workbench.ts:boundedString -->
<!-- node: function:packages/synthesis-contracts/src/workbench.ts:nonNegativeInteger -->
<!-- node: function:packages/synthesis-contracts/src/workbench.ts:rebuildBackgroundJob -->
<!-- node: function:packages/synthesis-contracts/src/workbench.ts:rebuildCacheReadiness -->
<!-- node: function:packages/synthesis-contracts/src/workbench.ts:rebuildProgress -->
<!-- node: function:packages/synthesis-contracts/src/workbench.ts:rebuildRepresentativeImage -->
<!-- node: function:packages/synthesis-contracts/src/workbench.ts:rebuildSynthesisWorkbenchChromeReadRequest -->
<!-- node: function:packages/synthesis-contracts/src/workbench.ts:rebuildSynthesisWorkbenchOperationalChromeResult -->
<!-- node: function:packages/synthesis-contracts/src/workbench.ts:rebuildSynthesisWorkbenchPaperDigestReadRequest -->
<!-- node: function:packages/synthesis-contracts/src/workbench.ts:rebuildSynthesisWorkbenchPaperDigestResult -->
<!-- node: function:packages/synthesis-contracts/src/workbench.ts:rebuildSynthesisWorkbenchReadState -->
<!-- node: function:packages/synthesis-contracts/src/workbench.ts:rebuildSynthesisWorkbenchSurfaceResult -->
<!-- node: function:packages/synthesis-contracts/src/workbench.ts:rebuildSynthesisWorkbenchTopicDetailResult -->
<!-- node: function:packages/synthesis-contracts/src/workbench.ts:strictObject -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| boundedString | 函数 | 1135–1144 | 简单 | validation、contract、parsing | 0 | 读取有长度上限的字符串字段，超限时抛出契约错误。 |
| nonNegativeInteger | 函数 | 1152–1162 | 简单 | validation、contract、parsing | 0 | 读取非负整数字段，负数与非整数值均判为契约错误。 |
| rebuildBackgroundJob | 函数 | 1271–1317 | 简单 | contract、rebuild、background-job | 0 | 重建后台作业投影，含作业种类、状态与最近终态。 |
| rebuildCacheReadiness | 函数 | 1182–1223 | 简单 | contract、rebuild、cache | 0 | 重建缓存就绪投影，区分 ready、stale、missing 与 failed。 |
| rebuildProgress | 函数 | 1225–1269 | 简单 | contract、rebuild、progress | 0 | 重建进度投影，记录完成比例、阶段与剩余量。 |
| rebuildRepresentativeImage | 函数 | 960–1030 | 中等 | contract、rebuild、workbench、image | 0 | 重建代表图投影，限制字节数并收敛不可用语义。 |
| rebuildSynthesisWorkbenchChromeReadRequest | 函数 | 1164–1173 | 简单 | contract、rebuild、workbench | 0 | 重建工作台 chrome 读取请求，校验可选 surface 集合。 |
| rebuildSynthesisWorkbenchOperationalChromeResult | 函数 | 1319–1349 | 简单 | contract、rebuild、workbench | 0 | 重建工作台 operational chrome 结果，聚合缓存、进度与后台作业。 |
| rebuildSynthesisWorkbenchPaperDigestReadRequest | 函数 | 889–958 | 中等 | contract、rebuild、workbench | 0 | 重建论文摘要读取请求，校验条目键与内容深度。 |
| rebuildSynthesisWorkbenchPaperDigestResult | 函数 | 1032–1093 | 中等 | contract、rebuild、workbench | 0 | 重建论文摘要结果，聚合正文分片、图与引用信息。 |
| rebuildSynthesisWorkbenchReadState | 函数 | 661–670 | 简单 | contract、rebuild、workbench | 0 | 重建工作台读状态，收敛 surface、就绪标志与错误语义。 |
| rebuildSynthesisWorkbenchSurfaceResult | 函数 | 758–780 | 简单 | contract、rebuild、workbench | 0 | 重建单个 surface 结果，区分就绪、空态与加载失败。 |
| rebuildSynthesisWorkbenchTopicDetailResult | 函数 | 836–845 | 简单 | contract、rebuild、workbench、topic | 0 | 重建主题详情结果，聚合定义、artifact 与统计。 |
| strictObject | 函数 | 1117–1133 | 简单 | utility、internal、synthesis | 0 | Synthesis 工作台契约：surface 枚举、各 surface 读结果、topic 详情、论文摘要读取与 operational chrome 快照重建。 内部的 strictObject 处理逻辑。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [common.ts](common.ts.md) | packages/synthesis-contracts/src/common.ts | 合约公共基础设施：定义协议版本、SynthesisClientError，以及 JSON 值/对象安全转换、字段精确性断言与结构化诊断重建工具。 |
| [graph.ts](graph.ts.md) | packages/synthesis-contracts/src/graph.ts | 引用图谱客户端合约：定义布局算法枚举、布局与指标刷新请求、命令结果状态集合，以及节点、边、窗口等 wire DTO。本文件为纯类型声明。 |
| [protocolSchema.ts](protocolSchema.ts.md) | packages/synthesis-contracts/src/protocolSchema.ts | 按 contract-set 中 registry.json 与各 JSON Schema，用 Ajv 校验并重建 sidecar 协议 DTO、capability 描述与 worker 描述。 |
| [references.ts](references.ts.md) | packages/synthesis-contracts/src/references.ts | 参考文献域契约：canonical revision 审阅动作、匹配提案动作枚举，以及 reference capability 结果重建。 |
| [tags.ts](tags.ts.md) | packages/synthesis-contracts/src/tags.ts | 标签域契约：词表 regulator 导出、审计 staging 条目、verified commit DTO 与 tag capability 结果重建。 |
| [topicDomain.ts](topicDomain.ts.md) | packages/synthesis-contracts/src/topicDomain.ts | 主题领域模型：topic 定义、resolver 条件、artifact、manifest 与 report 等核心类型集合，是 Synthesis 层的领域类型事实源。 |
| [topics.ts](topics.ts.md) | packages/synthesis-contracts/src/topics.ts | 主题查询契约：list / find / context / resolver / workflow options 的请求与结果重建。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client.ts](client.ts.md) | packages/synthesis-contracts/src/client.ts | Synthesis 客户端聚合接口：把 concepts、graph、references、sync、topics、workbench、debug 等 16 个子客户端组合为统一的 sidecar 客户端契约。 |
| [index.ts](../../synthesis-application/src/index.ts.md) | packages/synthesis-application/src/index.ts | synthesis-application 包的 barrel 入口：重导出全部应用层模块，并额外实现 Workbench 运行期 chrome 读取（运行中/失败作业与缓存描述符）。 |
| [synthesisSidecarBusinessAudit.ts](../../../src/modules/synthesis/sidecar/synthesisSidecarBusinessAudit.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarBusinessAudit.ts | sidecar 业务审计：以 started/succeeded/failed 三态记录每个生产 operation，依据 manifest 的语义成功字段与失败分类写入 runtime 日志，形成跨进程的业务级证据链。 |
| [synthesisSidecarWorkbenchClient.ts](../../../src/modules/synthesis/sidecar/synthesisSidecarWorkbenchClient.ts.md) | src/modules/synthesis/sidecar/synthesisSidecarWorkbenchClient.ts | sidecar 工作台客户端：提供 operational chrome 读取这一条短 deadline 调用，把 workbench 契约结果从 RPC 响应中重建出来。 |
| [workflow.ts](workflow.ts.md) | packages/synthesis-contracts/src/workflow.ts | 工作流契约：topic plan apply、literature digest apply、topic apply/report 结果重建，以及 artifact capability 结果。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| rebuildSynthesisWorkbenchChromeReadRequest | 函数 | 1164–1173 | 重建工作台 chrome 读取请求，校验可选 surface 集合。 |
| rebuildSynthesisWorkbenchOperationalChromeResult | 函数 | 1319–1349 | 重建工作台 operational chrome 结果，聚合缓存、进度与后台作业。 |
| rebuildSynthesisWorkbenchPaperDigestReadRequest | 函数 | 889–958 | 重建论文摘要读取请求，校验条目键与内容深度。 |
| rebuildSynthesisWorkbenchPaperDigestResult | 函数 | 1032–1093 | 重建论文摘要结果，聚合正文分片、图与引用信息。 |
| rebuildSynthesisWorkbenchReadState | 函数 | 661–670 | 重建工作台读状态，收敛 surface、就绪标志与错误语义。 |
| rebuildSynthesisWorkbenchSurfaceResult | 函数 | 758–780 | 重建单个 surface 结果，区分就绪、空态与加载失败。 |
| rebuildSynthesisWorkbenchTopicDetailResult | 函数 | 836–845 | 重建主题详情结果，聚合定义、artifact 与统计。 |
