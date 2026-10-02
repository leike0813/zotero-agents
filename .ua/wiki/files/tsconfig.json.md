
# tsconfig.json
所属分层：[构建、发布与工程配置](../layers/build-tooling.md)  
所属目录：[.](../modules/index.md)
<!-- node: config:tsconfig.json -->

主 TypeScript 配置：继承 zotero-types 的 sandbox 条目，只开启 allowImportingTsExtensions；纳入 src、typings 与 packages/*/src，并显式排除 dashboard、synthesis 与 sidebar 组件等由子配置负责的范围。
源码：[tsconfig.json](../../../tsconfig.json)

## 配置

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [addon.ts](src/addon.ts.md) | src/addon.ts | 插件基类：持有运行时数据（env、ztoolkit、locale、prefs、已加载工作流）、生命周期 hooks 集合与对外 api 容器。 |
| [index.ts](src/index.ts.md) | src/index.ts | 插件引导入口：创建 Addon 单例、注入打包资源路径，并通过 defineGlobal 把 Zotero 全局与 ztoolkit 暴露到插件作用域。 |
