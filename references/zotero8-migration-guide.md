可以把它概括成一句话：

**Zotero 8 对插件开发不是 Zotero 6→7 那种“重做一遍插件框架”的大迁移，而是“沿用 Zotero 7 的插件框架，但底层 Mozilla/Firefox 平台继续大升级，所以需要做一轮兼容性修补”。** 官方文档明确说，Zotero 8 基于 Firefox 115→140，而且“Zotero 7 for Developers”的大部分指导依然适用；反过来，Zotero 7 当年才是那个要求从 `install.rdf`/`update.rdf`/XUL overlays 迁到 `manifest.json`/`updates.json`/`bootstrap.js` 的大版本。([Zotero][1])

### Zotero 8 相比 Zotero 7，在插件方面主要变了什么

* **插件模型本身基本没换。** 也就是说，已经按 Zotero 7 方式写好的桌面端 add-on，原则上还是那套 `manifest.json + bootstrap.js (+ updates.json)` 思路，不需要像 6→7 那样重构注册方式。([Zotero][1])

* **Zotero 8 官方新增了一个更正式的菜单扩展 API：`Zotero.MenuManager.registerMenu()`。** 官方明确建议：能用这个 API 的，尽量不要再手工往 menu popup 里塞 DOM。它覆盖的目标位点很多，包括主窗口菜单栏、条目/分类右键菜单、tab 菜单、reader 菜单、item pane 行菜单、notes pane 按钮、侧边导航按钮等。([Zotero][1])

* **真正的兼容性压力主要来自底层平台升级，而不是 Zotero 自己重新设计了插件框架。** Zotero 8 官方把变更拆成两段：Firefox 115→128，以及 128→140；如果你的插件只适配过稳定版 Zotero 7（Firefox 115 基线），那这两段兼容性问题都要过一遍。([Zotero][1])

* **Zotero 8 的若干 UI 表面发生了明显变化，凡是“直接改 DOM / 绑选择器 / monkey patch UI”的插件都要额外复查。** 例如 Zotero 8 用统一的 citation dialog 取代了原来的 red bar、classic dialog 和 Add Note dialog；注释现在会出现在 items list；笔记默认能开 tab；“Rename File from Parent Metadata” 从条目右键菜单挪走了；reader 也新增了主题/外观面板。凡是碰这些界面的插件，都不要只做版本号放宽，要实际跑一遍交互。([Zotero][2])

* **还有一些较小但对特定插件有用的开发者变化。** Zotero 8 的 changelog 还提到：本地 HTTP API 现在能返回 annotations，并新增 `/fulltext` 端点；更新清单里还能用 `uninstall: true` 让插件在检查更新时自卸载。只有你的插件正好依赖这些能力时，才需要关心。([Zotero][3])

### 原来为 Zotero 7 开发的插件，兼容 Zotero 8 需要做哪些升级

我会按这个顺序做：

1. **先更新兼容性元数据，但不要只停留在改版本号。**
   `manifest.json` 里的 `applications.zotero` 仍然是必需的，`strict_max_version` 仍应写成“你实际测试过的最新 minor 版本”的 `x.x.*` 形式。对 Zotero 8，通常就是先提到 `8.0.*`；如果还想继续兼容 Zotero 7，就保留原来的最小版本下限，同时把 8 专属 API 做特性检测，不要直接裸调。([Zotero][4])

2. **把 JSM / 旧式模块加载迁到 ESM。**
   这是 Zotero 8 最核心的一项：Firefox/Zotero 里的 `.jsm` 已经转成 `.mjs` / `.sys.mjs`，Zotero 现在使用标准 JavaScript modules 和 `import`。官方还特别强调：

   * 旧的“全局导入”不再支持，导入结果必须绑定到变量；
   * 所有 ESM 都运行在 strict mode；
   * Zotero 提供了 `migrate-fx140/migrate.py esmify ...` 脚本帮助批量迁移。
     所以凡是你代码里有 `.jsm`、`ChromeUtils.import(...)`、依赖全局注入模块的地方，都该优先审计。([Zotero][1])

3. **把 Bluebird / `Zotero.spawn()` 风格的异步代码改成原生 Promise + `async/await`。**
   Zotero 8 已移除 Bluebird，并删除了 `Zotero.spawn()`。官方明确点名了一批不再可用的方法：`map()`、`filter()`、`each()`、`isResolved()`、`isPending()`、`cancel()`。`Zotero.Promise.delay()` 和 `Zotero.Promise.defer()` 还保留，但 `defer()` 不能再当构造器用。官方同样提供了 `migrate-fx140/migrate.py asyncify ...` 来辅助改造。([Zotero][1])

4. **处理 Firefox 115→128 这一段 API 断裂。**
   官方列出的高频 breakage 包括：去掉手工 `Services.jsm` 导入；`nsIScriptableUnicodeConverter` 被移除；`nsIOSFileConstantsService` 被移除；`XPCOMUtils.defineLazyGetter` 改为 `ChromeUtils.defineLazyGetter`；`nsIDOMChromeWindow` 被移除；登录管理器 `addLogin` 改成 `addLoginAsync`；`nsIFilePicker` 初始化应传 `BrowsingContext`；`DataTransfer.types.contains()` 改成 `includes()`；CSS 的 `-moz-nativehyperlinktext` 改成 `LinkText`。这类问题常见于老插件的底层调用和 UI 细节代码。([Zotero][1])

5. **把手工菜单注入改成 `MenuManager`，至少把高风险菜单先迁掉。**
   如果你的插件以前是在条目右键菜单、collection 菜单、reader 菜单、tab 菜单之类位置自己找节点再插菜单项，Zotero 8 最值得做的“API 化”升级就是改用 `Zotero.MenuManager.registerMenu()`。这不仅更稳，而且插件禁用/卸载时，对应 `pluginID` 的菜单还会自动移除。([Zotero][1])

6. **复查偏好设置面板和小型 UI 代码。**
   官方明确点名了几个容易漏掉的点：

   * preference pane 现在各自运行在独立全局作用域，共享变量要显式挂到 `window`；
   * button 文案要用 `label` 属性/属性值，而不是旧写法；
   * `ZOTERO_CONFIG` 现在需要显式导入；
   * `Services.appShell.hiddenDOMWindow` 在 macOS 之外已移除，只能当 fallback；
   * `zotero:` URI 的首段现在按 host 解析，不再算 path 的一部分。
     这些地方不一定会让插件“装不上”，但很容易造成某个设置页、按钮、协议处理、隐藏窗口逻辑悄悄失效。([Zotero][1])

### 需要特别注意什么

* **不要只改 `strict_max_version` 然后发布。**
  Zotero 8.0.4 甚至直接屏蔽了较旧的 Better BibTeX 版本，因为它们可能导致 Zotero 崩溃、卡死或无法正常退出。这个例子很能说明：兼容性标记应该反映“真实测试结果”，而不是“理论上应该能跑”。([Zotero][3])

* **如果你的插件已经在早期 “Zotero 7.1 / 8.0 beta” 上适配过，实际剩余工作可能会少很多。**
  因为官方说明过，早期 Zotero 8.0（当时叫 7.1）beta 就已经基于 Firefox 128，所以那时已经做过一部分 115→128 的迁移。([Zotero][1])

* **最脆弱的不是“官方插件 API”，而是你自己碰过的内部实现。**
  官方开发者页专门提醒：他们列出的 Mozilla 变化“几乎涵盖”了影响 Zotero 代码的部分，但如果你的插件用了 Zotero 自己没用到的 Firefox/Mozilla API，仍然可能遇到别的 breaking change；官方建议这时去 Searchfox 查当前正确用法。([Zotero][1])

* **如果插件还涉及平台兼容或原生集成，要留意系统下限。**
  Zotero 8 已不再支持 macOS 10.14 及更早版本，也不再支持 Windows 7/8。([Zotero][3])

### 一个很实用的审计清单

先在代码里全局搜这些关键词，基本能快速定位大部分 Zotero 8 兼容点：

```text
.jsm
ChromeUtils.import
Services.jsm
Zotero.spawn
Promise.map
Promise.filter
Promise.each
isPending(
cancel(
hiddenDOMWindow
addLogin(
nsIScriptableUnicodeConverter
nsIOSFileConstantsService
defineLazyGetter
contains(
-moz-nativehyperlinktext
setAttribute("label"
zotero:
```

这些关键词分别对应官方列出的 JSM→ESM、Bluebird 移除、旧 Mozilla API 删除/改名、菜单/按钮/UI 细节和 `zotero:` URI 解析变化。([Zotero][1])

整体上看，**Zotero 7 插件升到 Zotero 8 的正确心态是：框架不重做，底层兼容性要细修，UI 魔改要逐点回归测试。**
如果你愿意，我可以下一步直接按一个**真实 Zotero 7 插件项目**给你列一份“逐文件迁移 checklist”。

[1]: https://www.zotero.org/support/dev/zotero_8_for_developers "
	dev:zotero_8_for_developers [Zotero Documentation]
"
[2]: https://www.zotero.org/blog/zotero-8/ "Zotero Blog  » Blog Archive   » Zotero 8"
[3]: https://www.zotero.org/support/changelog "
	changelog [Zotero Documentation]
"
[4]: https://www.zotero.org/support/dev/zotero_7_for_developers "
	dev:zotero_7_for_developers [Zotero Documentation]
"
