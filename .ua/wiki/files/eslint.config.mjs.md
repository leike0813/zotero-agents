
# eslint.config.mjs
所属分层：[构建、发布与工程配置](../layers/build-tooling.md)  
所属目录：[.](../modules/index.md)
<!-- node: file:eslint.config.mjs -->

ESLint 扁平配置：汇总 zotero 插件基础规则，并按 scripts/tests/src/sidebar/dashboard/synthesis 分区覆写规则，同时排除生成目录与参考源码；其中 Synthesis 组件层用 no-restricted-imports 强制只允许页面同级、shared 与 preact 导入。
源码：[eslint.config.mjs](../../../eslint.config.mjs)

## 配置

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [assistantTranscriptRenderer.js](src/sidebar/assistantTranscriptRenderer.js.md) | src/sidebar/assistantTranscriptRenderer.js | Transcript 区域的命令式渲染器：虚拟滚动窗口、分页缓存与 anchor 保持、工具调用活动分组、代码块装饰及底部粘滞逻辑都在此实现。 |
| [index.ts](src/index.ts.md) | src/index.ts | 插件引导入口：创建 Addon 单例、注入打包资源路径，并通过 defineGlobal 把 Zotero 全局与 ztoolkit 暴露到插件作用域。 |
