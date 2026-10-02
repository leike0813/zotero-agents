
# src/modules/synthesis/uiModel.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesis](../../../../modules/src/modules/synthesis.md)
<!-- node: file:src/modules/synthesis/uiModel.ts -->

Synthesis 工作台的 UI 状态模型：把 workbench 契约快照规范化为可渲染的行集合，实现 topic / concept / tag / graph / review / registry 各面板的筛选与派生逻辑，并用纯函数 reducer 处理全部工作台 action。
源码：[src/modules/synthesis/uiModel.ts](../../../../../../src/modules/synthesis/uiModel.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [builtinTagPolicy.ts](builtinTagPolicy.ts.md) | src/modules/synthesis/builtinTagPolicy.ts | Synthesis 内置状态标签策略的 SSOT：定义 status facet 的固定标签集合、可变/不可变字段，并在词表保存与协议写回时强制保护这些内置语义不被用户覆盖。 |
| [citationGraphVisualRules.ts](../../shared/citationGraphVisualRules.ts.md) | src/shared/citationGraphVisualRules.ts | Citation Graph 的视觉规则单一事实源：缩放范围、节点基准尺寸与上限、重要性光晕配色、边样式，以及可见性投影、入度统计、重要性计算等纯函数。 |
| [index.ts](../../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [synthesisWorkbenchWireContract.ts](../../shared/synthesisWorkbenchWireContract.ts.md) | src/shared/synthesisWorkbenchWireContract.ts | Synthesis Workbench 页面与 Zotero 宿主之间 postMessage envelope 的唯一 wire 契约来源。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisWorkbenchInvalidation.ts](workbench/synthesisWorkbenchInvalidation.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchInvalidation.ts | 工作台失效广播：维护 sidecar 变化监听者集合，把受影响的 Surface 名单、来源引用与原因一次性广播出去，供各区域按自身 signature 决定是否重渲染。 |
| [synthesisWorkbenchTab.ts](workbench/synthesisWorkbenchTab.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchTab.ts | Synthesis 工作台页面运行时：持有 Preact 页面与宿主之间的 bridge、按 Surface 发送快照与 chrome、处理全部工作台 action（含命令执行、图谱布局与导出），并负责工作流触发、手势刷新与资源清理。 |
| [ui-harness-serve.ts](../../../scripts/ui-harness-serve.ts.md) | scripts/ui-harness-serve.ts | UI Harness 本地服务：把只读 harness 页面、Synthesis workbench 快照与 i18n envelope 通过 HTTP 提供给浏览器，并支持 bundle 重建与 live reload。 |
| [workbenchUiAdapter.ts](../synthesisClient/workbenchUiAdapter.ts.md) | src/modules/synthesisClient/workbenchUiAdapter.ts | 工作台 UI 适配层：把客户端侧的 workbench 读取结果与图谱失败翻译为 UI 可直接消费的形态，包括图谱布局失败的分类、忙状态识别与 read state 构造。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [applySynthesisUiAction](../../../../symbols/globals.md) | 函数 | 3777–4197 | 工作台 UI reducer：按 action 类型更新筛选、选择、编辑态与视图模式，返回新状态而不修改入参。 |
| [buildSynthesisUiSnapshot](../../../../symbols/globals.md) | 函数 | 3396–3735 | 构建完整 UI 快照：把各面板的规范化行、筛选结果、审阅汇总与 sidecar 状态组装为发往页面的单一快照对象。 |
| [createDefaultSynthesisUiState](../../../../symbols/globals.md) | 函数 | 2794–2870 | 构造工作台默认 UI 状态：设定默认 Surface、筛选器、展开行集合与选择元素，避免首屏出现未定义读取。 |
| [getSynthesisUiOperationKey](../../../../symbols/globals.md) | 函数 | 697–742 | 为工作台 operation 生成稳定的复合标识键，区分同一操作在不同条目、Surface 与通道上的实例。 |
| [mergeSynthesisUiSnapshotInput](../../../../symbols/globals.md) | 函数 | 2872–2919 | 把新的 snapshot input 合并进既有状态，保留用户已做的筛选与展开选择，只更新数据面。 |
