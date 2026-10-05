
# packages/synthesis-contracts/src/lifecycle.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-contracts/src](../../../../modules/packages/synthesis-contracts/src.md)
<!-- node: file:packages/synthesis-contracts/src/lifecycle.ts -->

跨域生命周期契约：聚合 sidecar 启动对账、数据库重置、公共维护操作状态机，以及引用、标签、图谱、概念各域的 mutation result 类型。
源码：[packages/synthesis-contracts/src/lifecycle.ts](../../../../../../packages/synthesis-contracts/src/lifecycle.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [citationGraphApplication.ts](citationGraphApplication.ts.md) | packages/synthesis-contracts/src/citationGraphApplication.ts | 引用图谱应用层合约：定义 slice/metrics/layout/rebuild/refresh-metrics 请求与 inspect、mutation 结果的判别式重建函数，施加统一的字段精确性与规模上限。 |
| [concepts.ts](concepts.ts.md) | packages/synthesis-contracts/src/concepts.ts | 概念审阅客户端合约：定义 concepts 子客户端的读方法与审阅动作枚举，并重建 capability 描述结果供插件侧协商能力。 |
| [tags.ts](tags.ts.md) | packages/synthesis-contracts/src/tags.ts | 标签域契约：词表 regulator 导出、审计 staging 条目、verified commit DTO 与 tag capability 结果重建。 |
| [topicGraph.ts](topicGraph.ts.md) | packages/synthesis-contracts/src/topicGraph.ts | 主题图谱审阅动作枚举与 topic graph capability 结果重建。 |
| [webDavSync.ts](webDavSync.ts.md) | packages/synthesis-contracts/src/webDavSync.ts | WebDAV 同步状态契约：sync head/state/conflict 的 schema ID 与版本、诊断与冲突报告重建、远端快照指针与路径生成。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [client.ts](client.ts.md) | packages/synthesis-contracts/src/client.ts | Synthesis 客户端聚合接口：把 concepts、graph、references、sync、topics、workbench、debug 等 16 个子客户端组合为统一的 sidecar 客户端契约。 |
| [concepts.ts](concepts.ts.md) | packages/synthesis-contracts/src/concepts.ts | 概念审阅客户端合约：定义 concepts 子客户端的读方法与审阅动作枚举，并重建 capability 描述结果供插件侧协商能力。 |
| [graph.ts](graph.ts.md) | packages/synthesis-contracts/src/graph.ts | 引用图谱客户端合约：定义布局算法枚举、布局与指标刷新请求、命令结果状态集合，以及节点、边、窗口等 wire DTO。本文件为纯类型声明。 |
| [references.ts](references.ts.md) | packages/synthesis-contracts/src/references.ts | 参考文献域契约：canonical revision 审阅动作、匹配提案动作枚举，以及 reference capability 结果重建。 |
| [sync.ts](sync.ts.md) | packages/synthesis-contracts/src/sync.ts | WebDAV 同步命令契约：冲突解决动作枚举、冲突解决请求，以及 SyncTransportClient 的 run/pause/resume/retry 接口。 |
| [tags.ts](tags.ts.md) | packages/synthesis-contracts/src/tags.ts | 标签域契约：词表 regulator 导出、审计 staging 条目、verified commit DTO 与 tag capability 结果重建。 |
| [topicGraph.ts](topicGraph.ts.md) | packages/synthesis-contracts/src/topicGraph.ts | 主题图谱审阅动作枚举与 topic graph capability 结果重建。 |
