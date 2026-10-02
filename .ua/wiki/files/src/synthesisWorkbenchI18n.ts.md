
# src/synthesisWorkbenchI18n.ts
所属分层：[页面与交互界面](../../layers/ui-surface.md)  
所属目录：[src](../../modules/src.md)
<!-- node: file:src/synthesisWorkbenchI18n.ts -->

Synthesis 工作台文案目录：以默认英文消息表为 SSOT，定义全部消息键，并把 sidecar 失败码投影为用户可读的失败卡片文案。
源码：[src/synthesisWorkbenchI18n.ts](../../../../src/synthesisWorkbenchI18n.ts)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisWorkbenchI18nEnvelope.ts](modules/harness/synthesisWorkbenchI18nEnvelope.ts.md) | src/modules/harness/synthesisWorkbenchI18nEnvelope.ts | 为只读 Harness 解析 locale 并读取 FTL 资源，构建与正式工作台一致的 i18n envelope，使 Harness 页面复用同一套文案键。 |
| [synthesisWorkbenchTab.ts](modules/synthesis/workbench/synthesisWorkbenchTab.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchTab.ts | Synthesis 工作台页面运行时：持有 Preact 页面与宿主之间的 bridge、按 Surface 发送快照与 chrome、处理全部工作台 action（含命令执行、图谱布局与导出），并负责工作流触发、手势刷新与资源清理。 |
| [synthesisWorkbenchWireContract.ts](shared/synthesisWorkbenchWireContract.ts.md) | src/shared/synthesisWorkbenchWireContract.ts | Synthesis Workbench 页面与 Zotero 宿主之间 postMessage envelope 的唯一 wire 契约来源。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [formatSynthesisWorkbenchMessage](../../symbols/globals.md) | 函数 | 926–934 | 按消息键从实际文案表取值并替换占位符，缺失键回退到默认消息表。 |
| [projectSynthesisSidecarFailureCard](../../symbols/globals.md) | 函数 | 896–912 | 把 sidecar 失败码、mutation 状态与图谱信息投影为失败卡片字段，未知码回退为通用文案。 |
