
# src/modules/synthesisClient/workbenchUiAdapter.ts
所属分层：[Synthesis 领域与侧车](../../../../layers/synthesis-domain.md)  
所属目录：[src/modules/synthesisClient](../../../../modules/src/modules/synthesisClient.md)
<!-- node: file:src/modules/synthesisClient/workbenchUiAdapter.ts -->

工作台 UI 适配层：把客户端侧的 workbench 读取结果与图谱失败翻译为 UI 可直接消费的形态，包括图谱布局失败的分类、忙状态识别与 read state 构造。
源码：[src/modules/synthesisClient/workbenchUiAdapter.ts](../../../../../../src/modules/synthesisClient/workbenchUiAdapter.ts)

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [index.ts](../../../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [uiModel.ts](../synthesis/uiModel.ts.md) | src/modules/synthesis/uiModel.ts | Synthesis 工作台的 UI 状态模型：把 workbench 契约快照规范化为可渲染的行集合，实现 topic / concept / tag / graph / review / registry 各面板的筛选与派生逻辑，并用纯函数 reducer 处理全部工作台 action。 |

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [synthesisWorkbenchTab.ts](../synthesis/workbench/synthesisWorkbenchTab.ts.md) | src/modules/synthesis/workbench/synthesisWorkbenchTab.ts | Synthesis 工作台页面运行时：持有 Preact 页面与宿主之间的 bridge、按 Surface 发送快照与 chrome、处理全部工作台 action（含命令执行、图谱布局与导出），并负责工作流触发、手势刷新与资源清理。 |
| [ui-harness-serve.ts](../../../scripts/ui-harness-serve.ts.md) | scripts/ui-harness-serve.ts | UI Harness 本地服务：把只读 harness 页面、Synthesis workbench 快照与 i18n envelope 通过 HTTP 提供给浏览器，并支持 bundle 重建与 live reload。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [classifySynthesisWorkbenchGraphMutationResult](../../../../symbols/globals.md) | 函数 | 127–155 | 把图谱变更命令的结果分类为成功、冲突、存储忙、无效请求或内部错误。 |
| [createSynthesisWorkbenchGraphLayoutFailure](../../../../symbols/globals.md) | 函数 | 55–85 | 构造图谱布局失败 DTO，截断过长的错误文案并保留 graphHash、算法与发生时间。 |
| [isSynthesisWorkbenchGraphApplicationBusyError](../../../../symbols/globals.md) | 函数 | 87–105 | 识别 graph application busy / worker busy 类错误，把存储忙与真实失败区分开以决定 UI 呈现。 |
| [resolveSynthesisWorkbenchGraphLayoutStatus](../../../../symbols/globals.md) | 函数 | 157–177 | 综合命令结果与既有布局状态，得出当前图谱布局是否有效、过期或需要重算。 |
| [selectSynthesisWorkbenchGraphLayoutFailure](../../../../symbols/globals.md) | 函数 | 107–125 | 在多个候选失败中选择对用户最有信息量的一条作为展示文案。 |
| [toSynthesisWorkbenchPaperDigestReadRequest](../../../../symbols/globals.md) | 函数 | 232–299 | 从 UI 状态构造论文 digest 读取请求，组装 topic、item ref 与 digest 选项并做字段校验。 |
| [toSynthesisWorkbenchReadState](../../../../symbols/globals.md) | 函数 | 179–222 | 把客户端读取结果投影为契约的 workbench read state，缺失字段以显式 unavailable 补齐。 |
