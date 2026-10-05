
# scripts/clear-acp-skills-records.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/clear-acp-skills-records.ts -->

一键清理 ACP Skills 运行记录的命令行薄封装，与 Chat 清理入口共享同一治理 CLI。
源码：[scripts/clear-acp-skills-records.ts](../../../../scripts/clear-acp-skills-records.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [cleanup-runtime-category-cli.ts](internal/cleanup-runtime-category-cli.ts.md) | scripts/internal/cleanup-runtime-category-cli.ts | 运行时持久化目录分类清理 CLI：扫描 runtime 数据树并按类别删除/保留条目，供 clear-* 脚本与运维流程调用。 |
