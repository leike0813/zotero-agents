import { ZoteroToolkit } from "zotero-plugin-toolkit";
import { config } from "../../package.json";
import { resolveAddonRuntimeEnv } from "./env";

export { createZToolkit, copyText, resolveClipboardCtor };

function resolveClipboardCtor() {
  return resolveToolkitMember<
    | (new () => {
        addText: (text: string, mime: string) => unknown;
        copy: () => unknown;
      })
    | undefined
  >("Clipboard");
}

function copyText(text: string) {
  const Clipboard = resolveClipboardCtor();
  if (Clipboard) {
    const helper = new Clipboard() as {
      addText: (
        payload: string,
        mime: string,
      ) => { copy?: () => unknown } | void;
      copy?: () => unknown;
    };
    const chained = helper.addText(text, "text/unicode");
    if (chained && typeof chained.copy === "function") {
      chained.copy();
      return;
    }
    if (typeof helper.copy === "function") {
      helper.copy();
      return;
    }
    return;
  }
  try {
    const helper = (Components as any).classes?.[
      "@mozilla.org/widget/clipboardhelper;1"
    ]?.getService(Components.interfaces.nsIClipboardHelper) as {
      copyString?: (value: string) => void;
    };
    if (helper?.copyString) {
      helper.copyString(text);
      return;
    }
  } catch {
    // ignore and throw below
  }
  throw new Error("clipboard unavailable");
}

function createZToolkit() {
  const _ztoolkit = new ZoteroToolkit();
  /**
   * Alternatively, import toolkit modules you use to minify the plugin size.
   * You can add the modules under the `MyToolkit` class below and uncomment the following line.
   */
  // const _ztoolkit = new MyToolkit();
  initZToolkit(_ztoolkit);
  return _ztoolkit;
}

function initZToolkit(_ztoolkit: ReturnType<typeof createZToolkit>) {
  const env = resolveAddonRuntimeEnv();
  _ztoolkit.basicOptions.log.prefix = `[${config.addonName}]`;
  _ztoolkit.basicOptions.log.disableConsole = env === "production";
  _ztoolkit.UI.basicOptions.ui.enableElementJSONLog = env === "development";
  _ztoolkit.UI.basicOptions.ui.enableElementDOMLog = env === "development";
  // Getting basicOptions.debug will load global modules like the debug bridge.
  // since we want to deprecate it, should avoid using it unless necessary.
  // _ztoolkit.basicOptions.debug.disableDebugBridgePassword =
  //   __env__ === "development";
  _ztoolkit.basicOptions.api.pluginID = config.addonID;
  const pluginToastIconURI = `chrome://${config.addonRef}/content/icons/favicon.png`;
  for (const type of ["default", "success", "error"]) {
    _ztoolkit.ProgressWindow.setIconURI(type, pluginToastIconURI);
  }
  _ztoolkit.ProgressWindow.setIconURI(
    "skillrunner-backend",
    `chrome://${config.addonRef}/content/icons/icon_sidebar_32.png`,
  );
}

import { BasicTool, unregister } from "zotero-plugin-toolkit";
import { UITool } from "zotero-plugin-toolkit";
import { resolveToolkitMember } from "./runtimeBridge";

class MyToolkit extends BasicTool {
  UI: UITool;

  constructor() {
    super();
    this.UI = new UITool(this);
  }

  unregisterAll() {
    unregister(this);
  }
}
