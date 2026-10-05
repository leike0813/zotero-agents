
# packages/synthesis-contracts/src/client.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/client.ts -->

Synthesis 客户端聚合接口：把 concepts、graph、references、sync、topics、workbench、debug 等 16 个子客户端组合为统一的 sidecar 客户端契约。
源码：[packages/synthesis-contracts/src/client.ts](../../../../../../packages/synthesis-contracts/src/client.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [concepts.ts](concepts.ts.md) | packages/synthesis-contracts/src/concepts.ts | 概念审阅客户端合约：定义 concepts 子客户端的读方法与审阅动作枚举，并重建 capability 描述结果供插件侧协商能力。 |
| [debug.ts](debug.ts.md) | packages/synthesis-contracts/src/debug.ts | 调试子客户端合约：声明 debug 能力的方法签名，并重建 capability 结果，把可用的调试命令与维护入口暴露给宿主。 |
| [graph.ts](graph.ts.md) | packages/synthesis-contracts/src/graph.ts | 引用图谱客户端合约：定义布局算法枚举、布局与指标刷新请求、命令结果状态集合，以及节点、边、窗口等 wire DTO。本文件为纯类型声明。 |
| [libraryIndex.ts](libraryIndex.ts.md) | packages/synthesis-contracts/src/libraryIndex.ts | 文献库索引合约：定义 libraryIndex 子客户端方法与索引结果结构（文献数、artifact 覆盖度与索引哈希），并重建 capability 结果。 |
| [lifecycle.ts](lifecycle.ts.md) | packages/synthesis-contracts/src/lifecycle.ts | 跨域生命周期契约：聚合 sidecar 启动对账、数据库重置、公共维护操作状态机，以及引用、标签、图谱、概念各域的 mutation result 类型。 |
| [references.ts](references.ts.md) | packages/synthesis-contracts/src/references.ts | 参考文献域契约：canonical revision 审阅动作、匹配提案动作枚举，以及 reference capability 结果重建。 |
| [sync.ts](sync.ts.md) | packages/synthesis-contracts/src/sync.ts | WebDAV 同步命令契约：冲突解决动作枚举、冲突解决请求，以及 SyncTransportClient 的 run/pause/resume/retry 接口。 |
| [tags.ts](tags.ts.md) | packages/synthesis-contracts/src/tags.ts | 标签域契约：词表 regulator 导出、审计 staging 条目、verified commit DTO 与 tag capability 结果重建。 |
| [topicGraph.ts](topicGraph.ts.md) | packages/synthesis-contracts/src/topicGraph.ts | 主题图谱审阅动作枚举与 topic graph capability 结果重建。 |
| [topics.ts](topics.ts.md) | packages/synthesis-contracts/src/topics.ts | 主题查询契约：list / find / context / resolver / workflow options 的请求与结果重建。 |
| [workbench.ts](workbench.ts.md) | packages/synthesis-contracts/src/workbench.ts | Synthesis 工作台契约：surface 枚举、各 surface 读结果、topic 详情、论文摘要读取与 operational chrome 快照重建。 |
| [workflow.ts](workflow.ts.md) | packages/synthesis-contracts/src/workflow.ts | 工作流契约：topic plan apply、literature digest apply、topic apply/report 结果重建，以及 artifact capability 结果。 |
| [workflowReview.ts](workflowReview.ts.md) | packages/synthesis-contracts/src/workflowReview.ts | 工作流审阅契约：审阅请求与结果重建，聚合 topic domain 与引用图谱数据。 |
