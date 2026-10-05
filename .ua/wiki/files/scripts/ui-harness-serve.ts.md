
# scripts/ui-harness-serve.ts
所属分层：[构建、发布与工程配置](../../layers/build-tooling.md)  
所属目录：[scripts](../../modules/scripts.md)
<!-- node: file:scripts/ui-harness-serve.ts -->

UI Harness 本地服务：把只读 harness 页面、Synthesis workbench 快照与 i18n envelope 通过 HTTP 提供给浏览器，并支持 bundle 重建与 live reload。
源码：[scripts/ui-harness-serve.ts](../../../../scripts/ui-harness-serve.ts)

## 符号（6）
<!-- node: function:scripts/ui-harness-serve.ts:buildBrowserBundle -->
<!-- node: function:scripts/ui-harness-serve.ts:handleRequest -->
<!-- node: function:scripts/ui-harness-serve.ts:handleSynthesisAction -->
<!-- node: function:scripts/ui-harness-serve.ts:main -->
<!-- node: function:scripts/ui-harness-serve.ts:rebuildHarnessBundles -->
<!-- node: function:scripts/ui-harness-serve.ts:startLiveReloadWatchers -->

| 符号 | 类型 | 行 | 复杂度 | 标签 | 入边数 | 摘要 |
| --- | --- | --- | --- | --- | --- | --- |
| buildBrowserBundle | 函数 | 207–224 | 简单 | bundling、harness、build | 0 | 把 harness 前端源码打包为浏览器可直接加载的 bundle 文本。 |
| handleRequest | 函数 | 559–757 | 中等 | api-handler、http、routing | 0 | HTTP 请求分发入口：按路径处理静态资源、快照读取与动作请求。 |
| handleSynthesisAction | 函数 | 457–557 | 中等 | api-handler、read-only、harness | 0 | 处理只读 harness 收到的 Synthesis 动作请求，经 readonly client 取数并投影为 UI 快照。 |
| main | 函数 | 759–919 | 中等 | entry-point、http-server、bootstrap | 0 | 服务入口：解析环境变量、构建 bundle、启动 HTTP 服务与 live reload 监听。 |
| rebuildHarnessBundles | 函数 | 241–285 | 简单 | bundling、harness、dev-tool | 0 | 在启动与变更时重建全部 harness bundle，供页面刷新后加载。 |
| startLiveReloadWatchers | 函数 | 328–352 | 简单 | live-reload、watcher、dev-tool | 0 | 启动文件监听器，在 harness 源码变更时触发 live reload 与 bundle 重建。 |

## 导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [env.ts](../src/modules/harness/env.ts.md) | src/modules/harness/env.ts | Harness 环境变量解析器：只接受白名单内的三个路径变量，正确处理行内注释、引号与 export 前缀。 |
| [index.ts](../packages/synthesis-contracts/src/index.ts.md) | packages/synthesis-contracts/src/index.ts | Synthesis 共享合约包的 barrel 入口，把 client、graph、sidecar、topics、workflow 等 50 个合约模块的公开符号统一再导出，供插件侧与 Rust sidecar 共享同一套类型。 |
| [prefsReadonly.ts](../src/modules/harness/prefsReadonly.ts.md) | src/modules/harness/prefsReadonly.ts | 只读测试 Harness 中解析 Zotero prefs.js 的实现，按行解析 user prefs 与默认 prefs 并提供只读键值存储视图，供 UI Harness 在脱离 Zotero 宿主时读取插件首选项。 |
| [synthesisReadonlyClient.ts](../src/modules/harness/synthesisReadonlyClient.ts.md) | src/modules/harness/synthesisReadonlyClient.ts | 组装 Harness 只读 Synthesis 客户端：安装只读 Zotero 宿主 mock，打开 zoteroDB/pluginDB，并把只读 Port 接到统一的 clientPortAdapter 上。 |
| [synthesisWorkbenchI18nEnvelope.ts](../src/modules/harness/synthesisWorkbenchI18nEnvelope.ts.md) | src/modules/harness/synthesisWorkbenchI18nEnvelope.ts | 为只读 Harness 解析 locale 并读取 FTL 资源，构建与正式工作台一致的 i18n envelope，使 Harness 页面复用同一套文案键。 |
| [uiModel.ts](../src/modules/synthesis/uiModel.ts.md) | src/modules/synthesis/uiModel.ts | Synthesis 工作台的 UI 状态模型：把 workbench 契约快照规范化为可渲染的行集合，实现 topic / concept / tag / graph / review / registry 各面板的筛选与派生逻辑，并用纯函数 reducer 处理全部工作台 action。 |
| [workbenchUiAdapter.ts](../src/modules/synthesisClient/workbenchUiAdapter.ts.md) | src/modules/synthesisClient/workbenchUiAdapter.ts | 工作台 UI 适配层：把客户端侧的 workbench 读取结果与图谱失败翻译为 UI 可直接消费的形态，包括图谱布局失败的分类、忙状态识别与 read state 构造。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| handleRequest | 函数 | 559–757 | HTTP 请求分发入口：按路径处理静态资源、快照读取与动作请求。 |
| rebuildHarnessBundles | 函数 | 241–285 | 在启动与变更时重建全部 harness bundle，供页面刷新后加载。 |
