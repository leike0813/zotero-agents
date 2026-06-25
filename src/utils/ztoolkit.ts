import { ZoteroToolkit } from "zotero-plugin-toolkit";
import { config } from "../../package.json";
import { isDiagnosticVerboseEnabled } from "../modules/diagnosticVerbosity";
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
  const _ztoolkit = createToolkitWithQuietPatchLogs();
  /**
   * Alternatively, import toolkit modules you use to minify the plugin size.
   * You can add the modules under the `MyToolkit` class below and uncomment the following line.
   */
  // const _ztoolkit = new MyToolkit();
  initZToolkit(_ztoolkit);
  return _ztoolkit;
}

function createToolkitWithQuietPatchLogs() {
  if (isDiagnosticVerboseEnabled()) {
    return new ZoteroToolkit();
  }
  return withQuietToolkitPatchConsole(() => new ZoteroToolkit());
}

function withQuietToolkitPatchConsole<T>(factory: () => T) {
  const runtimeConsole = globalThis.console as
    | (Console & {
        group?: (...data: unknown[]) => void;
        groupCollapsed?: (...data: unknown[]) => void;
        groupEnd?: () => void;
        trace?: (...data: unknown[]) => void;
      })
    | undefined;
  if (!runtimeConsole) {
    return factory();
  }
  const previous = {
    group: runtimeConsole.group,
    groupCollapsed: runtimeConsole.groupCollapsed,
    groupEnd: runtimeConsole.groupEnd,
    trace: runtimeConsole.trace,
  };
  const noop = () => undefined;
  runtimeConsole.group = noop;
  runtimeConsole.groupCollapsed = noop;
  runtimeConsole.groupEnd = noop;
  runtimeConsole.trace = noop;
  try {
    return factory();
  } finally {
    runtimeConsole.group = previous.group;
    runtimeConsole.groupCollapsed = previous.groupCollapsed;
    runtimeConsole.groupEnd = previous.groupEnd;
    runtimeConsole.trace = previous.trace;
  }
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
