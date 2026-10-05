
# packages/synthesis-application/package.json
所属分层：[Synthesis 领域与侧车](../../../layers/synthesis-domain.md)  
所属目录：[packages/synthesis-application](../../../modules/packages/synthesis-application.md)
<!-- node: config:packages/synthesis-application/package.json -->

Synthesis 应用层 npm workspace 清单，声明包名 `@zotero-agents/synthesis-application`、ESM 私有发布，并直接把包入口暴露为 `src/index.ts` 供 workspace 内直接消费源码。
源码：[packages/synthesis-application/package.json](../../../../../packages/synthesis-application/package.json)

## 配置

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [index.ts](src/index.ts.md) | packages/synthesis-application/src/index.ts | synthesis-application 包的 barrel 入口：重导出全部应用层模块，并额外实现 Workbench 运行期 chrome 读取（运行中/失败作业与缓存描述符）。 |
