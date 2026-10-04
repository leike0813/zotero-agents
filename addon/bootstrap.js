/**
 * Most of this code is from Zotero team's official Make It Red example[1]
 * or the Zotero 7 documentation[2].
 * [1] https://github.com/zotero/make-it-red
 * [2] https://www.zotero.org/support/dev/zotero_7_for_developers
 */

var chromeHandle;

function install(data, reason) {}

function resolveAddonRootPath(rootURI) {
  try {
    var uri = Services.io.newURI(rootURI);
    var fileURI = uri.QueryInterface(Components.interfaces.nsIFileURL);
    return fileURI.file.path;
  } catch (e) {
    try {
      if (typeof rootURI === "string" && rootURI.indexOf("file://") === 0) {
        var path = decodeURIComponent(rootURI.replace(/^file:\/+/, ""));
        if (/^[A-Za-z]:/.test(path)) {
          return path.replace(/\//g, "\\").replace(/\\$/, "");
        }
        return "/" + path.replace(/\/$/, "");
      }
    } catch (ignored) {
      // ignore
    }
  }
  return "";
}

async function startup({ id, version, resourceURI, rootURI }, reason) {
  var aomStartup = Components.classes[
    "@mozilla.org/addons/addon-manager-startup;1"
  ].getService(Components.interfaces.amIAddonManagerStartup);
  var manifestURI = Services.io.newURI(rootURI + "manifest.json");
  chromeHandle = aomStartup.registerChrome(manifestURI, [
    ["content", "__addonRef__", rootURI + "content/"],
  ]);

  /**
   * Global variables for plugin code.
   * The `_globalThis` is the global root variable of the plugin sandbox environment
   * and all child variables assigned to it is globally accessible.
   * See `src/index.ts` for details.
   */
  const ctx = {
    rootURI,
    resourceURI: resourceURI?.spec,
    rootPath: resolveAddonRootPath(rootURI),
  };
  const { ConsoleAPI } = ChromeUtils.importESModule(
    "resource://gre/modules/Console.sys.mjs",
  );
  // SDK diagnostics can contain provider responses; keep this console silent.
  ctx.console = new ConsoleAPI({ maxLogLevel: "off" });
  // Provider streams and tool validation use native Gecko Web APIs in the
  // plugin scope, independently of the lifetime of any UI window.
  const web = Components.utils.Sandbox(
    Services.scriptSecurityManager.getSystemPrincipal(),
    {
      wantGlobalProperties: [
        "fetch",
        "AbortController",
        "FormData",
        "ReadableStream",
        "TextEncoder",
        "TextDecoder",
        "structuredClone",
      ],
    },
  );
  for (const name of [
    "AbortController",
    "Headers",
    "Request",
    "Response",
    "FormData",
    "ReadableStream",
    "TextEncoder",
    "TextDecoder",
    "structuredClone",
  ]) {
    ctx[name] = web[name];
  }
  // Gecko exposes AbortSignal through its native controller rather than as a
  // wantGlobalProperties entry. Keep both constructors in this owned sandbox.
  ctx.AbortSignal = new web.AbortController().signal.constructor;
  ctx.fetch = web.fetch;
  // Native clones belong to the Web API sandbox; tools consume plugin objects.
  ctx.structuredClone = (value, options) =>
    Components.utils.cloneInto(web.structuredClone(value, options), ctx);
  ctx._globalThis = ctx;

  Services.scriptloader.loadSubScript(
    `${rootURI}/content/scripts/__addonRef__.js`,
    ctx,
  );
  await Zotero.__addonInstance__.hooks.onStartup();
}

async function onMainWindowLoad({ window }, reason) {
  await Zotero.__addonInstance__?.hooks.onMainWindowLoad(window);
}

async function onMainWindowUnload({ window }, reason) {
  await Zotero.__addonInstance__?.hooks.onMainWindowUnload(window);
}

async function shutdown({ id, version, resourceURI, rootURI }, reason) {
  await Zotero.__addonInstance__?.hooks.onShutdown();

  if (reason === APP_SHUTDOWN) {
    return;
  }

  if (chromeHandle) {
    chromeHandle.destruct();
    chromeHandle = null;
  }
}

async function uninstall(data, reason) {}
