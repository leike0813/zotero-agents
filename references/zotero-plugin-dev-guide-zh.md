# 
	dev:zotero_7_for_developers [Zotero Documentation]

Zotero 7 开发者指南
---------------------

Zotero 7 包含了对 Zotero 所基于的 Mozilla 平台的重大内部升级,整合了从 Firefox 60 到 Firefox 115 的变更。这次升级带来了巨大的性能提升、新的 JavaScript 和 HTML 功能、更好的操作系统兼容性和平台集成,以及对 Apple Silicon Mac 的原生支持。

虽然这次升级需要对 Zotero 代码库进行大规模重写,并且由于 Mozilla 平台的技术变化,许多插件也需要进行修改,但展望未来,我们预计将使 Zotero 与 Firefox 扩展支持版(ESR)版本保持同步,版本之间的技术变化相对较少。

**另请参阅:** [Zotero 8 for Developers](https://www.zotero.org/support/dev/zotero_8_for_developers "dev:zotero_8_for_developers")

反馈
--------

如果您对本页面的任何内容有疑问,或在更新插件时遇到其他问题,请在 [开发者邮件列表](https://groups.google.com/g/zotero-dev "https://groups.google.com/g/zotero-dev")上告知我们。请不要在 Zotero 论坛上发布关于 Zotero 7 的问题。

开发版本
----------

警告:这些是基于 Firefox 115 的测试版本,仅供 Zotero 插件开发者使用,**不应在生产环境中使用**。我们强烈建议使用[单独的配置文件和数据目录](https://www.zotero.org/support/kb/multiple_profiles "https://www.zotero.org/support/kb/multiple_profiles")进行开发。

`dev` 频道已暂停。请使用 [Zotero 7 beta 版本](https://www.zotero.org/support/beta_builds "beta_builds")进行开发。

示例插件
-------------

我们创建了一个非常简单的插件 [Make It Red](https://github.com/zotero/make-it-red "https://github.com/zotero/make-it-red")来演示本文档中讨论的一些概念。它让所有东西都变成红色。

我们将随着继续开发 Zotero 7 插件框架并解决开发者邮件列表中的问题来更新这个插件。

由于 Zotero 基于 Firefox,因此可以使用 Firefox 开发者工具与 DOM 交互、设置代码断点、跟踪网络请求等。

Zotero 7 beta 版本包含 Firefox 115 的开发工具。要使用打开的浏览器工具箱启动 beta 版本,请在命令行中传递 `-jsdebugger` 标志:

```
$ /Applications/Zotero\ Beta.app/Contents/MacOS/zotero -ZoteroDebugText -jsdebugger
```


当从源代码运行 Zotero 时,向 [build_and_run 脚本](about:/support/dev/client_coding/building_the_desktop_app#helper_script "dev:client_coding:building_the_desktop_app")传递 `-d` 标志将重新构建(`-r`)包含开发工具的版本并传递 `-jsdebugger`。

插件变更
--------------

**所有 Zotero 插件都需要为 Zotero 7 进行更新。**

Zotero 7 插件继续提供对平台内部(XPCOM、文件访问等)的完全访问权限,但 Mozilla 平台本身不再支持类似的扩展。所有 Firefox 扩展现在都基于与 Chrome 和其他浏览器共享的、功能更加有限的 WebExtensions API,该 API 为常见的集成点提供沙箱化的 API。

我们没有计划在 Zotero 中实施类似的限制。然而,由于 Mozilla 平台的变化,一些集成技术不再可用,所有插件都需要改变在 Zotero 中注册自己的方式。

### install.rdf → manifest.json

旧的 install.rdf 清单必须替换为 [WebExtension 风格的 manifest.json 文件](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/manifest.json "https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/manifest.json")。大多数 WebExtension manifest.json 键在 Zotero 中不相关,但您应该从 install.rdf 传输主要元数据。

```
{
  "manifest_version": 2,
  "name": "Make It Red",
  "version": "1.1",
  "description": "Makes everything red",
  "author": "Zotero",
  "icons": {
    "48": "icon.png",
    "96": "icon@2x.png"
  },
  "applications": {
    "zotero": {
      "id": "make-it-red@zotero.org",
      "update_url": "https://www.zotero.org/download/plugins/make-it-red/updates.json",
      "strict_min_version": "6.999",
      "strict_max_version": "7.0.*"
    }
  }
}
```


`applications.zotero` 基于 `[browser_specific_settings.gecko](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings "https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings")`,必须存在 Zotero 才能安装您的插件。您应该将 `strict_max_version` 设置为您测试过插件的最新次版本的 `x.x.*`。(如果不需要更改,您可以稍后通过更新清单更新兼容性,而无需分发新版本。)

使用 `"strict_min_version": "6.999"` 以允许您的插件在 Zotero 7 beta 版本上安装。

#### 迁移过程

插件可以通过同时包含 install.rdf 和 manifest.json 文件来在 Zotero 6 和 Zotero 7 中工作。Zotero 6 将使用 install.rdf,而 Zotero 7 将使用 manifest.json。

您可以为 Zotero 6 加载覆盖层代码,为 Zotero 7 加载引导代码(如上所述),或者可以通过在 Zotero 6 的 install.rdf 中添加 `<em:bootstrap>true</em:bootstrap>` 来创建一个单独的引导版本。

### update.rdf → updates.json

用于指定更新的旧 RDF 更新清单必须替换为 [Mozilla 风格的 JSON 更新清单](https://extensionworkshop.com/documentation/manage/updating-your-extension/ "https://extensionworkshop.com/documentation/manage/updating-your-extension/"):

```
{
  "addons": {
    "make-it-red@zotero.org": {
      "updates": [
        {
          "version": "2.0",
          "update_link": "https://download.zotero.org/plugins/make-it-red/make-it-red-2.0.xpi",
          "update_hash": "sha256:4a6dd04c197629a02a9c6beaa9ebd52a69bb683f8400243bcdf95847f0ee254a",
          "applications": {
            "zotero": {
              "strict_min_version": "6.999"
            }
          }
        }
      ]
    }
  }
}
```


Zotero 6 也支持这种清单格式,但有一些变化:您必须使用 `applications.gecko` 而不是 `applications.zotero` 来指定最小和最大版本,并且您必须使用 Firefox 平台版本而不是 Zotero 应用程序版本。由于 Zotero 6 基于 Firefox 60.9.0 ESR,因此可以为 `strict_min_version` 和 `strict_max_version` 使用 `60.9`。

```
{
  "addons": {
    "make-it-red@zotero.org": {
      "updates": [
        {
          "version": "1.0",
          "update_link": "https://download.zotero.org/plugins/make-it-red/make-it-red-1.0.xpi",
          "update_hash": "sha256:8f383546844b17eb43bd7f95423d7f9a65dfbc0b4eb5cb2e7712fb88a41d02e3",
          "applications": {
            "gecko": {
              "strict_min_version": "60.9",
              "strict_max_version": "60.9"
            }
          }
        }
      ]
    }
  }
}
```


在此示例中,版本 1.2 与 Zotero 6 和 7 兼容,版本 2.0 仅与 Zotero 7 兼容:

```
{
  "addons": {
    "make-it-red@zotero.org": {
      "updates": [
        {
          "version": "1.2",
          "update_link": "https://download.zotero.org/plugins/make-it-red/make-it-red-1.2.xpi",
          "update_hash": "sha256:9b0546d5cf304adcabf39dd13c9399e2702ace8d76882b0b37379ef283c7db13",
          "applications": {
            "gecko": {
              "strict_min_version": "60.9",
              "strict_max_version": "60.9"
            },
            "zotero": {
              "strict_min_version": "6.999",
              "strict_max_version": "7.0.*"
            }
          }
        },
        {
          "version": "2.0",
          "update_link": "https://download.zotero.org/plugins/make-it-red/make-it-red-2.0.xpi",
          "update_hash": "sha256:4a6dd04c197629a02a9c6beaa9ebd52a69bb683f8400243bcdf95847f0ee254a",
          "applications": {
            "zotero": {
              "strict_min_version": "6.999",
              "strict_max_version": "7.0.*"
            }
          }
        }
      ]
    }
  }
}
```


#### 迁移过程

由于 Zotero 6 已经支持新的 JSON 更新清单,我们建议您现在创建 JSON 清单,并在 install.rdf 中将新版本插件指向其 URL,即使您还没有为 Zotero 7 更新插件。如上所述,您可以提供一个清单,该清单现在提供仅支持 Zotero 6 的版本,稍后添加支持 Zotero 6 和 7 的版本和/或仅支持 Zotero 7 的版本,所有这些都来自同一个文件。

但是,由于您无法确保所有用户都会在升级到 Zotero 7 之前升级到指向 JSON URL 的新版本,并且由于 Zotero 7 将不再能够解析 RDF 更新清单,因此存在用户停留在旧版本上的风险。为避免这种情况,您也可以使新的 JSON 清单从旧的 RDF URL 可用。即使有 .rdf 扩展名,Zotero 也会检测到它是 JSON 清单并正确处理它。

### XUL Overlays → bootstrap.js

这可能是大多数插件开发者的最大变化。

Zotero 6 及更早版本支持两种类型的插件:

1. 覆盖层插件,使用 XUL 覆盖层将元素 — 包括 `<script>` 元素 — 注入到现有窗口的 DOM 中
    
2. 引导插件,以编程方式将自身插入应用程序并根据需要修改 DOM,并且可以在不重启 Zotero 的情况下启用和禁用
    

这些对应于 Firefox 56 之前遗留 Firefox 扩展的两种类型。

Mozilla 平台不再支持任何一种扩展类型 — 而是支持 WebExtensions(或 Thunderbird 中的 MailExtensions) — 并且不再支持 XUL 覆盖层。我们不认为限制性的 WebExtensions 风格的 API 适合 Zotero 插件生态系统,因此我们为 Zotero 插件重新实现了对引导扩展的支持,以供将来使用。

大多数现有的 Zotero 插件使用覆盖层,需要重写为引导插件。

Zotero 7 中的引导 Zotero 插件需要两个组件:

1. 如上所述的 WebExtension 风格的 manifest.json 文件
    
2. 包含处理各种事件函数的 bootstrap.js 文件:
    
    * 插件生命周期钩子
        
    * 窗口钩子
        

#### 插件生命周期钩子

插件生命周期钩子基于遗留 Mozilla [引导扩展框架](http://www.devdoc.net/web/developer.mozilla.org/en-US/docs/Mozilla/Add-ons/Bootstrapped_Extensions.html#Bootstrap_entry_points "http://www.devdoc.net/web/developer.mozilla.org/en-US/docs/Mozilla/Add-ons/Bootstrapped_Extensions.html#Bootstrap_entry_points"):

* `startup()`
    
* `shutdown()`
    
* `install()`
    
* `uninstall()`
    

插件生命周期钩子接收两个参数:

* 具有这些属性的对象:
    
    * `id`,插件 ID
        
    * `version`,插件版本
        
    * `rootURI`,指向插件文件的字符串 URL。对于 XPI,这将是 `jar:file:///` URL。此值始终以斜杠结尾,因此您可以附加相对路径以获取插件捆绑文件的 URL(例如,`rootURI + 'style.css'`)。
        
* 表示事件原因的数字,可以对照以下常量进行检查:`APP_STARTUP`、`APP_SHUTDOWN`、`ADDON_ENABLE`、`ADDON_DISABLE`、`ADDON_INSTALL`、`ADDON_UNINSTALL`、`ADDON_UPGRADE`、`ADDON_DOWNGRADE`
    

任何与特定窗口无关的初始化都应由 `startup` 触发,而删除应由 `shutdown` 触发。

请注意,Zotero 6 提供 `resourceURI` nsIURI 对象而不是 `rootURI` 字符串,因此为了 Zotero 6 兼容性,如果未提供 `rootURI`,您需要将 `resourceURI.spec` 分配给 `rootURI`。

在 Zotero 7 中,只有在 Zotero 初始化之后才会调用 `install()` 和 `startup()` 引导方法,并且 `Zotero` 对象在引导作用域中自动可用,以及 `Services`、`Cc`、`Ci` 和其他 Mozilla 和浏览器对象。在 Zotero 6 中不是这种情况,在这些函数可以在 `Zotero` 对象可用之前加载,并且不会自动获取 `window` 属性,例如 `URL`。(在 Zotero 6 中,`Zotero` 在 `uninstall()` 中也不可用。)示例插件提供了[等待 `Zotero` 对象可用](https://github.com/zotero/make-it-red/blob/main/src-1.2/bootstrap.js "https://github.com/zotero/make-it-red/blob/main/src-1.2/bootstrap.js")和[导入全局属性](https://github.com/zotero/make-it-red/blob/main/src-1.2/make-it-red.js "https://github.com/zotero/make-it-red/blob/main/src-1.2/make-it-red.js")的示例,这些示例在适用于 Zotero 6 和 7 的引导插件中。

引导插件可以在不重启 Zotero 的情况下被禁用或卸载,因此您需要确保在 `shutdown()` 函数中删除所有功能。

#### 窗口钩子

窗口钩子仅在 Zotero 7 中可用,在 Zotero 主窗口打开和关闭时调用:

* `onMainWindowLoad()`
    
* `onMainWindowUnload()`
    

窗口钩子接收一个参数:

* 具有包含目标窗口的 `window` 属性的对象
    

在某些平台上,主窗口可以在 Zotero 会话期间多次打开和关闭,因此任何与窗口相关的活动(例如,修改主界面、添加菜单或绑定快捷键)都必须由 `onMainWindowLoad` 执行,以便新的主窗口包含您的更改。

然后,当调用 `onMainWindowUnload` 时,您必须**删除对窗口或窗口内对象的所有引用,取消任何计时器等**,否则每次窗口关闭时都有可能创建内存泄漏。添加到窗口的 DOM 元素将在窗口关闭时自动销毁,因此您只需要在 `shutdown()` 中删除它们,您可以通过遍历所有窗口来实现:

```
function shutdown() {
    var windows = Zotero.getMainWindows();
    for (let win of windows) {
        win.document.getElementById('make-it-red-stylesheet')?.remove();
    }
}
```


(目前仅支持一个主窗口,但一些用户可能会找到打开多个主窗口的方法,这将在未来的版本中正式支持。)

某些插件可能需要 Zotero 中的其他钩子才能作为引导插件良好工作。如果您在通过 XUL 覆盖层完成以前的工作时遇到问题,请在 [zotero-dev](https://groups.google.com/g/zotero-dev "https://groups.google.com/g/zotero-dev")上告知我们。

### chrome.manifest → runtime chrome 注册

Mozilla 平台不再支持用于注册资源的 chrome.manifest 文件。

在许多情况下,您可能不再需要注册 `chrome://` URL,因为可以通过直接使用相对路径或将相对路径附加到传递给插件 `startup()` 函数的 `rootURI` 字符串来加载资源。但是,某些函数(例如用于 JSM 的 `ChromeUtils.import()` 或 Firefox 102 之后的 ESM)只接受 `chrome://` 内容 URL。`.prop` 和 `.dtd` 语言环境文件仍然需要注册为 chrome 文件。如果按照下一节说明使用 Fluent,则不需要注册 `locale` 文件夹。

您可以在插件的 `startup` 函数中注册 `content` 和 `locale` 资源:

```
var chromeHandle;
 
function startup({ id, version, rootURI }, reason) {
    var aomStartup = Cc["@mozilla.org/addons/addon-manager-startup;1"].getService(Ci.amIAddonManagerStartup);
    var manifestURI = Services.io.newURI(rootURI + "manifest.json");
    chromeHandle = aomStartup.registerChrome(manifestURI, [
        ["content", "make-it-red", "chrome/content/"],
        ["locale", "make-it-red", "en-US", "chrome/locale/en-US/"],
        ["locale", "make-it-red", "fr", "chrome/locale/fr/"]
    ]);
```


在 `shutdown()` 中取消注册文件,以防插件被禁用、删除或升级:

```
chromeHandle.destruct();
chromeHandle = null;
```


### 本地化

Mozilla 引入了一个新的本地化系统,称为 [Fluent](https://projectfluent.org/ "https://projectfluent.org/"),它取代了 .dtd 和 .properties 本地化。虽然 .dtd 和 .properties 在当前版本的 Zotero 7 中仍然受支持,但 Mozilla 在 Firefox 115 中完全删除了 .dtd 文件,并且正在努力删除 .properties 文件的使用。为了确保未来的兼容性,插件作者应该致力于使用 Fluent 进行本地化。

有关创建 Fluent 文件的更多信息,请参阅 [Fluent 语法指南](https://projectfluent.org/fluent/guide/ "https://projectfluent.org/fluent/guide/")。

#### 注册 Fluent 文件

要在插件中使用 Fluent,请在插件根目录中创建一个 `locale` 文件夹,并为每个语言环境创建子文件夹,并在每个语言环境文件夹中放置 .ftl 文件:

```
locale/en-US/make-it-red.ftl
locale/fr-FR/make-it-red.ftl
locale/zh-CN/make-it-red.ftl
```


您放置在语言环境子文件夹中的任何 .ftl 文件都将自动注册到 Zotero 的本地化系统中。

#### 在文档中使用 Fluent 文件

您可以使用 `<link>` 元素将随插件包含的 Fluent 文件应用于文档。

例如,位于以下位置的 Fluent 文件

`[插件根目录]/locale/en-US/make-it-red.ftl`

可以包含在 XHTML 文件中

```
<link rel="localization" href="make-it-red.ftl"/>
```


如果文档的默认命名空间是 XUL,请将 HTML 作为替代命名空间(`xmlns:html="http://www.w3.org/1999/xhtml"`)并添加链接前缀:

```
<html:link rel="localization" href="make-it-red.ftl"/>
```


如果修改现有窗口,可以动态创建 `<link>` 元素:

```
MozXULElement.insertFTLIfNeeded("make-it-red.ftl");
```


(`MozXULElement` 将是您正在修改的窗口的属性。)

请确保在对 DOM 进行任何更改之前已将 FTL 插入到窗口中。

如果添加到现有窗口,请务必在插件的 `shutdown` 函数中删除 `<link>`:

```
doc.querySelector('[href="make-it-red.ftl"]').remove();
```


#### 替换 .dtd 文件

Fluent 的主要模式是基于标记的方法,它会自动将本地化字符串插入 DOM,在其最简单的形式中类似于 DTD 实体替换。

在大多数情况下,迁移字符串将非常简单。例如,您可能会将包含 DTD 实体的此 XUL 代码替换为:

```
<tab label="&make-it-red.tabs.advanced.label;"/>
```


包含 Fluent 标识符的此代码:

```
<tab data-l10n-id="make-it-red-tabs-advanced" />
```


然后,您可以更改 .dtd 文件中的伴随行:

```
<!ENTITY make-it-red.tabs.advanced.label  "Advanced">
```


更改到 .ftl 文件中的此 Fluent 语句:

```
make-it-red-tabs-advanced =
    .label = Advanced
```


请注意,DTD 实体中的 `.label` 只是一个约定。在 Fluent 标识符中,`.label` 指定 `label` 属性作为字符串替换的目标。

与 DTD 不同,您还可以指定字符串的参数作为 JSON:

```
<tab data-l10n-id="make-it-red-intro-message" data-l10n-args='{"name": "Stephanie"}'/>
```


有关在标记中使用 Fluent 的更多示例,请参阅 [Mozilla 文档](https://firefox-source-docs.mozilla.org/l10n/fluent/tutorial.html#markup-localization "https://firefox-source-docs.mozilla.org/l10n/fluent/tutorial.html#markup-localization")。

#### 替换 .properties 文件

Fluent 的基于标记的方法也可以用于在运行时设置或更新字符串。每个 DOM 文档都包含一个 `document.l10n` 属性,该属性是 [DOMLocalization](https://searchfox.org/mozilla-esr102/source/dom/webidl/DOMLocalization.webidl "https://searchfox.org/mozilla-esr102/source/dom/webidl/DOMLocalization.webidl") 类型的对象。一旦为文档添加了 .ftl 文件的 `<link>`,就可以调用 `document.l10n.setAttributes()` 或 `document.l10n.setArgs()` 来动态设置或更新元素的本地化:

```
document.l10n.setAttributes(element, "make-it-red-alternative-color");
```


这将设置元素的 `data-l10n-id` 属性。

您还可以同时设置 ID 和参数(`data-l10n-args`):

```
document.l10n.setAttributes(element, "make-it-red-alternative-color", {
  color: 'Green'
});
```


或者您可以只更新参数:

```
document.l10n.setArgs(element, {
  color: 'Green'
});
```


对于需要在窗口上下文中检索字符串但不将其应用于 DOM 的情况,例如使用 `confirmEx()` 显示提示,可以使用 `document.l10n` 的 [Localization](https://searchfox.org/mozilla-esr102/source/dom/webidl/Localization.webidl "https://searchfox.org/mozilla-esr102/source/dom/webidl/Localization.webidl") 接口:

```
var msg = await document.l10n.formatValue('make-it-red-intro-message', { name });
alert(msg);
```


如果您真的需要在完全窗口上下文之外生成本地化字符串,可以在给定作用域内创建一次 `Localization` 对象,然后调用该对象的 `formatValue()` 方法(或其他 `Localization` 方法之一):

```
var l10n = new Localization(["make-it-red.ftl"]);
```


```
var caption = await l10n.formatValue('make-it-red-prefs-color-caption');
```


要包含参数,请传递对象而不是字符串:

```
var msg = await l10n.formatValue('make-it-red-welcome-message', { name: "Stephanie" });
```


还提供了其他函数,用于一次检索多个值(`formatValues`)和在字符串与基于标记的方法共享时检索属性。有关完整的详细信息,请参阅 [Localization 接口定义](https://searchfox.org/mozilla-esr102/source/dom/webidl/Localization.webidl "https://searchfox.org/mozilla-esr102/source/dom/webidl/Localization.webidl")。

(也可以通过向构造函数传递 `true` 作为第二个参数并使用 `formatValueSync()` 等同步方法来同步使用 `Localization` 接口,但这会执行同步 IO,Mozilla 强烈不建议这样做。)

#### 避免本地化冲突

**给定 DOM 文档中的 Fluent 标识符共享全局命名空间。** 如果将 Fluent 文件添加到共享文档 — Zotero 主窗口、Zotero 首选项等 — 您必须为文件中的所有标识符添加插件名称前缀(例如,`make-it-red-prefs-shade-of-red`)。如果 Fluent 文件仅添加到您自己的文档中,则不需要前缀。

**Fluent 文件名也共享全局命名空间。** 如果您不以插件命名 .ftl 文件,则必须将它们放置在每个语言环境文件夹的子文件夹中,以避免冲突:

```
locale/en-US/make-it-red/main.ftl
locale/en-US/make-it-red/preferences.ftl
locale/fr-FR/make-it-red/main.ftl
locale/fr-FR/make-it-red/preferences.ftl
locale/zh-CN/make-it-red/main.ftl
locale/zh-CN/make-it-red/preferences.ftl
```


如果使用子文件夹,请在引用文件时包含子文件夹(例如,`href="make-it-red/preferences.ftl"`)。

对于大多数插件,以插件命名的单个文件可能是更好的方法。

### 默认首选项

在 Zotero 6 中,可以通过在插件的 `defaults/preferences/` 文件夹中创建 .js 文件来设置默认首选项:

```
pref("extensions.make-it-red.intensity", 100);
```


这些默认首选项在启动时自动加载。虽然这对于需要重启的覆盖层插件工作正常,但引导插件可以随时安装或启用,并且它们的默认首选项直到 Zotero 重启才会被读取。

**在 Zotero 7 中,默认首选项应放置在插件根目录中的 `prefs.js` 文件中**,遵循相同的格式。这些首选项将在安装或启用插件时读取,然后在每次启动时读取。

#### 迁移过程

如果您的插件将在 Zotero 6 中以覆盖层模式工作,在 Zotero 7 中以引导模式工作,请创建 `defaults/preferences/prefs.js` 并在构建过程中添加一个步骤以将其复制到插件根目录中的 `prefs.js`。

如果您的插件对 Zotero 6 和 7 都是引导插件,请只在插件根目录中创建 `prefs.js`。然后您可以强制 Zotero 6 每次启动时都从该文件读取首选项。请参阅 Make It Red 1.2 中的 [setDefaultPrefs()](https://github.com/zotero/make-it-red/blob/32cf7816c2bab487dbf06d08fc75c722222d9f38/src-1.2/bootstrap.js#L61-L82 "https://github.com/zotero/make-it-red/blob/32cf7816c2bab487dbf06d08fc75c722222d9f38/src-1.2/bootstrap.js#L61-L82")和 [startup() 中的条件调用](https://github.com/zotero/make-it-red/blob/32cf7816c2bab487dbf06d08fc75c722222d9f38/src-1.2/bootstrap.js#L101-L104 "https://github.com/zotero/make-it-red/blob/32cf7816c2bab487dbf06d08fc75c722222d9f38/src-1.2/bootstrap.js#L101-L104")以获取示例。

### 首选项窗格

Zotero 现在包含一个内置函数来注册首选项窗格。在插件的 `startup` 函数中:

```
Zotero.PreferencePanes.register({
	pluginID: 'make-it-red@zotero.org',
	src: 'prefs.xhtml',
	scripts: ['prefs.js'],
	stylesheets: ['prefs.css'],
});
```


[支持更高级的选项。](https://github.com/zotero/zotero/blob/main/chrome/content/zotero/xpcom/preferencePanes.js "https://github.com/zotero/zotero/blob/main/chrome/content/zotero/xpcom/preferencePanes.js")

窗格的 `src` 应该指向包含 XUL/XHTML 片段的文件。片段不能有 `<!DOCTYPE`。默认命名空间是 XUL,HTML 标签在 `html:` 下可访问。一个简单的窗格可能如下所示:

```
<vbox onload="MakeItRed_Preferences.init()">
	<groupbox>
		<label><html:h2>Colors</html:h2></label>
		<!-- [...] -->
	</groupbox>
</vbox>
```


将窗格组织为一系列顶级 `<groupbox>` 将针对新的首选项搜索机制对其进行优化。默认情况下,DOM 中的所有文本都是可搜索的。如果要手动向元素添加关键字(例如,打开对话框的按钮),请将其 `data-search-strings-raw` 属性设置为逗号分隔的列表。

要使用 Fluent 进行[本地化](#localization "dev:zotero_7_for_developers ↵"),请在 XUL `<linkset>` 中包含一个或多个 HTML `<link>` 元素:

```
<linkset>
	<html:link rel="localization" href="make-it-red.ftl"/>
</linkset>
```


请注意,首选项窗格中的所有 `class`、`id` 和 `data-l10n-id` 都应该命名空间化,以避免插件之间的冲突。

#### <preference> 标签和首选项绑定

Zotero 6 首选项窗格使用 `<preference>` 标签为首选项键分配窗本地 ID 并将表单字段绑定到它们。例如,Zotero 6 窗格可能包括:

```
<preferences>
	<preference id="pref-makeItRed-color" name="extensions.zotero.makeItRed.color" type="string"/>
</preferences>
<!-- ... -->
<html:input type="text" preference="pref-makeItRed-color"/>
```


该标记将创建一个文本框,其值绑定到 `extensions.zotero.makeItRed.color`。

Zotero 7 支持以几乎相同的方式将字段绑定到首选项,但没有 `<preference>` 标签。相反,字段直接绑定到首选项键。例如:

```
<html:input type="text" preference="extensions.zotero.makeItRed.color"/>
```


Zotero 6 还支持通过 `<preference>` 标签获取和设置首选项。例如,在上面的 Zotero 6 示例中,JavaScript 代码可以通过调用 `document.getElementById('pref-makeItRed-color').value` 来获取 `extensions.zotero.makeItRed.color` 的值。这不再受支持 — 直接调用 `Zotero.Prefs.get()`。

### 自定义条目树列

Zotero 7 添加了用于在条目树中创建自定义列的 API。条目树在 Zotero 中广泛用于显示条目表(例如,主库视图中的条目列表和高级搜索窗口中的搜索结果)。

如果您以前使用猴子补丁在 Zotero 6 中添加自定义列,请在 Zotero 7 中切换到使用官方 API。

下面的示例显示如何注册带有反向条目标题的自定义列。`dataKey`、`label` 和 `pluginID` 是必需的。

```
const registeredDataKey = await Zotero.ItemTreeManager.registerColumn({
    dataKey: 'rtitle',
    label: 'Reversed Title',
    pluginID: 'make-it-red@zotero.org', // 替换为您的插件 ID
    dataProvider: (item, dataKey) => {
        return item.getField('title').split('').reverse().join('');
    },
});
```


更高级的选项在[源代码](https://github.com/zotero/zotero/blob/main/chrome/content/zotero/xpcom/pluginAPI/itemTreeManager.js "https://github.com/zotero/zotero/blob/main/chrome/content/zotero/xpcom/pluginAPI/itemTreeManager.js")中有文档记录。

当插件被禁用或卸载时,具有相应 `pluginID` 的自定义列将被自动删除。如果要手动取消注册自定义列,可以使用 `unregisterColumn()`:

```
await Zotero.ItemTreeManager.unregisterColumn(registeredDataKey);
```


如果在使用此 API 时遇到任何问题,请在[开发者邮件列表](https://groups.google.com/g/zotero-dev "https://groups.google.com/g/zotero-dev")上告知我们。

### 自定义条目窗格部分

Zotero 7 中的条目窗格经过了彻底重新设计,水平选项卡(信息、标签、注释等)被可折叠的垂直部分和用于快速访问特定部分的侧导航栏所取代。

Zotero 7 中的一个新 API 允许插件创建自定义部分。插件应该使用这个官方 API,而不是手动将内容注入条目窗格。

下面的示例显示如何注册自定义部分,显示条目详细信息(例如,`id` 和 `editable`)。`paneID`、`pluginID`、`header` 和 `sidenav` 是必需的。

```
const registeredID = Zotero.ItemPaneManager.registerSection({
	paneID: "custom-section-example",
	pluginID: "example@example.com",
	header: {
		l10nID: "example-item-pane-header",
		icon: rootURI + "icons/16/universal/book.svg",
	},
	sidenav: {
		l10nID: "example-item-pane-header",
		icon: rootURI + "icons/20/universal/book.svg",
	},
	onRender: ({ body, item, editable, tabType }) => {
		body.textContent
			= JSON.stringify({
				id: item?.id,
				editable,
				tabType,
			});
	},
});
```


更高级的选项在[源代码](https://github.com/zotero/zotero/blob/main/chrome/content/zotero/xpcom/pluginAPI/itemPaneManager.js "https://github.com/zotero/zotero/blob/main/chrome/content/zotero/xpcom/pluginAPI/itemPaneManager.js")中有文档记录。

当插件被禁用或卸载时,具有相应 `pluginID` 的自定义部分将被自动删除。如果要手动取消注册自定义列,可以使用 `unregisterSection()`:

```
Zotero.ItemPaneManager.unregisterSection(registeredID);
```


如果在使用此 API 时遇到任何问题,请在[开发者邮件列表](https://groups.google.com/g/zotero-dev "https://groups.google.com/g/zotero-dev")上告知我们。

### 自定义条目窗格信息部分行

一个新的 API 允许插件创建自定义部分。插件应该使用这个官方 API,而不是手动将内容注入条目窗格的信息部分。

下面的示例显示如何注册自定义行,显示条目的反向标题。

```
const registeredID = Zotero.ItemPaneManager.registerInfoRow({
	rowID: "custom-info-row-example",
	pluginID: "example@example.com",
	label: {
		l10nID: "general-print",
	},
	position: "afterCreators",
	multiline: false,
	nowrap: false,
	editable: true,
	onGetData({ rowID, item, tabType, editable }) {
		return item.getField("title").split("").reverse().join("");
	},
	onSetData({ rowID, item, tabType, editable, value }) {
		Zotero.debug(`Set custom info row ${rowID} of item ${item.id} to ${value}`);
	}
});
```


更高级的选项在[源代码](https://github.com/zotero/zotero/blob/main/chrome/content/zotero/xpcom/pluginAPI/itemPaneManager.js "https://github.com/zotero/zotero/blob/main/chrome/content/zotero/xpcom/pluginAPI/itemPaneManager.js")中有文档记录。

当插件被禁用或卸载时,具有相应 `pluginID` 的自定义行将被自动删除。如果要手动取消注册自定义行,可以使用 `unregisterInfoRow()`:

```
Zotero.ItemPaneManager.unregisterInfoRow(registeredID);
```


如果在使用此 API 时遇到任何问题,请在[开发者邮件列表](https://groups.google.com/g/zotero-dev "https://groups.google.com/g/zotero-dev")上告知我们。

### 自定义阅读器事件处理程序

Zotero 7 添加了用于创建自定义阅读器事件处理程序的 API。可用的事件类型有:

* `renderTextSelectionPopup`: 注入 DOM 事件,在选择弹出窗口呈现时触发
    
* `renderSidebarAnnotationHeader`: 注入 DOM 事件,在左侧边栏的注释标题行呈现时触发
    
* `renderToolbar`: 注入 DOM 事件,在阅读器的顶部工具栏呈现时触发
    

* `createColorContextMenu`: 上下文菜单事件,在顶部工具栏的颜色选择器菜单创建时触发
    
* `createViewContextMenu`: 上下文菜单事件,在查看器的右键菜单创建时触发
    
* `createAnnotationContextMenu`: 上下文菜单事件,在左侧边栏的注释右键菜单创建时触发
    
* `createThumbnailContextMenu`: 上下文菜单事件,在左侧边栏的缩略图右键菜单创建时触发
    
* `createSelectorContextMenu`: 上下文菜单事件,在左侧边栏的标签选择器右键菜单创建时触发
    

注册相应类型的事件处理程序后,您可以将 DOM 节点注入阅读器 UI 部分:

```
let type = "renderTextSelectionPopup"; // 或其他注入 DOM 事件
let handler = event => {
	let { reader, doc, params, append } = event;
	let container = doc.createElement("div");
	container.append("Loading…");
	append(container);
	setTimeout(() => container.replaceChildren("Translated text: " + params.annotation.text), 1000);
};
let pluginID = "make-it-red@zotero.org"; // 使用您的插件 ID
Zotero.Reader.registerEventListener(type, handler, pluginID);
```


或向上下文菜单添加选项:

```
let type = "createAnnotationContextMenu"; // 或其他上下文菜单事件
let handler = event => {
	let { reader, params, append } = event;
	append({
		label: "Test",
		onCommand() {
			reader._iframeWindow.alert("Selected annotations: " + params.ids.join(", "));
		},
	});
};
let pluginID = "make-it-red@zotero.org"; // 使用您的插件 ID
Zotero.Reader.registerEventListener(type, handler, pluginID);
```


当插件被禁用或卸载时,具有相应 `pluginID` 的自定义事件处理程序将被自动删除。如果要手动取消注册:

```
Zotero.Reader.unregisterEventListener(type, handler);
```


更多详细信息在[源代码](https://github.com/zotero/zotero/blob/main/chrome/content/zotero/xpcom/reader.js "https://github.com/zotero/zotero/blob/main/chrome/content/zotero/xpcom/reader.js")中。

如果在使用此 API 时遇到任何问题,请在[开发者邮件列表](https://groups.google.com/g/zotero-dev "https://groups.google.com/g/zotero-dev")上告知我们。

其他平台变更
----------------------

Mozilla 在 Firefox 60 和 Firefox 115 之间进行了许多其他影响 Zotero 代码和插件代码的更改,Zotero 7 还包括其他 API 更改。

### Mozilla 平台

以下列表包括几乎所有影响 Zotero 代码的 Mozilla 更改。如果您使用 Zotero 中未使用的 API,可能会遇到其他破坏性更改。[Searchfox](https://searchfox.org/ "https://searchfox.org/") 是识别 Mozilla 代码中的当前正确用法和 Firefox 60 与 Firefox 115 之间更改的最佳资源。

早期的 Zotero 7 beta 版本基于 Firefox 102,因此我们列出了 Firefox 102 和 115 的更改。

#### Firefox 60 → Firefox 102

* 所有 `.xul` 文件必须重命名为 `.xhtml`
    
* 某些 XUL 元素被删除;其他的被转换为可以大致相同方式使用的自定义元素
    

* `<wizard>` 现在放置在 `<window>` 中,并且有一些 API 更改([示例](https://github.com/zotero/zotero/pull/2862 "https://github.com/zotero/zotero/pull/2862"))
    
* 对于剩余的 XUL 元素,`createElement()`/`createElementNS()` → `createXULElement()`([示例](https://github.com/zotero/zotero/commit/f81b4b071f337728edc3deedda3a5534a676cab3 "https://github.com/zotero/zotero/commit/f81b4b071f337728edc3deedda3a5534a676cab3"))
    
* 顶级 `<dialog>…</dialog>` → `<window><dialog>…</dialog></window>` 和对话框按钮/事件更改([示例](https://github.com/zotero/zotero/commit/516c76a4ab0ebb176805876447c7e40a2db857ac "https://github.com/zotero/zotero/commit/516c76a4ab0ebb176805876447c7e40a2db857ac"))
    
* XBL 支持已删除 — 转换为自定义元素([示例](https://github.com/zotero/zotero/commit/db0ac723fad1c879501cfa2c3c032eb3d1677664 "https://github.com/zotero/zotero/commit/db0ac723fad1c879501cfa2c3c032eb3d1677664"))
    
* `nsIDOMParser` → `new DOMParser()`([示例](https://github.com/zotero/zotero/commit/dd2ff63019b5c9704ac43c869bd68e7ea7f610a8 "https://github.com/zotero/zotero/commit/dd2ff63019b5c9704ac43c869bd68e7ea7f610a8"))
    
* `nsIDOMSerializer` → `new XMLSerializer()`([示例](https://github.com/zotero/zotero/commit/55fe6f33f542ddab38a06dd48d6f36041a6be254 "https://github.com/zotero/zotero/commit/55fe6f33f542ddab38a06dd48d6f36041a6be254"))
    
* XUL `document.getElementsByAttribute()` → `document.querySelectorAll()`([示例](https://github.com/zotero/zotero/commit/13b9837524b5fa47c2f2c81a0be503326a3884ee "https://github.com/zotero/zotero/commit/13b9837524b5fa47c2f2c81a0be503326a3884ee"))
    
* `openPopup(anchor, position, clientX, clientY, isContextMenu)` → `openPopupAtScreen(screenX, screenY, isContextMenu)`([示例](https://github.com/zotero/zotero/commit/7c458b9bd35ab90f45c8dbb2f4988ef589da0225 "https://github.com/zotero/zotero/commit/7c458b9bd35ab90f45c8dbb2f4988ef589da0225"))
    

* 加载 HTML 内容时,`<browser>` → `<browser maychangeremoteness="true">`([示例](https://github.com/zotero/zotero/commit/f05d6fe0e0bfea59825af68e8687bbf665876d55 "https://github.com/zotero/zotero/commit/f05d6fe0e0bfea59825af68e8687bbf665876d55"))
    
* `nsIIdleService` → `nsIUserIdleService`([示例](https://github.com/zotero/zotero/commit/f91bf49aae8bb5d3790b545f8f03325befc38c85 "https://github.com/zotero/zotero/commit/f91bf49aae8bb5d3790b545f8f03325befc38c85"))
    
* `XPCOMUtils.generateQI()` → `ChromeUtils.generateQI()`([示例](https://github.com/zotero/zotero/commit/ccbc78549901400deeb6f395e1df9f34d98d14ca "https://github.com/zotero/zotero/commit/ccbc78549901400deeb6f395e1df9f34d98d14ca"))
    
* `nsIWebNavigation::loadURI()` 签名更改([示例](https://github.com/zotero/zotero/commit/1bb99a6bc8c149f550b16c6fb6357d94d5aec67d "https://github.com/zotero/zotero/commit/1bb99a6bc8c149f550b16c6fb6357d94d5aec67d"))
    
* `<textbox type="search">` → `<search-textbox>`([示例](https://github.com/zotero/zotero/commit/a54da965a7c85c42d23644f1053594c45e640783 "https://github.com/zotero/zotero/commit/a54da965a7c85c42d23644f1053594c45e640783"))
    
* XUL `textbox` → HTML `<input type="text">`([示例](https://github.com/zotero/zotero/commit/7ee40c46827b60ea04e27eb2a7c5329d8816f283 "https://github.com/zotero/zotero/commit/7ee40c46827b60ea04e27eb2a7c5329d8816f283"))
    
* XUL `<progressmeter>` → HTML `<progress>`([示例](https://github.com/zotero/zotero/commit/29b270e7618e6b166da2fbefca1617dddf387aed "https://github.com/zotero/zotero/commit/29b270e7618e6b166da2fbefca1617dddf387aed"))
    
* 在 `<groupbox>` 内,`<label>` → `<label><html:h2>`([示例](https://github.com/zotero/zotero/commit/29bc36c02a194dc447b30c2675a7d7d00f626b43 "https://github.com/zotero/zotero/commit/29bc36c02a194dc447b30c2675a7d7d00f626b43"))
    
* `XULDocument` → `XMLDocument`([示例](https://github.com/zotero/zotero/commit/fb8984c94757f7b324f697facabd1066d5018c76 "https://github.com/zotero/zotero/commit/fb8984c94757f7b324f697facabd1066d5018c76"))
    
* `Components.interfaces.nsIDOMXULElement` → `XULElement`
    
* XUL 树:删除 `tree.treeBoxObject` 和 `getCellAt()` 签名更改([示例](https://github.com/zotero/zotero/commit/b6f5d7183f9005b451117e590c2ac766415ba8d7 "https://github.com/zotero/zotero/commit/b6f5d7183f9005b451117e590c2ac766415ba8d7"))
    
* `Components.classes["@mozilla.org/network/standard-url;1"].createInstance(Components.interfaces.nsIURL)`  
    → `Services.io.newURI(url).QueryInterface(Ci.nsIURL)`([示例](https://github.com/zotero/zotero/commit/87decd0f8df4a68c63783a5ebc84211f0baf28d5 "https://github.com/zotero/zotero/commit/87decd0f8df4a68c63783a5ebc84211f0baf28d5"))
    
* `getURLSpecFromFile()` → `Zotero.File.pathToFileURI()`([示例](https://github.com/zotero/zotero/commit/8f7a160ba14d260f2e2f36d2cef2ab155d56adc1 "https://github.com/zotero/zotero/commit/8f7a160ba14d260f2e2f36d2cef2ab155d56adc1"))
    
* `initKeyEvent()` → `new KeyboardEvent()`([示例](https://github.com/zotero/zotero/commit/f827b9ef50af6fdbc9066201dd2726d50b39bdd2 "https://github.com/zotero/zotero/commit/f827b9ef50af6fdbc9066201dd2726d50b39bdd2"))
    
* 从 `onStartRequest()`/`onDataAvailable()`/`onStopRequest()`/`asyncRead()` 中删除 `context`([示例](https://github.com/zotero/zotero/commit/94c7e0674dfda4c8f1662078269972c898b5e44a "https://github.com/zotero/zotero/commit/94c7e0674dfda4c8f1662078269972c898b5e44a"))
    
* 对本机表单元素使用 `native="true"`([示例](https://github.com/zotero/zotero/commit/89587e6b76e043e74d21bbe713d97fb162215040 "https://github.com/zotero/zotero/commit/89587e6b76e043e74d21bbe713d97fb162215040"))
    
* `nsIWebNavigation.loadURI()` 签名更改([示例](https://github.com/zotero/zotero/commit/abfa09df51cc7a71e34afb77b459a2e24aa64ee4 "https://github.com/zotero/zotero/commit/abfa09df51cc7a71e34afb77b459a2e24aa64ee4"))
    
* `nsILoginManager::findLogins()` 签名更改([示例](https://github.com/zotero/zotero/commit/f4675c02dffb4f0dcaa668c77ea1318d278fd646 "https://github.com/zotero/zotero/commit/f4675c02dffb4f0dcaa668c77ea1318d278fd646"))
    
* `nsIURI.clone()` 已删除
    
* `AddonManager.getAllAddons()` 现在返回一个 promise([示例](https://github.com/zotero/zotero/commit/d635fdda41d382e34dd53cdf4dadaf5071eb38a7 "https://github.com/zotero/zotero/commit/d635fdda41d382e34dd53cdf4dadaf5071eb38a7"))
    
* 自定义协议处理程序更改([示例](https://github.com/zotero/zotero/commit/66a60eea649a680a13d64fd290b60b9c450a74c1 "https://github.com/zotero/zotero/commit/66a60eea649a680a13d64fd290b60b9c450a74c1"))
    
* `goQuitApplication()` 现在接受一个 `event` 参数([示例](https://github.com/zotero/zotero/commit/2e26703b5099c054d0043bfb85c4e37f399c8874 "https://github.com/zotero/zotero/commit/2e26703b5099c054d0043bfb85c4e37f399c8874"))
    
* `Services.console.getMessageArray()` 返回一个实际数组([示例](https://github.com/zotero/zotero/commit/004d5db2c35a83e878e20c98d0118af6755ebbd4 "https://github.com/zotero/zotero/commit/004d5db2c35a83e878e20c98d0118af6755ebbd4"))
    
* `OS.Path.join()` 静默删除 Number 参数([示例](https://github.com/zotero/zotero/commit/f57c462b8588b466f8f95ba8d1c9bc358134763a "https://github.com/zotero/zotero/commit/f57c462b8588b466f8f95ba8d1c9bc358134763a"))
    

#### Firefox 102 → Firefox 115

* `OS.File`、`OS.Path` 和 `OS.Constants.Path` 已被删除,取而代之的是 [IOUtils](https://firefox-source-docs.mozilla.org/dom/ioutils_migration.html "https://firefox-source-docs.mozilla.org/dom/ioutils_migration.html") 和 [PathUtils](https://searchfox.org/mozilla-esr115/source/dom/chrome-webidl/PathUtils.webidl "https://searchfox.org/mozilla-esr115/source/dom/chrome-webidl/PathUtils.webidl")(这些在 Firefox 102 中已经可用)。为了帮助开发人员尽快使其代码在 115 上运行,我们为大多数函数创建了[垫片](https://github.com/zotero/zotero/blob/main/chrome/content/zotero/osfile.mjs "https://github.com/zotero/zotero/blob/main/chrome/content/zotero/osfile.mjs"),您可以通过在文件中添加此行来使用它们:  
    `var { OS } = ChromeUtils.importESModule("chrome://zotero/content/osfile.mjs");`  
    您应该尽快更新代码以使用 `IOUtils` 和 `PathUtils`,而不是长期依赖这些垫片。([示例](https://github.com/zotero/zotero/commit/920461cd9de098b230c9298015e6c9563123f558 "https://github.com/zotero/zotero/commit/920461cd9de098b230c9298015e6c9563123f558"))
    
* UI 现在使用现代 flexbox 而不是 XUL 布局,因此需要将 Mozilla CSS 属性替换为标准属性(例如,`-moz-box-flex: 1` → `flex: 1`),并且存在各种布局差异([示例](https://github.com/zotero/zotero/commit/de42dce16ed155b5d180587d965f4745093353ed "https://github.com/zotero/zotero/commit/de42dce16ed155b5d180587d965f4745093353ed");[详细信息](https://groups.google.com/a/mozilla.org/g/firefox-dev/c/9sGpF1TNbLk/m/QpU3oTUuAgAJ "https://groups.google.com/a/mozilla.org/g/firefox-dev/c/9sGpF1TNbLk/m/QpU3oTUuAgAJ"))
    
* 大多数 Mozilla JSM 模块已重命名为 `.sys.mjs`,必须使用 `ChromeUtils.importESModule()` 或 `ChromeUtils.defineESModuleGetters()` 导入
    
* `nsIPromptService` → `Services.prompt`([示例](https://github.com/zotero/zotero/commit/b6a597a7f920e98b22ff369bcadea8d7dc1f09e6 "https://github.com/zotero/zotero/commit/b6a597a7f920e98b22ff369bcadea8d7dc1f09e6"))
    
* `loadURI()` 签名更改([示例](https://github.com/zotero/zotero/commit/e76c6c6a1a83df3cc9e04129d1c785c28ab57ae4 "https://github.com/zotero/zotero/commit/e76c6c6a1a83df3cc9e04129d1c785c28ab57ae4"))
    
* XUL 元素(`window`、`wizard`、`box` 等)不再识别 `width` 和 `height` 属性。可以用 CSS 规则(`min-width`、`width`、`max-width` 等)替换。([示例](https://github.com/zotero/zotero/commit/db499fdf2bd51489eaeea1f93f085816f65d5292 "https://github.com/zotero/zotero/commit/db499fdf2bd51489eaeea1f93f085816f65d5292"))
    

此外,虽然是 Zotero 特定的更改,但 Firefox 115 的 `FilePicker` 导入行已更改:  
`var { FilePicker } = ChromeUtils.importESModule('chrome://zotero/content/modules/filePicker.mjs');`

### Zotero 平台

* `DB.executeTransaction()` 不再接受生成器函数 — 使用 `async`/`await`([示例](https://github.com/zotero/zotero/commit/03242e89846fe88e1c111a302793335bcf6c682a "https://github.com/zotero/zotero/commit/03242e89846fe88e1c111a302793335bcf6c682a"))
    
* `tooltiptext` → `title` — 在现有窗口中自动工作;在新窗口中,需要 [XUL <tooltip id="html-tooltip"> 元素](https://docs.huihoo.com/mozilla/xul/elemref/ref_tooltip.html "https://docs.huihoo.com/mozilla/xul/elemref/ref_tooltip.html")和 `<window>` 上的 `tooltip="html-tooltip"` 属性([示例](https://github.com/zotero/zotero/commit/d018133e9bf691434e061c1f7f5b093cce09be09 "https://github.com/zotero/zotero/commit/d018133e9bf691434e061c1f7f5b093cce09be09"))
    
* `Zotero.Browser` → `HiddenBrowser.jsm` — 如果您当前依赖隐藏浏览器,请在开发者邮件列表上发布以进行进一步讨论([详细信息](https://github.com/zotero/zotero/commit/6a2949be8a87aebe5ddadd881e4ea22d8b5a8f60 "https://github.com/zotero/zotero/commit/6a2949be8a87aebe5ddadd881e4ea22d8b5a8f60"))
    
* `FilePicker` 的导入行已更改:  
    `var { FilePicker } = ChromeUtils.importESModule('chrome://zotero/content/modules/filePicker.mjs');`
    
* `Zotero.platform` 和 `Zotero.oscpu` 已删除;对于平台条件,使用 `Zotero.isWin/isMac/isLinux`,对于操作系统版本,使用 `Zotero.getOSVersion()`,对于架构,使用 `Zotero.arch`
    
* 在即将到来的 beta 版本中,大多数 PNG 图标将被删除或替换为其 SVG 版本。您可以在 `chrome/skin/default/zotero` 中搜索新图标。
