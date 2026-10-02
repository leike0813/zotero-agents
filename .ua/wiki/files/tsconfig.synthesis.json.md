
# tsconfig.synthesis.json
所属分层：[构建、发布与工程配置](../layers/build-tooling.md)  
所属目录：[.](../modules/index.md)
<!-- node: config:tsconfig.synthesis.json -->

Synthesis 工作台的 TypeScript 子配置：以 Preact JSX + DOM lib、noEmit 方式检查 src/synthesis、synthesisWorkbenchApp.ts、src/shared 与 synthesis-contracts 源码。
源码：[tsconfig.synthesis.json](../../../tsconfig.synthesis.json)

## 配置

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisWorkbenchTab.ts](src/modules/synthesis/workbench/synthesisWorkbenchTab.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchTab.ts | Synthesis 工作台页面运行时：持有 Preact 页面与宿主之间的 bridge、按 Surface 发送快照与 chrome、处理全部工作台 action（含命令执行、图谱布局与导出），并负责工作流触发、手势刷新与资源清理。 |
