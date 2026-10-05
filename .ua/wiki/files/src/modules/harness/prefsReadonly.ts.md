
# src/modules/harness/prefsReadonly.ts
所属分层：[页面与交互界面](../../../../layers/ui-surface.md)  
所属目录：[src/modules/harness](../../../../modules/src/modules/harness.md)
<!-- node: file:src/modules/harness/prefsReadonly.ts -->

只读测试 Harness 中解析 Zotero prefs.js 的实现，按行解析 user prefs 与默认 prefs 并提供只读键值存储视图，供 UI Harness 在脱离 Zotero 宿主时读取插件首选项。
源码：[src/modules/harness/prefsReadonly.ts](../../../../../../src/modules/harness/prefsReadonly.ts)

## 被导入

| 节点 | 路径 | 摘要 |
| --- | --- | --- |
| [ui-harness-serve.ts](../../../scripts/ui-harness-serve.ts.md) | scripts/ui-harness-serve.ts | UI Harness 本地服务：把只读 harness 页面、Synthesis workbench 快照与 i18n envelope 通过 HTTP 提供给浏览器，并支持 bundle 重建与 live reload。 |

## 导出

| 符号 | 类型 | 行 | 摘要 |
| --- | --- | --- | --- |
| [installReadonlyZoteroPrefs](../../../../symbols/globals.md) | 函数 | 64–76 | 把只读 prefs 存储安装到 Harness 全局的 Zotero.Prefs 替身上，set/clear 会被主动拒绝以防止误写宿主状态。 |
| [parseZoteroPrefs](../../../../symbols/globals.md) | 函数 | 30–40 | 把 prefs.js 文本解析为扁平键值表，识别字符串、数字、布尔与 `user_pref` 前缀行。 |
| [readZoteroPrefsStore](../../../../symbols/globals.md) | 函数 | 42–51 | 从指定 prefs.js 路径读取并解析出只读首选项存储，解析失败时回退为空值表。 |
| [resolveZoteroPrefsPath](../../../../symbols/globals.md) | 函数 | 53–62 | 根据 Zotero 数据目录拼接出 prefs.js 的实际文件路径，供 Harness 定位首选项。 |
