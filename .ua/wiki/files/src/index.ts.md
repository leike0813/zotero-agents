
# src/index.ts
所属分层：[插件外壳与核心运行时](../../layers/plugin-core.md)  
所属目录：[src](../../modules/src.md)
<!-- node: file:src/index.ts -->

插件引导入口：创建 Addon 单例、注入打包资源路径，并通过 defineGlobal 把 Zotero 全局与 ztoolkit 暴露到插件作用域。
源码：[src/index.ts](../../../../src/index.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [addon.ts](addon.ts.md) | src/addon.ts | 插件基类：持有运行时数据（env、ztoolkit、locale、prefs、已加载工作流）、生命周期 hooks 集合与对外 api 容器。 |
| [package.json](../package.json.md) | package.json | 项目 npm 清单（v0.9.0，AGPL-3.0）：定义插件身份与 prefs 前缀、packages/* workspaces，并集中声明构建、四路 TypeScript 类型检查、Node/Zotero/Rust 测试、Host Bridge 与内容包发布等约 140 条脚本。 |
