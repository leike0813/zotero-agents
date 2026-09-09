# 
	dev:zotero_7_for_developers [Zotero Documentation]

Zotero 7 for Developers
-----------------------

Zotero 7 includes a major internal upgrade of the Mozilla platform on which Zotero is based, incorporating changes from Firefox 60 through Firefox 115. This upgrade brings major performance gains, new JavaScript and HTML features, better OS compatibility and platform integration, and native support for Apple Silicon Macs.

While this upgrade required a massive rewrite of the Zotero code base and will require many plugin changes due to technical changes in the Mozilla platform, going forward we expect to keep Zotero current with Firefox Extended Support Release (ESR) versions, with comparatively fewer technical changes between versions.

**See also:** [Zotero 8 for Developers](https://www.zotero.org/support/dev/zotero_8_for_developers "dev:zotero_8_for_developers")

Feedback
--------

If you have questions about anything on this page or encounter other problems while updating your plugin, let us know on the [dev list](https://groups.google.com/g/zotero-dev "https://groups.google.com/g/zotero-dev"). Please don't post to the Zotero Forums about Zotero 7 at this time.

Dev Builds
----------

WARNING: These are test builds based on Firefox 115 intended solely for use by Zotero plugin developers and **should not be used in production**. We strongly recommend using a [separate profile and data directory](https://www.zotero.org/support/kb/multiple_profiles "https://www.zotero.org/support/kb/multiple_profiles") for development.

The `dev` channel has been paused. Use [Zotero 7 beta builds](https://www.zotero.org/support/beta_builds "beta_builds") for development.

Sample Plugin
-------------

We've created a very simple plugin, [Make It Red](https://github.com/zotero/make-it-red "https://github.com/zotero/make-it-red"), to demonstrate some of the concepts discussed in this document. It makes things red.

We'll update the plugin as we continue developing the Zotero 7 plugin framework and address issues from the dev list.

Since Zotero is based on Firefox, it's possible to use the Firefox Developer Tools to interact with the DOM, set code breakpoints, follow network requests, and more.

Zotero 7 beta builds include the Firefox 115 devtools. To start a beta build with the Browser Toolbox open, pass the `-jsdebugger` flag on the command line:

```
$ /Applications/Zotero\ Beta.app/Contents/MacOS/zotero -ZoteroDebugText -jsdebugger
```


When running Zotero from source, passing `-d` flag to the [build\_and\_run script](about:/support/dev/client_coding/building_the_desktop_app#helper_script "dev:client_coding:building_the_desktop_app") will rebuild (`-r`) with the devtools included and pass `-jsdebugger`.

Plugin Changes
--------------

**All Zotero plugins will need to be updated for Zotero 7.**

Zotero 7 plugins continue to provide full access to platform internals (XPCOM, file access, etc.), but the Mozilla platform itself no longer supports similar extensions. All Firefox extensions are now based on the much more limited WebExtensions API shared with Chrome and other browsers, which provides sandboxed APIs for common integration points.

We have no plans to make similar restrictions in Zotero. However, due to the Mozilla platform changes, some integration techniques are no longer available, and all plugins will need to change the way they register themselves in Zotero.

### install.rdf → manifest.json

The legacy install.rdf manifest must be replaced with a [WebExtension-style manifest.json file](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/manifest.json "https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/manifest.json"). Most WebExtension manifest.json keys are not relevant in Zotero, but you should transfer the main metadata from install.rdf.

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


`applications.zotero` is based on `[browser_specific_settings.gecko](https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings "https://developer.mozilla.org/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings")` and must be present for Zotero to install your plugin. You should set `strict_max_version` to `x.x.*` of the latest minor version that you have tested your plugin with. (You can later update compatibility via your update manifest without distributing a new version if no changes are required.)

Use `"strict_min_version": "6.999"` to allow your plugin to be installed on Zotero 7 betas.

#### Transition Process

Plugins can be made to work in both Zotero 6 and Zotero 7 by including both install.rdf and manifest.json files. Zotero 6 will use install.rdf, while Zotero 7 will use manifest.json.

You can load overlay code for Zotero 6 and bootstrap code (as described below) for Zotero 7, or you can create a single bootstrapped version by adding `<em:bootstrap>true</em:bootstrap>` to install.rdf for Zotero 6.

### update.rdf → updates.json

The legacy RDF update manifest for specifying updates must be replaced with a [Mozilla-style JSON update manifest](https://extensionworkshop.com/documentation/manage/updating-your-extension/ "https://extensionworkshop.com/documentation/manage/updating-your-extension/"):

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


Zotero 6 also supports this manifest format with a slight variation: you must specify minimum and maximum versions using `applications.gecko` instead of `applications.zotero`, and you must use the Firefox platform version instead of the Zotero app version. Since Zotero 6 is based on Firefox 60.9.0 ESR, you can use `60.9` for `strict_min_version` and `strict_max_version`.

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


In this example, version 1.2 is compatible with both Zotero 6 and 7, and version 2.0 is compatible only with Zotero 7:

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


#### Transition Process

Since Zotero 6 already supports the new JSON update manifest, we recommend creating a JSON manifest now and pointing new versions of your plugin at its URL in install.rdf, even before you've updated your plugin for Zotero 7. As described above, you can serve a manifest that offers a version that supports only Zotero 6 now and later add a version that supports both Zotero 6 and 7 and/or a version that supports only Zotero 7, all from the same file.

However, since you can't be sure that all of your users will upgrade to your new version that points to a JSON URL before they upgrade to Zotero 7, and since Zotero 7 will no longer be able to parse RDF update manifests, there's a risk of users getting stranded on an old version. To avoid this, you can simply make the new JSON manifest available from the old RDF URL as well. Even with the .rdf extension, Zotero will detect that it's a JSON manifest and process it properly.

### XUL Overlays → bootstrap.js

This will likely be the biggest change for most plugin developers.

Zotero 6 and earlier supported two types of plugins:

1.  Overlay plugins, which use XUL overlays to inject elements — including `<script>` elements — into the DOM of existing windows
    
2.  Bootstrapped plugins, which programmatically insert themselves into the app and modify the DOM as necessary, and which can be enabled and disabled without restarting Zotero
    

These correspond to the two types of legacy Firefox extensions up through Firefox 56.

The Mozilla platform no longer supports either type of extension — instead supporting WebExtensions (or MailExtensions in Thunderbird) — and no longer supports XUL overlays. We don't feel that restrictive WebExtension-style APIs are a good fit for the Zotero plugin ecosystem, so we've reimplemented support for bootstrapped extensions for Zotero plugins to use going forward.

Most existing Zotero plugins use overlays and will need to be rewritten to work as bootstrapped plugins.

Bootstrapped Zotero plugins in Zotero 7 require two components:

1.  A WebExtension-style manifest.json file, as described above
    
2.  A bootstrap.js file containing functions to handle various events:
    
    *   Plugin lifecycle hooks
        
    *   Window hooks
        

#### Plugin Lifecycle Hooks

Plugin lifecycle hooks are modeled after the legacy Mozilla [bootstrapped-extension framework](http://www.devdoc.net/web/developer.mozilla.org/en-US/docs/Mozilla/Add-ons/Bootstrapped_Extensions.html#Bootstrap_entry_points "http://www.devdoc.net/web/developer.mozilla.org/en-US/docs/Mozilla/Add-ons/Bootstrapped_Extensions.html#Bootstrap_entry_points"):

*   `startup()`
    
*   `shutdown()`
    
*   `install()`
    
*   `uninstall()`
    

Plugin lifecycle hooks are passed two parameters:

*   An object with these properties:
    
    *   `id`, the plugin id
        
    *   `version`, the plugin version
        
    *   `rootURI`, a string URL pointing to the plugin's files. For XPIs, this will be a `jar:file:///` URL. This value will always end in a slash, so you can append a relative path to get a URL for a file bundled with your plugin (e.g., `rootURI + 'style.css'`).
        
*   A number representing the reason for the event, which can be checked against the following constants: `APP_STARTUP`, `APP_SHUTDOWN`, `ADDON_ENABLE`, `ADDON_DISABLE`, `ADDON_INSTALL`, `ADDON_UNINSTALL`, `ADDON_UPGRADE`, `ADDON_DOWNGRADE`
    

Any initialization unrelated to specific windows should be triggered by `startup`, and removal should be triggered by `shutdown`.

Note that Zotero 6 provides a `resourceURI` nsIURI object instead of a `rootURI` string, so for Zotero 6 compatibility you'll want to assign `resourceURI.spec` to `rootURI` if `rootURI` isn't provided.

In Zotero 7, the `install()` and `startup()` bootstrap methods are called only after Zotero has initialized, and the `Zotero` object is automatically made available in the bootstrap scope, along with `Services`, `Cc`, `Ci`, and other Mozilla and browser objects. This isn't the case in Zotero 6, in which these functions can load before the `Zotero` object is available and won't automatically get `window` properties such as `URL`. (`Zotero` also isn't available in `uninstall()` in Zotero 6.) The sample plugin provides an example of [waiting for availability of the ''Zotero'' object](https://github.com/zotero/make-it-red/blob/main/src-1.2/bootstrap.js "https://github.com/zotero/make-it-red/blob/main/src-1.2/bootstrap.js") and [importing global properties](https://github.com/zotero/make-it-red/blob/main/src-1.2/make-it-red.js "https://github.com/zotero/make-it-red/blob/main/src-1.2/make-it-red.js") in a bootstrapped plugin that works in both Zotero 6 and 7.

Bootstrapped plugins can be disabled or uninstalled without restarting Zotero, so you'll need to make sure you remove all functionality in the `shutdown()` function.

#### Window Hooks

Window hooks, available only in Zotero 7, are called on the opening and closing of the main Zotero window:

*   `onMainWindowLoad()`
    
*   `onMainWindowUnload()`
    

Window hooks are passed one parameter:

*   An object with a `window` property containing the target window
    

On some platforms, the main window can be opened and closed multiple times during a Zotero session, so any window-related activities, such as modifying the main UI, adding menus, or binding shortcuts must be performed by `onMainWindowLoad` so that new main windows contain your changes.

You must then **remove all references to a window or objects within it, cancel any timers, etc.**, when `onMainWindowUnload` is called, or else you'll risk creating a memory leak every time the window is closed. DOM elements added to a window will be automatically destroyed when the window is closed, so you only need to remove those in `shutdown()`, which you can do by cycling through all windows:

```
function shutdown() {
    var windows = Zotero.getMainWindows();
    for (let win of windows) {
        win.document.getElementById('make-it-red-stylesheet')?.remove();
    }
}
```


(Currently, only one main window is supported, but some users may find ways to open multiple main windows, and this will be officially supported in a future version.)

Some plugins may require additional hooks in Zotero itself to work well as bootstrapped plugins. If you're having trouble accomplishing something you were doing previously via XUL overlays, let us know on [zotero-dev](https://groups.google.com/g/zotero-dev "https://groups.google.com/g/zotero-dev").

### chrome.manifest → runtime chrome registration

The Mozilla platform no longer supports chrome.manifest files for registration of resources.

In many cases, you may no longer need to register `chrome://` URLs, as resources can be loaded by using a relative path directly or by appending a relative path to the `rootURI` string passed to your plugin's `startup()` function. However, some functions, such as `ChromeUtils.import()` for JSMs (or, post–Firefox 102, ESMs), only accept `chrome://` content URLs. `.prop` and `.dtd` locale files also still need to be registered as chrome files. Registering `locale` folders isn't necessary if using Fluent as explained in the next section.

You can register `content` and `locale` resources in your plugin's `startup` function:

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


Deregister the files in `shutdown()` in case your plugin is disabled, remove, or upgraded:

```
chromeHandle.destruct();
chromeHandle = null;
```


### Localization

Mozilla has introduced a new localization system called [Fluent](https://projectfluent.org/ "https://projectfluent.org/"), which replaces both .dtd and .properties localization. While both .dtd and .properties are still supported in the current version of Zotero 7, Mozilla has removed .dtd files completely in Firefox 115 and is working to remove uses of .properties files. To ensure future compatibility, plugin authors should aim to use Fluent for localization going forward.

See the [Fluent Syntax Guide](https://projectfluent.org/fluent/guide/ "https://projectfluent.org/fluent/guide/") for more information on creating Fluent files.

#### Registering Fluent Files

To use Fluent in your plugin, create a `locale` folder in your plugin root with subfolders for each locale, and place .ftl files within each locale folder:

```
locale/en-US/make-it-red.ftl
locale/fr-FR/make-it-red.ftl
locale/zh-CN/make-it-red.ftl
```


Any .ftl files you place in the locale subfolders will be automatically registered in Zotero's localization system.

#### Using a Fluent File in a Document

Fluent files you include with your plugin can be applied to a document with a `<link>` element.

For example, a Fluent file located at

`[plugin root]/locale/en-US/make-it-red.ftl`

could be included in an XHTML file as

```
<link rel="localization" href="make-it-red.ftl"/>
```


If the document's default namespace is XUL, include HTML as an alternative namespace (`xmlns:html="http://www.w3.org/1999/xhtml"`) and prefix the link:

```
<html:link rel="localization" href="make-it-red.ftl"/>
```


If modifying an existing window, you can create a `<link>` element dynamically:

```
MozXULElement.insertFTLIfNeeded("make-it-red.ftl");
```


(`MozXULElement` will be a property of the window you're modifying.)

Please ensure that you have inserted the FTL into the window before making any changes to the DOM.

If adding to an existing window, be sure to remove the `<link>` in your plugin's `shutdown` function:

```
doc.querySelector('[href="make-it-red.ftl"]').remove();
```


#### Replacing .dtd Files

Fluent's primary mode is a markup-based approach that automatically inserts localized strings into the DOM, which in its simplest form is similar to DTD entity substitution.

Migrating strings will in most cases be trivial. For example, you might replace this XUL code containing a DTD entity:

```
<tab label="&make-it-red.tabs.advanced.label;"/>
```


with this code containing a Fluent identifier:

```
<tab data-l10n-id="make-it-red-tabs-advanced" />
```


You would then change the accompanying line in your .dtd file:

```
<!ENTITY make-it-red.tabs.advanced.label  "Advanced">
```


into this Fluent statement in your .ftl file:

```
make-it-red-tabs-advanced =
    .label = Advanced
```


Note that the `.label` in the DTD entity is just a convention. In the Fluent identifier, `.label` specifies the `label` attribute as the target for the string substitution.

Unlike with DTDs, you can also specify arguments for strings as JSON:

```
<tab data-l10n-id="make-it-red-intro-message" data-l10n-args='{"name": "Stephanie"}'/>
```


See the [Mozilla documentation](https://firefox-source-docs.mozilla.org/l10n/fluent/tutorial.html#markup-localization "https://firefox-source-docs.mozilla.org/l10n/fluent/tutorial.html#markup-localization") for more examples of using Fluent in markup.

#### Replacing .properties Files

Fluent's markup-based approach can also be used to set or update strings at runtime. Every DOM document contains a `document.l10n` property, which is an object of type [DOMLocalization](https://searchfox.org/mozilla-esr102/source/dom/webidl/DOMLocalization.webidl "https://searchfox.org/mozilla-esr102/source/dom/webidl/DOMLocalization.webidl"). Once you've added a `<link>` for your .ftl file to the document, you can call `document.l10n.setAttributes()` or `document.l10n.setArgs()` to dynamically set or update an element's localization:

```
document.l10n.setAttributes(element, "make-it-red-alternative-color");
```


This sets the `data-l10n-id` attribute of the element.

You can also set the id and arguments (`data-l10n-args`) at the same time:

```
document.l10n.setAttributes(element, "make-it-red-alternative-color", {
  color: 'Green'
});
```


Or you can update just the arguments:

```
document.l10n.setArgs(element, {
  color: 'Green'
});
```


For cases where you need to retrieve a string within the context of a window but not apply it to the DOM, such as to show a prompt with `confirmEx()`, you can use `document.l10n`'s [Localization](https://searchfox.org/mozilla-esr102/source/dom/webidl/Localization.webidl "https://searchfox.org/mozilla-esr102/source/dom/webidl/Localization.webidl") interface:

```
var msg = await document.l10n.formatValue('make-it-red-intro-message', { name });
alert(msg);
```


If you really need to generate a localized string completely outside the context of a window, you can create a `Localization` object once within a given scope and then call that object's `formatValue()` method (or one of the other `Localization` methods):

```
var l10n = new Localization(["make-it-red.ftl"]);
```


```
var caption = await l10n.formatValue('make-it-red-prefs-color-caption');
```


To include arguments, pass an object instead of a string:

```
var msg = await l10n.formatValue('make-it-red-welcome-message', { name: "Stephanie" });
```


Additional functions are also available for retrieving multiple values at once (`formatValues`) and for retrieving attributes when strings are shared with the markup-based approach. See the [Localization interface definition](https://searchfox.org/mozilla-esr102/source/dom/webidl/Localization.webidl "https://searchfox.org/mozilla-esr102/source/dom/webidl/Localization.webidl") for full details.

(It's also possible to use the `Localization` interface synchronously by passing `true` as the second parameter to the constructor and using synchronous methods such as `formatValueSync()`, but this performs synchronous IO and is strongly discouraged by Mozilla.)

#### Avoiding Localization Conflicts

**Fluent identifiers within a given DOM document share a global namespace.** If adding a Fluent file to a shared document — the main Zotero window, the Zotero preferences, etc. — you must prefix all identifiers in the file with your plugin's name (e.g., `make-it-red-prefs-shade-of-red`). A prefix isn't necessary if a Fluent file is only added to your own document.

**Fluent filenames also share a global namespace.** If you don't name your .ftl files after your plugin, you must place them within a subfolder of each locale folder to avoid conflicts:

```
locale/en-US/make-it-red/main.ftl
locale/en-US/make-it-red/preferences.ftl
locale/fr-FR/make-it-red/main.ftl
locale/fr-FR/make-it-red/preferences.ftl
locale/zh-CN/make-it-red/main.ftl
locale/zh-CN/make-it-red/preferences.ftl
```


If using a subfolder, include the subfolder when referencing the file (e.g., `href="make-it-red/preferences.ftl"`).

For most plugins, a single file named after the plugin is likely a better approach.

### Default Preferences

In Zotero 6, default preferences could be set by creating .js files in your plugin's `defaults/preferences/` folder:

```
pref("extensions.make-it-red.intensity", 100);
```


These default preferences are loaded automatically at startup. While this works fine for overlay plugins, which require a restart, bootstrapped plugins can be installed or enabled at any time, and their default preferences are not read until Zotero is restarted.

**In Zotero 7, default preferences should be placed in a `prefs.js` file in the plugin root**, following the same format as above. These preferences will be read when plugins are installed or enabled and then on every startup.

#### Transition Process

If your plugin will work in overlay mode in Zotero 6 and bootstrap mode in Zotero 7, create `defaults/preferences/prefs.js` and add a step to your build process to copy it to `prefs.js` in the plugin root.

If your plugin is a bootstrapped plugin for both Zotero 6 and 7, create only `prefs.js` in your plugin root. You can then force Zotero 6 to read preferences from that file every time it starts up. See [setDefaultPrefs()](https://github.com/zotero/make-it-red/blob/32cf7816c2bab487dbf06d08fc75c722222d9f38/src-1.2/bootstrap.js#L61-L82 "https://github.com/zotero/make-it-red/blob/32cf7816c2bab487dbf06d08fc75c722222d9f38/src-1.2/bootstrap.js#L61-L82") and the [conditional call in startup()](https://github.com/zotero/make-it-red/blob/32cf7816c2bab487dbf06d08fc75c722222d9f38/src-1.2/bootstrap.js#L101-L104 "https://github.com/zotero/make-it-red/blob/32cf7816c2bab487dbf06d08fc75c722222d9f38/src-1.2/bootstrap.js#L101-L104") from Make It Red 1.2 for an example.

### Preference Panes

Zotero now includes a built-in function to register a preference pane. In your plugin's `startup` function:

```
Zotero.PreferencePanes.register({
	pluginID: 'make-it-red@zotero.org',
	src: 'prefs.xhtml',
	scripts: ['prefs.js'],
	stylesheets: ['prefs.css'],
});
```


[More advanced options are supported.](https://github.com/zotero/zotero/blob/main/chrome/content/zotero/xpcom/preferencePanes.js "https://github.com/zotero/zotero/blob/main/chrome/content/zotero/xpcom/preferencePanes.js")

The pane's `src` should point to a file containing a XUL/XHTML fragment. Fragments cannot have a `<!DOCTYPE`. The default namespace is XUL, and HTML tags are accessible under `html:`. A simple pane could look like:

```
<vbox onload="MakeItRed_Preferences.init()">
	<groupbox>
		<label><html:h2>Colors</html:h2></label>
		<!-- [...] -->
	</groupbox>
</vbox>
```


Organizing your pane as a sequence of top-level `<groupbox>`es ' will optimize it for the new preferences search mechanism. By default, all text in the DOM is searchable. If you want to manually add keywords to an element (for example, a button that opens a dialog), set its `data-search-strings-raw` property to a comma-separated list.

To use Fluent for [localization](#localization "dev:zotero_7_for_developers ↵"), include one or more HTML `<link>` elements within a XUL `<linkset>`:

```
<linkset>
	<html:link rel="localization" href="make-it-red.ftl"/>
</linkset>
```


Note that all `class`, `id`, and `data-l10n-id` in the preference pane should be namespaced to avoid conflicting between plugins.

#### <preference> Tags and Preference Binding

Zotero 6 preference panes use `<preference>` tags to assign pane-local IDs to preference keys and bind form fields to them. For example, a Zotero 6 pane might have included:

```
<preferences>
	<preference id="pref-makeItRed-color" name="extensions.zotero.makeItRed.color" type="string"/>
</preferences>
<!-- ... -->
<html:input type="text" preference="pref-makeItRed-color"/>
```


That markup would create a textbox whose value is bound to `extensions.zotero.makeItRed.color`.

Zotero 7 supports binding fields to preferences in almost the same way, without the `<preference>` tag. Instead, the field is bound directly to the preference key. For example:

```
<html:input type="text" preference="extensions.zotero.makeItRed.color"/>
```


Zotero 6 also supported getting and setting preferences through `<preferences>` tags. For example, in the Zotero 6 example above, JavaScript code could get the value of `extensions.zotero.makeItRed.color` by calling `document.getElementById('pref-makeItRed-color').value`. This is no longer supported — call `Zotero.Prefs.get()` directly.

### Custom Item Tree Columns

Zotero 7 adds an API for creating custom columns in the item tree. The item tree is widely used in Zotero for displaying a table of items (e.g., the items list in the main library view and the search results in the Advanced Search window).

If you were previously using monkey-patching to add custom columns in Zotero 6, please switch to using the official API in Zotero 7.

The example below shows how to register a custom column with the item title reversed. `dataKey`, `label`, and `pluginID` are required.

```
const registeredDataKey = await Zotero.ItemTreeManager.registerColumn({
    dataKey: 'rtitle',
    label: 'Reversed Title',
    pluginID: 'make-it-red@zotero.org', // Replace with your plugin ID
    dataProvider: (item, dataKey) => {
        return item.getField('title').split('').reverse().join('');
    },
});
```


More advanced options are documented in the [source code](https://github.com/zotero/zotero/blob/main/chrome/content/zotero/xpcom/pluginAPI/itemTreeManager.js "https://github.com/zotero/zotero/blob/main/chrome/content/zotero/xpcom/pluginAPI/itemTreeManager.js").

When the plugin is disabled or uninstalled, custom columns with the corresponding `pluginID` will be automatically removed. If you want to unregister a custom column manually, you can use `unregisterColumn()`:

```
await Zotero.ItemTreeManager.unregisterColumn(registeredDataKey);
```


If you encounter any problem with this API, please let us know on the [dev list](https://groups.google.com/g/zotero-dev "https://groups.google.com/g/zotero-dev").

### Custom Item Pane Sections

The item pane in Zotero 7 has undergone a complete redesign, with the horizontal tabs (Info, Tags, Notes, etc.) replaced by collapsible vertical sections and a side navigation bar for quick access to specific sections.

A new API in Zotero 7 allows plugins to create custom sections. Plugins should use this official API rather than manually injecting content into the item pane.

The example below shows how to register a custom section with the item details (e.g., `id` and `editable`) displayed. `paneID`, `pluginID`, `header`, and `sidenav` are required.

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


More advanced options are documented in the [source code](https://github.com/zotero/zotero/blob/main/chrome/content/zotero/xpcom/pluginAPI/itemPaneManager.js "https://github.com/zotero/zotero/blob/main/chrome/content/zotero/xpcom/pluginAPI/itemPaneManager.js").

When the plugin is disabled or uninstalled, custom sections with the corresponding `pluginID` will be automatically removed. If you want to unregister a custom column manually, you can use `unregisterSection()`:

```
Zotero.ItemPaneManager.unregisterSection(registeredID);
```


If you encounter any problem with this API, please let us know on the [dev list](https://groups.google.com/g/zotero-dev "https://groups.google.com/g/zotero-dev").

### Custom Item Pane Info Section Rows

A new API allows plugins to create custom sections. Plugins should use this official API rather than manually injecting content into the item pane's info section.

The example below shows registering a custom row, which displays the reversed title of the item.

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


More advanced options are documented in the [source code](https://github.com/zotero/zotero/blob/main/chrome/content/zotero/xpcom/pluginAPI/itemPaneManager.js "https://github.com/zotero/zotero/blob/main/chrome/content/zotero/xpcom/pluginAPI/itemPaneManager.js").

When the plugin is disabled or uninstalled, custom rows with the corresponding `pluginID` will be automatically removed. If you want to unregister a custom row manually, you can use `unregisterInfoRow()`:

```
Zotero.ItemPaneManager.unregisterInfoRow(registeredID);
```


If you encounter any problem with this API, please let us know on the [dev list](https://groups.google.com/g/zotero-dev "https://groups.google.com/g/zotero-dev").

### Custom Reader Event Handlers

Zotero 7 adds an API for creating custom reader event handlers. Available event types are:

*   `renderTextSelectionPopup`: inject DOM event, triggered when the selection popup is rendered
    
*   `renderSidebarAnnotationHeader`: inject DOM event, triggered when the left sidebar's annotation header line is rendered
    
*   `renderToolbar`: inject DOM event, triggered when the reader's top toolbar is rendered
    

*   `createColorContextMenu`: context menu event, triggered when the top toolbar's color picker menu is created
    
*   `createViewContextMenu`: context menu event, triggered when the viewer's right-click menu is created
    
*   `createAnnotationContextMenu`: context menu event, triggered when the left sidebar's annotation right-click menu is created
    
*   `createThumbnailContextMenu`: context menu event, triggered when the left sidebar's thumbnail right-click menu is created
    
*   `createSelectorContextMenu`: context menu event, triggered when the left sidebar's tag selector right-click menu is created
    

With the corresponding type of event handler registered, you can inject DOM nodes to reader UI parts:

```
let type = "renderTextSelectionPopup"; // Or other inject DOM event
let handler = event => {
	let { reader, doc, params, append } = event;
	let container = doc.createElement("div");
	container.append("Loading…");
	append(container);
	setTimeout(() => container.replaceChildren("Translated text: " + params.annotation.text), 1000);
};
let pluginID = "make-it-red@zotero.org"; // Use your plugin ID
Zotero.Reader.registerEventListener(type, handler, pluginID);
```


or add options to context menus:

```
let type = "createAnnotationContextMenu"; // Or other context menu event
let handler = event => {
	let { reader, params, append } = event;
	append({
		label: "Test",
		onCommand() {
			reader._iframeWindow.alert("Selected annotations: " + params.ids.join(", "));
		},
	});
};
let pluginID = "make-it-red@zotero.org"; // Use your plugin ID
Zotero.Reader.registerEventListener(type, handler, pluginID);
```


When the plugin is disabled or uninstalled, custom event handlers with the corresponding `pluginID` will be automatically removed. If you want to unregister manually:

```
Zotero.Reader.unregisterEventListener(type, handler);
```


More details are in the [source code](https://github.com/zotero/zotero/blob/main/chrome/content/zotero/xpcom/reader.js "https://github.com/zotero/zotero/blob/main/chrome/content/zotero/xpcom/reader.js").

If you encounter any problem with this API, please let us know on the [dev list](https://groups.google.com/g/zotero-dev "https://groups.google.com/g/zotero-dev").

Other Platform Changes
----------------------

Mozilla made many other changes between Firefox 60 and Firefox 115 that affect both Zotero code and plugin code, and Zotero 7 includes other API changes as well.

### Mozilla Platform

The following list includes nearly all Mozilla changes that affected Zotero code. You may encounter other breaking changes if you use APIs not used in Zotero. [Searchfox](https://searchfox.org/ "https://searchfox.org/") is the best resource for identifying current correct usage in Mozilla code and changes between Firefox 60 and Firefox 115.

Earlier Zotero 7 beta releases were based on Firefox 102, so we've listed changes for Firefox 102 and 115.

#### Firefox 60 → Firefox 102

*   All `.xul` files must be renamed to `.xhtml`
    
*   Some XUL elements were removed; others were converted to Custom Elements that can be used more or less the same way
    

*   `<wizard>` is now placed within a `<window>` and has some API changes ([example](https://github.com/zotero/zotero/pull/2862 "https://github.com/zotero/zotero/pull/2862"))
    
*   `createElement()`/`createElementNS()` → `createXULElement()` for remaining XUL elements ([example](https://github.com/zotero/zotero/commit/f81b4b071f337728edc3deedda3a5534a676cab3 "https://github.com/zotero/zotero/commit/f81b4b071f337728edc3deedda3a5534a676cab3"))
    
*   Top-level `<dialog>…</dialog>` → `<window><dialog>…</dialog></window>` and dialog button/event changes ([example](https://github.com/zotero/zotero/commit/516c76a4ab0ebb176805876447c7e40a2db857ac "https://github.com/zotero/zotero/commit/516c76a4ab0ebb176805876447c7e40a2db857ac"))
    
*   XBL support removed — convert to Custom Elements ([example](https://github.com/zotero/zotero/commit/db0ac723fad1c879501cfa2c3c032eb3d1677664 "https://github.com/zotero/zotero/commit/db0ac723fad1c879501cfa2c3c032eb3d1677664"))
    
*   `nsIDOMParser` → `new DOMParser()` ([example](https://github.com/zotero/zotero/commit/dd2ff63019b5c9704ac43c869bd68e7ea7f610a8 "https://github.com/zotero/zotero/commit/dd2ff63019b5c9704ac43c869bd68e7ea7f610a8"))
    
*   `nsIDOMSerializer` → `new XMLSerializer()` ([example](https://github.com/zotero/zotero/commit/55fe6f33f542ddab38a06dd48d6f36041a6be254 "https://github.com/zotero/zotero/commit/55fe6f33f542ddab38a06dd48d6f36041a6be254"))
    
*   XUL `document.getElementsByAttribute()` → `document.querySelectorAll()` ([example](https://github.com/zotero/zotero/commit/13b9837524b5fa47c2f2c81a0be503326a3884ee "https://github.com/zotero/zotero/commit/13b9837524b5fa47c2f2c81a0be503326a3884ee"))
    
*   `openPopup(anchor, position, clientX, clientY, isContextMenu)` → `openPopupAtScreen(screenX, screenY, isContextMenu)` ([example](https://github.com/zotero/zotero/commit/7c458b9bd35ab90f45c8dbb2f4988ef589da0225 "https://github.com/zotero/zotero/commit/7c458b9bd35ab90f45c8dbb2f4988ef589da0225"))
    

*   `<browser>` → `<browser maychangeremoteness="true">` when loading HTML content ([example](https://github.com/zotero/zotero/commit/f05d6fe0e0bfea59825af68e8687bbf665876d55 "https://github.com/zotero/zotero/commit/f05d6fe0e0bfea59825af68e8687bbf665876d55"))
    
*   `nsIIdleService` → `nsIUserIdleService` ([example](https://github.com/zotero/zotero/commit/f91bf49aae8bb5d3790b545f8f03325befc38c85 "https://github.com/zotero/zotero/commit/f91bf49aae8bb5d3790b545f8f03325befc38c85"))
    
*   `XPCOMUtils.generateQI()` → `ChromeUtils.generateQI()` ([example](https://github.com/zotero/zotero/commit/ccbc78549901400deeb6f395e1df9f34d98d14ca "https://github.com/zotero/zotero/commit/ccbc78549901400deeb6f395e1df9f34d98d14ca"))
    
*   `nsIWebNavigation::loadURI()` signature change ([example](https://github.com/zotero/zotero/commit/1bb99a6bc8c149f550b16c6fb6357d94d5aec67d "https://github.com/zotero/zotero/commit/1bb99a6bc8c149f550b16c6fb6357d94d5aec67d"))
    
*   `<textbox type="search">` → `<search-textbox>` ([example](https://github.com/zotero/zotero/commit/a54da965a7c85c42d23644f1053594c45e640783 "https://github.com/zotero/zotero/commit/a54da965a7c85c42d23644f1053594c45e640783"))
    
*   XUL `textbox` → HTML `<input type="text">` ([example](https://github.com/zotero/zotero/commit/7ee40c46827b60ea04e27eb2a7c5329d8816f283 "https://github.com/zotero/zotero/commit/7ee40c46827b60ea04e27eb2a7c5329d8816f283"))
    
*   XUL `<progressmeter>` → HTML `<progress>` ([example](https://github.com/zotero/zotero/commit/29b270e7618e6b166da2fbefca1617dddf387aed "https://github.com/zotero/zotero/commit/29b270e7618e6b166da2fbefca1617dddf387aed"))
    
*   `<label>` → `<label><html:h2>` within `<groupbox>` ([example](https://github.com/zotero/zotero/commit/29bc36c02a194dc447b30c2675a7d7d00f626b43 "https://github.com/zotero/zotero/commit/29bc36c02a194dc447b30c2675a7d7d00f626b43"))
    
*   `XULDocument` → `XMLDocument` ([example](https://github.com/zotero/zotero/commit/fb8984c94757f7b324f697facabd1066d5018c76 "https://github.com/zotero/zotero/commit/fb8984c94757f7b324f697facabd1066d5018c76"))
    
*   `Components.interfaces.nsIDOMXULElement` → `XULElement`
    
*   XUL tree: `tree.treeBoxObject` removal and `getCellAt()` signature change ([example](https://github.com/zotero/zotero/commit/b6f5d7183f9005b451117e590c2ac766415ba8d7 "https://github.com/zotero/zotero/commit/b6f5d7183f9005b451117e590c2ac766415ba8d7"))
    
*   `Components.classes["@mozilla.org/network/standard-url;1"].createInstance(Components.interfaces.nsIURL)`  
    → `Services.io.newURI(url).QueryInterface(Ci.nsIURL)` ([example](https://github.com/zotero/zotero/commit/87decd0f8df4a68c63783a5ebc84211f0baf28d5 "https://github.com/zotero/zotero/commit/87decd0f8df4a68c63783a5ebc84211f0baf28d5"))
    
*   `getURLSpecFromFile()` → `Zotero.File.pathToFileURI()` ([example](https://github.com/zotero/zotero/commit/8f7a160ba14d260f2e2f36d2cef2ab155d56adc1 "https://github.com/zotero/zotero/commit/8f7a160ba14d260f2e2f36d2cef2ab155d56adc1"))
    
*   `initKeyEvent()` → `new KeyboardEvent()` ([example](https://github.com/zotero/zotero/commit/f827b9ef50af6fdbc9066201dd2726d50b39bdd2 "https://github.com/zotero/zotero/commit/f827b9ef50af6fdbc9066201dd2726d50b39bdd2"))
    
*   `context` removed from `onStartRequest()`/`onDataAvailable()`/`onStopRequest()`/`asyncRead()` ([example](https://github.com/zotero/zotero/commit/94c7e0674dfda4c8f1662078269972c898b5e44a "https://github.com/zotero/zotero/commit/94c7e0674dfda4c8f1662078269972c898b5e44a"))
    
*   Use `native="true"` for native form elements ([example](https://github.com/zotero/zotero/commit/89587e6b76e043e74d21bbe713d97fb162215040 "https://github.com/zotero/zotero/commit/89587e6b76e043e74d21bbe713d97fb162215040"))
    
*   `nsIWebNavigation.loadURI()` signature change ([example](https://github.com/zotero/zotero/commit/abfa09df51cc7a71e34afb77b459a2e24aa64ee4 "https://github.com/zotero/zotero/commit/abfa09df51cc7a71e34afb77b459a2e24aa64ee4"))
    
*   `nsILoginManager::findLogins()` signature change ([example](https://github.com/zotero/zotero/commit/f4675c02dffb4f0dcaa668c77ea1318d278fd646 "https://github.com/zotero/zotero/commit/f4675c02dffb4f0dcaa668c77ea1318d278fd646"))
    
*   `nsIURI.clone()` was removed
    
*   `AddonManager.getAllAddons()` now returns a promise ([example](https://github.com/zotero/zotero/commit/d635fdda41d382e34dd53cdf4dadaf5071eb38a7 "https://github.com/zotero/zotero/commit/d635fdda41d382e34dd53cdf4dadaf5071eb38a7"))
    
*   Custom protocol handler changes ([example](https://github.com/zotero/zotero/commit/66a60eea649a680a13d64fd290b60b9c450a74c1 "https://github.com/zotero/zotero/commit/66a60eea649a680a13d64fd290b60b9c450a74c1"))
    
*   `goQuitApplication()` now takes an `event` argument ([example](https://github.com/zotero/zotero/commit/2e26703b5099c054d0043bfb85c4e37f399c8874 "https://github.com/zotero/zotero/commit/2e26703b5099c054d0043bfb85c4e37f399c8874"))
    
*   `Services.console.getMessageArray()` returns an actual array ([example](https://github.com/zotero/zotero/commit/004d5db2c35a83e878e20c98d0118af6755ebbd4 "https://github.com/zotero/zotero/commit/004d5db2c35a83e878e20c98d0118af6755ebbd4"))
    
*   `OS.Path.join()` silently drops Number arguments ([example](https://github.com/zotero/zotero/commit/f57c462b8588b466f8f95ba8d1c9bc358134763a "https://github.com/zotero/zotero/commit/f57c462b8588b466f8f95ba8d1c9bc358134763a"))
    

#### Firefox 102 → Firefox 115

*   `OS.File`, `OS.Path`, and `OS.Constants.Path` have been removed in favor of [IOUtils](https://firefox-source-docs.mozilla.org/dom/ioutils_migration.html "https://firefox-source-docs.mozilla.org/dom/ioutils_migration.html") and [PathUtils](https://searchfox.org/mozilla-esr115/source/dom/chrome-webidl/PathUtils.webidl "https://searchfox.org/mozilla-esr115/source/dom/chrome-webidl/PathUtils.webidl") (which were already available in Firefox 102). To help developers get their code running on 115 as quickly as possible, we've created [shims](https://github.com/zotero/zotero/blob/main/chrome/content/zotero/osfile.mjs "https://github.com/zotero/zotero/blob/main/chrome/content/zotero/osfile.mjs") for most functions, which you can use by adding this line to your files:  
    `var { OS } = ChromeUtils.importESModule("chrome://zotero/content/osfile.mjs");`  
    You should update your code to use `IOUtils` and `PathUtils` as soon as possible rather than relying on these shims long-term. ([examples](https://github.com/zotero/zotero/commit/920461cd9de098b230c9298015e6c9563123f558 "https://github.com/zotero/zotero/commit/920461cd9de098b230c9298015e6c9563123f558"))
    
*   UI now uses modern flexbox instead of XUL layout, so Mozilla CSS properties need to be replaced with standard properties (e.g., `-moz-box-flex: 1` → `flex: 1`) and there are various layout differences ([example](https://github.com/zotero/zotero/commit/de42dce16ed155b5d180587d965f4745093353ed "https://github.com/zotero/zotero/commit/de42dce16ed155b5d180587d965f4745093353ed"); [details](https://groups.google.com/a/mozilla.org/g/firefox-dev/c/9sGpF1TNbLk/m/QpU3oTUuAgAJ "https://groups.google.com/a/mozilla.org/g/firefox-dev/c/9sGpF1TNbLk/m/QpU3oTUuAgAJ"))
    
*   Most Mozilla JSM modules have been renamed to `.sys.mjs` and must be imported with `ChromeUtils.importESModule()` or `ChromeUtils.defineESModuleGetters()`
    
*   `nsIPromptService` → `Services.prompt` ([example](https://github.com/zotero/zotero/commit/b6a597a7f920e98b22ff369bcadea8d7dc1f09e6 "https://github.com/zotero/zotero/commit/b6a597a7f920e98b22ff369bcadea8d7dc1f09e6"))
    
*   `loadURI()` signature change ([example](https://github.com/zotero/zotero/commit/e76c6c6a1a83df3cc9e04129d1c785c28ab57ae4 "https://github.com/zotero/zotero/commit/e76c6c6a1a83df3cc9e04129d1c785c28ab57ae4"))
    
*   `width` and `height` attributes are no longer recognized on XUL elements (`window`, `wizard`, `box`, etc.). Can be replaced with CSS rules (`min-width`, `width`, `max-width`, etc.). ([example](https://github.com/zotero/zotero/commit/db499fdf2bd51489eaeea1f93f085816f65d5292 "https://github.com/zotero/zotero/commit/db499fdf2bd51489eaeea1f93f085816f65d5292"))
    

Additionally, while a Zotero-specific change, the import line for `FilePicker` has changed for Firefox 115:  
`var { FilePicker } = ChromeUtils.importESModule('chrome://zotero/content/modules/filePicker.mjs');`

### Zotero Platform

*   `DB.executeTransaction()` no longer takes generator functions — use `async`/`await` ([example](https://github.com/zotero/zotero/commit/03242e89846fe88e1c111a302793335bcf6c682a "https://github.com/zotero/zotero/commit/03242e89846fe88e1c111a302793335bcf6c682a"))
    
*   `tooltiptext` → `title` — works automatically in existing windows; in new windows, requires a [XUL <tooltip id="html-tooltip"> element](https://docs.huihoo.com/mozilla/xul/elemref/ref_tooltip.html "https://docs.huihoo.com/mozilla/xul/elemref/ref_tooltip.html") and a `tooltip="html-tooltip"` attribute on the `<window>` ([example](https://github.com/zotero/zotero/commit/d018133e9bf691434e061c1f7f5b093cce09be09 "https://github.com/zotero/zotero/commit/d018133e9bf691434e061c1f7f5b093cce09be09"))
    
*   `Zotero.Browser` → `HiddenBrowser.jsm` — post on dev list for further discussion if you're currently relying on a hidden browser ([details](https://github.com/zotero/zotero/commit/6a2949be8a87aebe5ddadd881e4ea22d8b5a8f60 "https://github.com/zotero/zotero/commit/6a2949be8a87aebe5ddadd881e4ea22d8b5a8f60"))
    
*   The import line for `FilePicker` has changed:  
    `var { FilePicker } = ChromeUtils.importESModule('chrome://zotero/content/modules/filePicker.mjs');`
    
*   `Zotero.platform` and `Zotero.oscpu` have been removed; use `Zotero.isWin/isMac/isLinux` for platform conditionals, `Zotero.getOSVersion()` for the OS version, and `Zotero.arch` for the architecture
    
*   In an upcoming beta, most PNG icons will be removed or replaced by their SVG versions. You can search for the new icons in `chrome/skin/default/zotero`.