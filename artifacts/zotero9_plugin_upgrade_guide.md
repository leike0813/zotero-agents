# Zotero 7 插件升级为兼容 Zotero 9 的检查清单 / 步骤指引

> 适用对象：已经兼容 Zotero 7 的插件。  
> 目标：让插件在 Zotero 9.0.x 中可安装、可启用、核心功能可用、禁用 / 卸载可清理，并避免依赖 Zotero 8 / 9 中已变化的 Mozilla / Zotero 内部 API。

---

## 0. 迁移结论

对已经兼容 Zotero 7 的插件来说，升级到 Zotero 9 通常不是 Zotero 6 → 7 那种“大重写”。

主要风险集中在两类：

1. **Zotero 8 引入的 Firefox 140 / Mozilla 平台升级**
   - JSM → ESM
   - Bluebird 移除
   - `Zotero.spawn()` 等旧异步写法淘汰
   - preference pane 作用域变化
   - 部分 DOM / XUL / Mozilla API 变化

2. **Zotero 9 的版本兼容声明与新功能回归测试**
   - 需要更新 `manifest.json`
   - 需要更新 `updates.json`
   - 需要实际测试 Zotero 9.0.x
   - 需要确认 Reader、注释、偏好、本地化、菜单、item pane、item tree 等核心入口没有回归问题

---

# 一、准备阶段清单

## 1. 建立升级分支

- [ ] 新建分支，例如 `zotero9-compat`
- [ ] 标记当前 Zotero 7 可用版本，例如 `vX.Y.Z-zotero7-last`
- [ ] 准备一份真实用户配置升级路径测试：旧版 XPI → 新版 XPI
- [ ] 准备一份干净配置测试：空 profile 直接安装新版 XPI
- [ ] 明确本次发布是否继续支持 Zotero 7 / 8 / 9，还是只支持 Zotero 9

建议在 release note 中提前写清楚：

```markdown
Compatibility:
- Zotero 9.0.x supported.
- Minimum supported Zotero version: 8.0.
- Zotero 7 support: dropped / retained.
```

---

## 2. 使用独立开发 profile 和独立 data directory

不要用日常 Zotero 资料库直接测试。

- [ ] 创建专用 profile，例如 `zotero-plugin-dev`
- [ ] 创建专用 data directory，例如 `~/Zotero-dev-data`
- [ ] 在 Zotero 偏好设置中切换到专用 data directory
- [ ] 准备少量测试条目、PDF、EPUB、网页快照、笔记、注释、group library 测试数据

启动 Zotero 9 的建议命令：

```bash
/path/to/zotero -P zotero-plugin-dev -ZoteroDebugText -jsconsole -purgecaches
```

如果需要 DOM 检查、断点调试、网络请求检查，可使用：

```bash
/path/to/zotero -P zotero-plugin-dev -ZoteroDebugText -jsdebugger -purgecaches
```

---

# 二、manifest 与更新机制检查

## 3. 检查 `manifest.json`

如果插件已经兼容 Zotero 7，通常已经从 `install.rdf` 迁移到了 `manifest.json`。仍需重新检查以下内容：

- [ ] 根目录存在 `manifest.json`
- [ ] `manifest_version` 正确
- [ ] `name` 正确
- [ ] `version` 正确
- [ ] `applications.zotero` 存在
- [ ] `applications.zotero.id` 与旧插件 ID 完全一致
- [ ] `applications.zotero.update_url` 指向 JSON 更新清单
- [ ] `strict_min_version` 与真实最低支持版本一致
- [ ] `strict_max_version` 更新为已实际测试过的 Zotero 9 版本范围
- [ ] 插件图标路径存在
- [ ] XPI 打包后 `manifest.json` 位于 XPI 根目录

推荐模板：

```json
{
  "manifest_version": 2,
  "name": "Your Plugin Name",
  "version": "1.2.3",
  "description": "Your plugin description",
  "author": "Your Name",
  "icons": {
    "48": "icon.png",
    "96": "icon@2x.png"
  },
  "applications": {
    "zotero": {
      "id": "your-plugin@example.com",
      "update_url": "https://example.com/your-plugin/updates.json",
      "strict_min_version": "8.0",
      "strict_max_version": "9.0.*"
    }
  }
}
```

### `strict_min_version` 建议

| 场景 | 建议 |
|---|---|
| 继续支持 Zotero 7 / 8 / 9 | `"strict_min_version": "7.0"`，但必须实际测试三版 |
| 已使用 Zotero 8 / 9 API，放弃 Zotero 7 | `"strict_min_version": "8.0"` |
| 只承诺 Zotero 9 | `"strict_min_version": "9.0"` |
| 历史上需要兼容 Zotero 7 beta | 旧文档中可能出现 `"6.999"`，当前通常不再需要 |

不建议直接写：

```json
"strict_max_version": "*"
```

更稳妥的做法是：

```json
"strict_max_version": "9.0.*"
```

然后随着 Zotero 9.1、9.2 或未来版本发布后继续验证并更新。

---

## 4. 检查 `updates.json`

Zotero 7+ 插件应使用 JSON 更新清单，而不是旧的 `update.rdf`。

- [ ] 已废弃 `update.rdf`
- [ ] 使用 JSON 更新清单
- [ ] `addons.<plugin-id>.updates[]` 里包含新版本
- [ ] `version` 与 `manifest.json` 一致
- [ ] `update_link` 指向新版 XPI
- [ ] `update_hash` 使用 `sha256:<hash>`
- [ ] `applications.zotero.strict_min_version` 与 `manifest.json` 一致
- [ ] `applications.zotero.strict_max_version` 与 `manifest.json` 一致
- [ ] 通过 Zotero 插件更新功能实际测试自动更新

示例：

```json
{
  "addons": {
    "your-plugin@example.com": {
      "updates": [
        {
          "version": "1.2.3",
          "update_link": "https://example.com/releases/your-plugin-1.2.3.xpi",
          "update_hash": "sha256:PUT_SHA256_HASH_HERE",
          "applications": {
            "zotero": {
              "strict_min_version": "8.0",
              "strict_max_version": "9.0.*"
            }
          }
        }
      ]
    }
  }
}
```

生成 SHA-256 hash：

```bash
sha256sum your-plugin-1.2.3.xpi
```

或 macOS：

```bash
shasum -a 256 your-plugin-1.2.3.xpi
```

填入时格式应类似：

```json
"update_hash": "sha256:0123456789abcdef..."
```

---

# 三、Zotero 8 / Firefox 140 兼容性检查

Zotero 7 → Zotero 9 过程中，真正容易破坏代码的部分通常来自 Zotero 8 引入的 Firefox / Mozilla 平台升级。

## 5. 搜索高风险旧 API

在项目根目录执行：

```bash
grep -R -n \
  -e "Services.jsm" \
  -e "ChromeUtils.import(" \
  -e "\.jsm" \
  -e "Zotero.spawn" \
  -e "Zotero.Promise" \
  -e "Bluebird" \
  -e "OS.File" \
  -e "OS.Path" \
  -e "OS.Constants" \
  -e "nsIScriptableUnicodeConverter" \
  -e "XPCOMUtils.defineLazyGetter" \
  -e "XPCOMUtils.generateQI" \
  -e "nsIDOMChromeWindow" \
  -e "hiddenDOMWindow" \
  -e "Cu.unload" \
  -e "getElementsByAttribute" \
  -e "createElementNS" \
  -e "createElement(" \
  -e "tooltiptext" \
  -e "setAttribute(\"label\"" \
  ./src ./addon ./chrome ./content 2>/dev/null
```

逐项处理：

- [ ] 移除手动 `Services.jsm` import
- [ ] 将 JSM / `.jsm` 模块迁移到 ESM / `.mjs` / `.sys.mjs`
- [ ] 不再依赖 global import
- [ ] 导入模块必须赋值给变量
- [ ] 不再使用 Bluebird 实例方法，例如 `.map()`、`.filter()`、`.each()`、`.isPending()`
- [ ] 不再使用 `Zotero.spawn()`
- [ ] 用标准 `async/await` 和标准 Promise
- [ ] 文件操作优先使用 `Zotero.File`、`IOUtils`、`PathUtils`
- [ ] 不长期依赖 `OS.File` / `OS.Path` shim
- [ ] preference pane 多个脚本之间共享变量时，显式挂到 `window`
- [ ] 更新按钮文字时使用元素的 `label` property，而不是只改 attribute
- [ ] 检查 `zotero:` URI 解析逻辑

---

## 6. JSM → ESM 迁移重点

- [ ] 自有 `.jsm` 文件改为 `.mjs`
- [ ] `ChromeUtils.import()` 改为 `ChromeUtils.importESModule()` 或标准 `import`
- [ ] 避免依赖非严格模式行为，因为 ESM 默认 strict mode
- [ ] 检查 `this` 指向
- [ ] 检查隐式全局变量
- [ ] 检查重复参数名
- [ ] 检查 `arguments.callee`
- [ ] 检查未声明变量赋值
- [ ] 如果有构建工具，确认输出格式不再生成旧 JSM 风格

示例：

```js
// 旧写法
var { SomeModule } = ChromeUtils.import("chrome://your-plugin/content/someModule.jsm");

// 新写法
var { SomeModule } = ChromeUtils.importESModule("chrome://your-plugin/content/someModule.mjs");
```

如果使用标准 ESM：

```js
import { SomeModule } from "./someModule.mjs";
```

---

## 7. Bluebird / Generator / `Zotero.spawn()` 清理

- [ ] `Zotero.spawn(function* () { ... })` 改为 `async function () { ... }`
- [ ] `yield` 改为 `await`
- [ ] `Promise.coroutine` 改为 `async/await`
- [ ] Bluebird collection 方法改为标准循环
- [ ] 不再使用 `.isPending()` / `.isFulfilled()` / `.isRejected()` 等 Bluebird 特有方法
- [ ] 如果保留 `Zotero.Promise.delay(ms)`，最好统一封装
- [ ] 如果使用 `Zotero.Promise.defer()`，确认没有 `new Zotero.Promise.defer()` 这种错误写法

旧写法：

```js
await Zotero.Promise.map(items, async (item) => {
  await processItem(item);
});
```

新写法：

```js
for (const item of items) {
  await processItem(item);
}
```

旧写法：

```js
Zotero.spawn(function* () {
  let item = yield Zotero.Items.getAsync(id);
  yield processItem(item);
});
```

新写法：

```js
async function run() {
  const item = await Zotero.Items.getAsync(id);
  await processItem(item);
}

await run();
```

---

# 四、Zotero 7 插件架构复核

即使插件已经兼容 Zotero 7，也建议复核这些项目。

## 8. 生命周期

- [ ] `bootstrap.js` 存在
- [ ] 实现 `startup()`
- [ ] 实现 `shutdown()`
- [ ] 如有安装逻辑，实现 `install()`
- [ ] 如有卸载逻辑，实现 `uninstall()`
- [ ] UI 注入放在 `onMainWindowLoad()`
- [ ] UI 清理放在 `onMainWindowUnload()` 和 `shutdown()`
- [ ] 所有 observer 都能 unregister
- [ ] 所有 event listener 都能 remove
- [ ] 所有 timer 都能 clear
- [ ] 所有 menu / item pane / item tree / reader handler 都能清理
- [ ] 插件禁用、启用、升级、卸载都不要求重启 Zotero

建议维护一个全局 disposables 列表：

```js
const disposables = [];

function addDisposable(fn) {
  disposables.push(fn);
}

async function shutdown() {
  while (disposables.length) {
    const dispose = disposables.pop();
    try {
      await dispose();
    }
    catch (e) {
      Zotero.debug(`[your-plugin] Failed to dispose: ${e}`, 3);
    }
  }
}
```

---

## 9. 不再依赖 XUL overlay / `chrome.manifest`

- [ ] 不再依赖 `install.rdf`
- [ ] 不再依赖 `update.rdf`
- [ ] 不再依赖 XUL overlay
- [ ] 不再依赖 `chrome.manifest` 静态注册
- [ ] 如必须注册 `chrome://`，在 `startup()` 中 runtime register
- [ ] runtime registration 的返回对象在 `shutdown()` 中 `destruct()`

检查项目中是否还有这些文件或关键词：

```bash
find . -name "install.rdf" -o -name "update.rdf" -o -name "chrome.manifest"
grep -R -n "overlay" .
```

---

# 五、UI / API 现代化检查

优先使用 Zotero 官方提供的 API，少做 DOM monkey-patching。这样后续 Zotero 10 / 11 的维护成本会低很多。

---

## 10. 菜单：优先使用 `Zotero.MenuManager`

- [ ] 主窗口菜单不再手动 DOM 注入
- [ ] 右键菜单不再手动监听和插入
- [ ] 使用 `Zotero.MenuManager.registerMenu()`
- [ ] 传入正确 `pluginID`
- [ ] 使用 `onShowing` 控制显示 / 隐藏
- [ ] 使用 `onCommand` 执行业务逻辑
- [ ] 禁用 / 卸载后能自动或手动 unregister
- [ ] 菜单 ID、l10n ID 使用插件前缀

示例结构：

```js
const menuID = Zotero.MenuManager.registerMenu({
  menuID: "your-plugin-main-menu",
  pluginID: "your-plugin@example.com",
  target: "main/library/item",
  menus: [
    {
      menuType: "menuitem",
      l10nID: "your-plugin-menu-run",
      onShowing: (event, context) => {
        context.setVisible(!!context.items?.length);
      },
      onCommand: async (event, context) => {
        await runForItems(context.items);
      }
    }
  ]
});
```

---

## 11. 条目列表列：优先使用 `Zotero.ItemTreeManager`

- [ ] 自定义列使用 `Zotero.ItemTreeManager.registerColumn()`
- [ ] `dataKey` 唯一且命名空间化
- [ ] `pluginID` 正确
- [ ] 禁用 / 卸载时列能移除
- [ ] 大库中测试滚动性能
- [ ] 不在列渲染逻辑中执行高成本异步操作
- [ ] 不阻塞 item tree 滚动

检查点：

```text
[ ] 自定义列是否能显示
[ ] 自定义列是否能排序
[ ] 自定义列是否在重启后保留状态
[ ] 禁用插件后列是否消失
[ ] 重新启用插件后是否只出现一次
[ ] 大库滚动是否卡顿
```

---

## 12. 条目详情面板：优先使用 `Zotero.ItemPaneManager`

- [ ] 自定义 section 使用 `registerSection()`
- [ ] info 区自定义行使用 `registerInfoRow()`
- [ ] 不直接硬改 item pane DOM
- [ ] `paneID` / `rowID` / Fluent ID 全部命名空间化
- [ ] 测试普通条目
- [ ] 测试附件
- [ ] 测试笔记
- [ ] 测试注释
- [ ] 测试 group library
- [ ] 测试只读 library

检查点：

```text
[ ] 选中普通 item，section 正常显示
[ ] 选中 PDF 附件，section 正常显示
[ ] 选中 note，section 正常显示或正确隐藏
[ ] 选中 annotation，section 正常显示或正确隐藏
[ ] 多选 item 时行为正确
[ ] 只读 group 中不会出现可写操作
[ ] 插件禁用后 section 消失
```

---

## 13. Reader：优先使用 `Zotero.Reader.registerEventListener`

- [ ] 阅读器工具栏注入使用 `renderToolbar`
- [ ] 文本选区弹窗使用 `renderTextSelectionPopup`
- [ ] 注释右键菜单使用 `createAnnotationContextMenu`
- [ ] 缩略图菜单使用对应 reader event
- [ ] 标签选择器使用对应 reader event
- [ ] 视图菜单使用对应 reader event
- [ ] 不直接假设 reader 内部 DOM 结构稳定
- [ ] 禁用 / 卸载时 unregister
- [ ] 打开多个 reader tab 时不重复注册
- [ ] 关闭 reader tab 后不会遗留 listener

测试场景：

```text
[ ] PDF reader 打开正常
[ ] EPUB reader 打开正常
[ ] 网页快照 reader 打开正常
[ ] 工具栏按钮显示正常
[ ] 文字选区弹窗显示正常
[ ] 注释右键菜单显示正常
[ ] 关闭 reader tab 后无报错
[ ] 禁用插件后 reader UI 清理干净
[ ] 重新启用插件后 reader UI 不重复
```

---

# 六、偏好设置与本地化检查

## 14. 默认偏好设置

- [ ] 默认偏好放在插件根目录 `prefs.js`
- [ ] 不只放在 `defaults/preferences/`
- [ ] 升级后默认值能更新
- [ ] 新安装、启用、禁用、升级后偏好行为一致
- [ ] 偏好 key 使用插件命名空间
- [ ] 不污染全局 Zotero 偏好
- [ ] 删除插件后不会留下会破坏 Zotero 行为的偏好

推荐命名：

```js
pref("extensions.zotero.yourplugin.enabled", true);
pref("extensions.zotero.yourplugin.optionA", "default");
pref("extensions.zotero.yourplugin.optionB", false);
```

业务代码中读取：

```js
const enabled = Zotero.Prefs.get("extensions.zotero.yourplugin.enabled");
```

写入：

```js
Zotero.Prefs.set("extensions.zotero.yourplugin.enabled", true);
```

---

## 15. Preference pane

- [ ] 使用 `Zotero.PreferencePanes.register()`
- [ ] pane 文件使用 `.xhtml` 或片段结构
- [ ] 不再依赖旧 `<preferences>` 标签获取偏好值
- [ ] 读写偏好统一使用 `Zotero.Prefs.get()` / `Zotero.Prefs.set()`
- [ ] 如果多个 preference pane 脚本共享变量，显式放到 `window`
- [ ] pane 的 class、id、`data-l10n-id` 全部加插件前缀
- [ ] preference pane 打开、关闭、再次打开无报错
- [ ] 修改设置后立即生效或明确提示需要重启 / 重新打开窗口

检查点：

```text
[ ] 偏好页能打开
[ ] 所有控件显示正常
[ ] 默认值正确
[ ] 修改值后能保存
[ ] 重启 Zotero 后值仍保留
[ ] 禁用插件后偏好页入口消失
[ ] 重新启用插件后偏好页不重复
```

---

## 16. Fluent 本地化

- [ ] 使用 `.ftl`
- [ ] Fluent 文件名命名空间化，例如 `your-plugin.ftl`
- [ ] Fluent message ID 命名空间化，例如 `your-plugin-menu-run`
- [ ] 插入 UI 前先插入 FTL
- [ ] 不同插件之间不会冲突
- [ ] 测试英文
- [ ] 测试中文
- [ ] 测试系统语言切换
- [ ] 菜单 label 使用 `.label` 属性
- [ ] 避免多个插件使用同名 localization ID

示例：

```ftl
your-plugin-menu-run =
    .label = Run Your Plugin

your-plugin-pref-title = Your Plugin Preferences
```

中文示例：

```ftl
your-plugin-menu-run =
    .label = 运行插件

your-plugin-pref-title = 插件设置
```

命名规则建议：

```text
<plugin-prefix>-<area>-<purpose>
```

例如：

```text
your-plugin-menu-run
your-plugin-menu-export
your-plugin-pref-title
your-plugin-reader-button
your-plugin-item-pane-section-title
```

---

# 七、Zotero 9 新功能相关回归测试

Zotero 9 新增或强化的功能可能会影响插件行为，尤其是插件触碰 Reader、注释、附件、文档处理器、group library 或登录状态时。

---

## 17. Reader / 注释 / Read Aloud

- [ ] 打开 PDF，插件功能正常
- [ ] 打开 EPUB，插件功能正常
- [ ] 打开网页快照，插件功能正常
- [ ] 开启 Read Aloud 后，reader toolbar 注入不遮挡、不报错
- [ ] 选中文本弹窗仍正常
- [ ] 注释右键菜单仍正常
- [ ] 插件处理 annotation 时，不误处理 Read Aloud 产生的状态变化
- [ ] 如果插件读写注释内容，测试文字、高亮、图片、ink annotation
- [ ] 如果插件监听 reader 事件，确认不会在朗读过程中高频触发导致性能问题

测试用例：

```text
[ ] PDF：打开 → 高亮 → 右键注释 → 执行插件命令
[ ] PDF：打开 → 开启 Read Aloud → 执行插件命令
[ ] EPUB：打开 → 选择文本 → 执行插件命令
[ ] Snapshot：打开 → 选择文本 → 执行插件命令
[ ] Reader tab 关闭后无残留 listener
```

---

## 18. Recently Read / Last Read

- [ ] 插件自定义 item tree column 不与 Last Read 列冲突
- [ ] 插件排序、过滤、搜索不因新字段异常
- [ ] 插件若枚举列或字段，能忽略未知字段
- [ ] 插件若监听 item / attachment 变化，不因翻页导致过度触发或性能下降
- [ ] 最近阅读相关字段变化不会触发插件错误逻辑

测试用例：

```text
[ ] 打开 PDF 后返回 library，item tree 正常
[ ] 打开多个附件后 Recently Read / Last Read 相关列正常
[ ] 插件自定义列仍可显示
[ ] 插件自定义列仍可排序
[ ] Debug Output 无异常
```

---

## 19. 文档处理器中的 Add Annotation

如果插件涉及引用、注释、笔记导出、Word / LibreOffice / Google Docs 集成，需要测试：

- [ ] Zotero 9 的 Add Annotation 工作流
- [ ] 插件不要假设“注释必须先变成 Zotero note 才会被插入文档”
- [ ] 图片注释插入文档后插件相关逻辑不报错
- [ ] ink annotation 插入文档后插件相关逻辑不报错
- [ ] 多个 annotation 一次插入时插件逻辑正常
- [ ] 插入 annotation 后生成的活动引用不会被插件误删或错误改写

测试用例：

```text
[ ] Word 中插入普通 citation
[ ] Word 中插入 annotation
[ ] Word 中插入多个 annotation
[ ] Word 中插入图片 annotation
[ ] LibreOffice 中重复上述流程
[ ] Google Docs 中重复上述流程
```

---

## 20. Group library / 文件重命名

- [ ] group library 中插件功能正常
- [ ] 只读 group 中不会写入失败后无提示
- [ ] `Added By` / `Modified By` 字段出现时，插件 UI 不错位
- [ ] 如果插件处理附件文件名，测试 Zotero 9 的 per-group file renaming settings
- [ ] 不覆盖 Zotero 内置 group 重命名策略，除非插件功能就是重命名
- [ ] group library 和 personal library 中行为一致或有明确差异
- [ ] 同步后文件名、附件路径、链接附件状态正常

测试用例：

```text
[ ] Personal library：新增 item → 插件功能正常
[ ] Group library：新增 item → 插件功能正常
[ ] Read-only group：执行写入动作 → 正确禁用或提示
[ ] Group library：重命名附件 → 插件不破坏文件名规则
[ ] Group library：同步后重新打开 → 插件状态正常
```

---

## 21. Web-based login / sync / account

如果插件依赖 Zotero 登录状态、同步状态或账号信息，需要测试：

- [ ] 未登录状态
- [ ] 已登录状态
- [ ] 登录过期状态
- [ ] 切换账号状态
- [ ] 同步开启
- [ ] 同步关闭
- [ ] 网络离线
- [ ] 第三方 API key 不与 Zotero 登录状态混淆
- [ ] 插件自己的认证逻辑不依赖 Zotero 登录 UI 的旧 DOM
- [ ] 如果插件暴露本地 endpoint、protocol handler 或网页交互，检查 Zotero 9 安全变更影响

测试用例：

```text
[ ] 未登录 Zotero 时插件启动正常
[ ] 登录 Zotero 后插件启动正常
[ ] 退出登录后插件不崩溃
[ ] 同步失败时插件不误报为自身错误
[ ] 离线状态下插件有合理提示
```

---

# 八、安装、升级、卸载测试矩阵

## 22. 安装路径

- [ ] 干净 profile 安装新版 XPI
- [ ] Zotero 7 旧版插件 → Zotero 9 新版插件升级
- [ ] Zotero 8 旧版插件 → Zotero 9 新版插件升级
- [ ] Zotero 9 中旧版插件 → 新版插件升级
- [ ] 通过 `updates.json` 自动更新
- [ ] 手动拖入 XPI 更新
- [ ] 插件禁用后重新启用
- [ ] 插件卸载后重新安装
- [ ] 插件升级后偏好保留
- [ ] 插件升级后 UI 不重复注册
- [ ] 插件卸载后无残留菜单、按钮、列、section、reader handler

测试记录模板：

```markdown
| 场景 | 结果 | 备注 |
|---|---|---|
| 干净 profile 安装 | PASS / FAIL | |
| Zotero 7 旧版插件升级 | PASS / FAIL | |
| Zotero 8 旧版插件升级 | PASS / FAIL | |
| 自动更新 | PASS / FAIL | |
| 手动拖入 XPI 更新 | PASS / FAIL | |
| 禁用后重新启用 | PASS / FAIL | |
| 卸载后重新安装 | PASS / FAIL | |
```

---

## 23. 操作系统

至少覆盖：

- [ ] Windows 10
- [ ] Windows 11
- [ ] macOS Intel
- [ ] macOS Apple Silicon
- [ ] Linux X11
- [ ] Linux Wayland，如果插件涉及窗口、剪贴板、文件选择器、外部应用调用

操作系统测试重点：

```text
[ ] 路径处理是否正确
[ ] 文件名大小写行为是否正确
[ ] 非 ASCII 文件名是否正确
[ ] 中文路径是否正确
[ ] 剪贴板是否正确
[ ] 外部程序调用是否正确
[ ] 文件选择器是否正确
[ ] 高 DPI 图标是否清晰
[ ] 深色模式是否正常
```

---

## 24. 数据场景

- [ ] 空库
- [ ] 小库
- [ ] 大库，例如 10k+ items
- [ ] 多附件 item
- [ ] PDF
- [ ] EPUB
- [ ] 网页快照
- [ ] 普通 note
- [ ] annotation
- [ ] group library
- [ ] 只读 group
- [ ] 同步开启
- [ ] 同步关闭
- [ ] 离线状态
- [ ] 中文标题 / 作者 / 路径
- [ ] 超长标题
- [ ] 特殊字符标题
- [ ] 缺失附件
- [ ] 链接附件
- [ ] 存储附件

---

## 25. UI 场景

- [ ] 浅色主题
- [ ] 深色主题
- [ ] 高 DPI / Retina
- [ ] 界面语言为英文
- [ ] 界面语言为中文
- [ ] 主窗口打开 / 关闭后 UI 能恢复
- [ ] Reader tab 打开 / 关闭后 UI 能恢复
- [ ] 插件禁用后菜单、按钮、列、section 全部消失
- [ ] 插件重新启用后不重复注册 UI
- [ ] 多窗口场景正常
- [ ] 菜单快捷键不冲突
- [ ] 弹窗尺寸正常
- [ ] preference pane 尺寸正常
- [ ] 小屏幕或缩放比例下不溢出

---

# 九、代码质量与兼容性扫描

## 26. 增加 migration lint 脚本

建议放在：

```text
scripts/check-zotero9-compat.sh
```

脚本内容：

```bash
#!/usr/bin/env bash
set -euo pipefail

TARGETS="${1:-./src ./addon ./chrome ./content}"

echo "Checking high-risk Zotero 7 → 9 patterns..."

grep -R -n \
  -e "Services.jsm" \
  -e "ChromeUtils.import(" \
  -e "\.jsm" \
  -e "Zotero.spawn" \
  -e "Zotero.Promise" \
  -e "Bluebird" \
  -e "OS.File" \
  -e "OS.Path" \
  -e "OS.Constants" \
  -e "Cu.unload" \
  -e "getElementsByAttribute" \
  -e "setAttribute(\"label\"" \
  -e "install.rdf" \
  -e "update.rdf" \
  -e "chrome.manifest" \
  $TARGETS 2>/dev/null || true

echo "Done. Review every hit manually."
```

赋予执行权限：

```bash
chmod +x scripts/check-zotero9-compat.sh
```

运行：

```bash
./scripts/check-zotero9-compat.sh
```

---

## 27. 增加手工 smoke test 清单

```text
[ ] Zotero 9 启动，无插件加载错误
[ ] 插件显示在 Tools → Plugins
[ ] 插件启用状态正确
[ ] 主菜单正常显示
[ ] 右键菜单正常显示
[ ] 菜单命令可执行
[ ] 偏好页可打开
[ ] 修改偏好后立即生效
[ ] 关闭并重开 Zotero 后偏好保留
[ ] 打开 PDF reader 后插件 UI 正常
[ ] 打开 EPUB reader 后插件 UI 正常
[ ] 打开网页快照 reader 后插件 UI 正常
[ ] 注释相关功能正常
[ ] group library 中功能正常
[ ] 只读 group 中写操作被禁用或正确提示
[ ] 禁用插件后 UI 清理干净
[ ] 重新启用插件后没有重复 UI
[ ] 卸载插件后没有残留菜单 / 列 / section
[ ] Debug Output 中无 uncaught exception
```

---

## 28. 自动化测试建议

如果项目已有测试框架，建议增加以下测试：

- [ ] manifest schema 测试
- [ ] updates.json schema 测试
- [ ] XPI 打包完整性测试
- [ ] 插件 ID 一致性测试
- [ ] l10n ID 命名空间测试
- [ ] 禁止旧 API 字符串测试
- [ ] 构建产物不包含 `install.rdf`
- [ ] 构建产物不包含 `update.rdf`
- [ ] 构建产物不包含 `chrome.manifest`
- [ ] 构建产物根目录包含 `manifest.json`
- [ ] 构建产物根目录包含 `bootstrap.js`

示例 Node.js 检查逻辑：

```js
import fs from "fs";

const manifest = JSON.parse(fs.readFileSync("manifest.json", "utf8"));

if (!manifest.applications?.zotero?.id) {
  throw new Error("Missing applications.zotero.id");
}

if (!manifest.applications?.zotero?.strict_max_version) {
  throw new Error("Missing applications.zotero.strict_max_version");
}

if (!manifest.applications.zotero.strict_max_version.startsWith("9.")) {
  throw new Error("strict_max_version does not target Zotero 9");
}

console.log("manifest.json compatibility check passed");
```

---

# 十、发布前验收标准

## 29. Go / No-Go 标准

可以发布 Zotero 9 兼容版前，至少满足：

- [ ] `manifest.json` 声明到 `"strict_max_version": "9.0.*"`
- [ ] `updates.json` 声明到 `"strict_max_version": "9.0.*"`
- [ ] Zotero 9.0.x 干净安装成功
- [ ] 从 Zotero 7 / 8 旧版本升级成功，或明确声明不支持旧版本升级
- [ ] Debug Output 无关键错误
- [ ] 禁用、启用、卸载不需要重启
- [ ] 菜单功能测试通过
- [ ] 偏好页测试通过
- [ ] Reader 测试通过
- [ ] item pane 测试通过
- [ ] item tree 测试通过
- [ ] group library 测试通过
- [ ] 本地化测试通过
- [ ] 未使用已知高风险旧 API，或已记录兼容理由
- [ ] README 明确写出支持的 Zotero 版本
- [ ] release notes 明确写出支持的 Zotero 版本
- [ ] GitHub release / 下载页 / 插件仓库元数据同步更新
- [ ] 自动更新路径测试通过

---

## 30. Release notes 模板

如果放弃 Zotero 7 支持：

```markdown
## v1.2.3

### Compatibility

- Added support for Zotero 9.0.x.
- Minimum supported Zotero version: 8.0.
- Tested with Zotero 9.0.x on Windows, macOS, and Linux.
- Zotero 7 support is dropped in this release.

### Migration

- Updated `manifest.json` and `updates.json` compatibility range.
- Migrated remaining Firefox / Zotero platform APIs for Zotero 8 / 9.
- Replaced legacy UI injection with official Zotero APIs where applicable.

### Fixes

- Fixed preference pane scope issues.
- Fixed localization namespace conflicts.
- Fixed cleanup on plugin disable / uninstall.

### Notes

- Users on Zotero 7 should continue using v1.2.2.
```

如果继续支持 Zotero 7 / 8 / 9：

```markdown
## v1.2.3

### Compatibility

- Added support for Zotero 9.0.x.
- Zotero 7, 8, and 9 are supported.
- Tested with Zotero 7.x, Zotero 8.x, and Zotero 9.0.x.

### Migration

- Updated `manifest.json` and `updates.json` compatibility range.
- Improved compatibility with the Firefox 140 platform used by recent Zotero versions.
- Replaced legacy UI injection with official Zotero APIs where applicable.

### Fixes

- Fixed preference pane scope issues.
- Fixed localization namespace conflicts.
- Fixed cleanup on plugin disable / uninstall.

### Notes

- Zotero 9 is recommended.
```

---

# 十一、常见坑

## 31. 不要只改 `strict_max_version` 就发布

只改版本号可能能安装，但不代表兼容。至少要跑完：

- [ ] 启动测试
- [ ] 菜单测试
- [ ] 偏好页测试
- [ ] Reader 测试
- [ ] 禁用 / 卸载测试
- [ ] Debug Output 检查

---

## 32. 不要把 UI 全部硬插 DOM

优先使用官方 API：

- `Zotero.MenuManager`
- `Zotero.ItemTreeManager`
- `Zotero.ItemPaneManager`
- `Zotero.Reader.registerEventListener`
- `Zotero.PreferencePanes.register`

只有官方 API 无法覆盖时，才考虑 DOM 注入。DOM 注入必须保证：

- [ ] 元素 ID 命名空间化
- [ ] 可以完整清理
- [ ] 不重复注册
- [ ] 不依赖不稳定的内部 DOM
- [ ] 不影响其他插件

---

## 33. 不要忘记清理

最常见的 Zotero 插件问题之一是重复注册：

- 菜单出现两次
- 快捷键触发两次
- reader handler 触发两次
- preference pane 重复注册
- observer 没有 unregister
- timer 没有 clear
- item pane section 重复出现
- item tree column 重复出现

每一个 `register*` 都要能在 `shutdown()` 或对应 unload hook 中清理。

建议维护清理表：

```js
const cleanupTasks = [];

function registerCleanup(fn) {
  cleanupTasks.push(fn);
}

async function runCleanup() {
  while (cleanupTasks.length) {
    const fn = cleanupTasks.pop();
    try {
      await fn();
    }
    catch (err) {
      Zotero.debug(`[your-plugin] cleanup failed: ${err}`, 3);
    }
  }
}
```

---

## 34. 不要忽视本地化命名空间

所有这些都应加插件前缀：

- [ ] Fluent 文件名
- [ ] Fluent message ID
- [ ] DOM id
- [ ] CSS class
- [ ] menu ID
- [ ] row ID
- [ ] pane ID
- [ ] data key
- [ ] preference key

推荐前缀：

```text
your-plugin-
```

不要使用过于通用的 ID：

```text
menu-run
settings-title
export-button
```

推荐：

```text
your-plugin-menu-run
your-plugin-settings-title
your-plugin-export-button
```

---

## 35. 不要假设 Zotero 9 与 Zotero 7 完全一致

即使插件在 Zotero 7 可用，也要专门测试：

- [ ] Firefox 140 平台 API
- [ ] Reader
- [ ] Read Aloud
- [ ] Recently Read / Last Read
- [ ] Add Annotation
- [ ] group library 新字段
- [ ] 文件重命名设置
- [ ] web-based login
- [ ] 本地化冲突
- [ ] 默认偏好更新
- [ ] 插件禁用 / 启用 / 卸载

---

# 十二、推荐的实际执行顺序

## Step 1：确认是否只是 manifest 阻止安装

1. 在开发分支中修改 `manifest.json`
2. 临时设置：

```json
"strict_max_version": "9.0.*"
```

3. 打包 XPI
4. 在 Zotero 9 的开发 profile 中安装
5. 查看是否能启动、是否报错

如果插件无法加载，优先看：

```text
[ ] manifest.json 是否位于 XPI 根目录
[ ] bootstrap.js 是否位于 XPI 根目录
[ ] applications.zotero.id 是否正确
[ ] strict_min_version / strict_max_version 是否正确
[ ] Debug Output 是否有 bootstrap 加载错误
```

---

## Step 2：跑静态扫描，处理 Zotero 8 / Firefox 140 风险项

重点处理：

- [ ] JSM / ESM
- [ ] Bluebird
- [ ] `Zotero.spawn()`
- [ ] `OS.File`
- [ ] `OS.Path`
- [ ] preference pane scope
- [ ] 按钮 label 更新方式
- [ ] 旧 Mozilla / XUL API

---

## Step 3：替换高风险 UI 注入

优先迁移：

- [ ] 菜单 → `Zotero.MenuManager`
- [ ] item tree column → `Zotero.ItemTreeManager`
- [ ] item pane section / row → `Zotero.ItemPaneManager`
- [ ] reader toolbar / popup / annotation menu → `Zotero.Reader.registerEventListener`
- [ ] preference pane → `Zotero.PreferencePanes.register`

---

## Step 4：补全生命周期清理

专门测试：

- [ ] 启动
- [ ] 禁用
- [ ] 重新启用
- [ ] 升级
- [ ] 卸载
- [ ] 重启 Zotero
- [ ] 打开 / 关闭主窗口
- [ ] 打开 / 关闭 reader tab

目标：

```text
插件启用后所有 UI 出现一次；
插件禁用后所有 UI 完全消失；
插件重新启用后所有 UI 仍只出现一次。
```

---

## Step 5：更新 `manifest.json` 与 `updates.json`

建议在实际测试 Zotero 9.0.x 后设置：

```json
"strict_max_version": "9.0.*"
```

如果放弃 Zotero 7：

```json
"strict_min_version": "8.0"
```

如果只支持 Zotero 9：

```json
"strict_min_version": "9.0"
```

---

## Step 6：跑测试矩阵

至少覆盖：

- [ ] Windows
- [ ] macOS
- [ ] Linux
- [ ] 干净安装
- [ ] 旧版升级
- [ ] PDF reader
- [ ] EPUB reader
- [ ] snapshot reader
- [ ] group library
- [ ] 只读 group
- [ ] 偏好页
- [ ] 本地化
- [ ] 禁用 / 启用 / 卸载
- [ ] Debug Output 检查

---

## Step 7：发布新版 XPI 与 release notes

发布前确认：

- [ ] Git tag 已创建
- [ ] XPI 已上传
- [ ] `updates.json` 已更新
- [ ] `update_hash` 正确
- [ ] README 已更新
- [ ] release notes 已更新
- [ ] 下载页已更新
- [ ] 插件仓库元数据已更新
- [ ] 用户可通过自动更新获取新版本
- [ ] 用户手动下载 XPI 也可安装

---

# 十三、最终检查表

发布前可以直接勾选：

```text
基础兼容
[ ] manifest.json 已更新
[ ] updates.json 已更新
[ ] strict_min_version 正确
[ ] strict_max_version 正确
[ ] 插件 ID 未变化
[ ] XPI 可安装
[ ] 自动更新可用

平台兼容
[ ] 无旧 JSM 依赖，或已确认兼容
[ ] 无 Bluebird 依赖
[ ] 无 Zotero.spawn()
[ ] 无高风险 OS.File / OS.Path 依赖
[ ] preference pane scope 已处理
[ ] 按钮 label 更新方式已处理

UI
[ ] 菜单正常
[ ] 右键菜单正常
[ ] item tree 正常
[ ] item pane 正常
[ ] reader 正常
[ ] preference pane 正常
[ ] 本地化正常
[ ] 深色模式正常
[ ] 高 DPI 图标正常

生命周期
[ ] 启动正常
[ ] 禁用正常
[ ] 重新启用正常
[ ] 升级正常
[ ] 卸载正常
[ ] 不需要重启 Zotero
[ ] 没有重复 UI
[ ] 没有残留 listener / observer / timer

Zotero 9 功能回归
[ ] PDF reader 测试通过
[ ] EPUB reader 测试通过
[ ] 网页快照 reader 测试通过
[ ] Read Aloud 测试通过
[ ] 注释测试通过
[ ] Recently Read / Last Read 测试通过
[ ] Add Annotation 测试通过，如相关
[ ] group library 测试通过
[ ] 文件重命名测试通过，如相关
[ ] 登录 / 同步状态测试通过，如相关

发布
[ ] README 已更新
[ ] release notes 已更新
[ ] GitHub release 已发布
[ ] XPI 已上传
[ ] update_hash 正确
[ ] 用户升级路径已测试
```

---

# 十四、参考资料

- Zotero Plugin Development  
  https://www.zotero.org/support/dev/client_coding/plugin_development

- Zotero 7 for Developers  
  https://www.zotero.org/support/dev/zotero_7_for_developers

- Zotero 8 for Developers  
  https://www.zotero.org/support/dev/zotero_8_for_developers

- Zotero Changelog  
  https://www.zotero.org/support/changelog

- Zotero 9 Announcement  
  https://www.zotero.org/blog/zotero-9/

- Zotero dev-list compatibility discussion  
  https://groups.google.com/g/zotero-dev/c/uQhEGkJEzYs/m/ziubKzdaBgAJ