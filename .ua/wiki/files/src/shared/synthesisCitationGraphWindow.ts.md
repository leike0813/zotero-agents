
# src/shared/synthesisCitationGraphWindow.ts
所属分层：[页面与交互界面](../../../layers/ui-surface.md)  
所属目录：[src/shared](../../../modules/src/shared.md)
<!-- node: file:src/shared/synthesisCitationGraphWindow.ts -->

Citation Graph 窗口模型：定义有界窗口状态（generation、cursor、hover-only 集合与总量计数）与严格的 patch 合并规则，是宿主与页面共享的图谱分页数据契约。
源码：[src/shared/synthesisCitationGraphWindow.ts](../../../../../src/shared/synthesisCitationGraphWindow.ts)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisWorkbenchTab.ts](../modules/synthesis/workbench/synthesisWorkbenchTab.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchTab.ts | Synthesis 工作台页面运行时：持有 Preact 页面与宿主之间的 bridge、按 Surface 发送快照与 chrome、处理全部工作台 action（含命令执行、图谱布局与导出），并负责工作流触发、手势刷新与资源清理。 |
| [synthesisWorkbenchWireContract.ts](synthesisWorkbenchWireContract.ts.md) | src/shared/synthesisWorkbenchWireContract.ts | Synthesis Workbench 页面与 Zotero 宿主之间 postMessage envelope 的唯一 wire 契约来源。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [continueSynthesisCitationGraphWindow](../../../symbols/globals.md) | 函数 | 242–255 | 推进窗口的 continuation 状态：确认仍有后续页时把状态置为 paused 以便继续拉取。 |
| [createSynthesisCitationGraphWindow](../../../symbols/globals.md) | 函数 | 71–96 | 创建初始图谱窗口状态，记录 generation 与 basis，并初始化节点、边与 hover-only 集合。 |
| [failSynthesisCitationGraphWindow](../../../symbols/globals.md) | 函数 | 257–270 | 把窗口置为 failed 并记录失败原因，已加载内容保持不变以便诊断。 |
| [mergeSynthesisCitationGraphPage](../../../symbols/globals.md) | 函数 | 222–230 | 合并一页 citation graph 读取结果到窗口。 |
| [mergeSynthesisCitationGraphSlice](../../../symbols/globals.md) | 函数 | 232–240 | 合并一个邻域 slice 到窗口，slice 中的节点进入 hover-only 集合而不进主集合。 |
| [retrySynthesisCitationGraphWindow](../../../symbols/globals.md) | 函数 | 272–278 | 对失败窗口执行重试：generation 递增并以新 basis 重建窗口起点。 |
