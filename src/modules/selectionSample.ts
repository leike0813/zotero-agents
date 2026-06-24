import Ajv, { type ErrorObject, type ValidateFunction } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { config } from "../../package.json";
import selectionContextSchema from "../schemas/selectionContextSchema";
import {
  buildSelectionContext,
  type SelectionContext,
} from "./selectionContext";
import { getString } from "../utils/locale";
import { getPref } from "../utils/prefs";
import {
  resolveRuntimeAlert,
  resolveRuntimeToolkit,
} from "../utils/runtimeBridge";
import { isDebugModeEnabled } from "./debugMode";

const ajvLogger = {
  log: () => {},
  warn: () => {},
  error: () => {},
};
let validateSelectionSchema: ValidateFunction<SelectionContext> | null = null;

type RuntimeToolkit = {
  Menu?: {
    register: (
      scope: string,
      options: {
        tag: string;
        id: string;
        label: string;
        commandListener: () => void;
      },
    ) => unknown;
  };
  ProgressWindow?: new (title: string) => {
    createLine: (options: {
      text: string;
      type?: string;
      progress?: number;
    }) => {
      show: () => unknown;
    };
  };
  getGlobal?: (name: string) => unknown;
};

function getRuntimeToolkit(): RuntimeToolkit | null {
  return (resolveRuntimeToolkit() as RuntimeToolkit | undefined) || null;
}

function showProgress(
  text: string,
  type: "success" | "default",
  progress = 100,
) {
  const ProgressWindow = getRuntimeToolkit()?.ProgressWindow;
  if (!ProgressWindow) {
    showAlert(text);
    return;
  }
  new ProgressWindow(config.addonName)
    .createLine({
      text,
      type,
      progress,
    })
    .show();
}

function getSelectionValidator() {
  if (!validateSelectionSchema) {
    const ajv = new Ajv({ allErrors: true, strict: true, logger: ajvLogger });
    addFormats(ajv);
    validateSelectionSchema = ajv.compile(selectionContextSchema);
  }
  return validateSelectionSchema;
}

export function registerSelectionSampleMenu() {
  if (!isDebugModeEnabled()) {
    return;
  }
  const menu = getRuntimeToolkit()?.Menu;
  if (!menu?.register) {
    return;
  }
  menu.register("item", {
    tag: "menuitem",
    id: `${config.addonRef}-sample-selection`,
    label: getString("menuitem-sample-selection"),
    commandListener: () => {
      void sampleSelectionContext();
    },
  });
  menu.register("item", {
    tag: "menuitem",
    id: `${config.addonRef}-validate-selection`,
    label: getString("menuitem-validate-selection"),
    commandListener: () => {
      void validateSelectionContext();
    },
  });
}

export async function sampleSelectionContext() {
  try {
    const outputDir = getPref("sampleOutputDir");
    if (!outputDir) {
      showAlert(getString("sample-output-dir-missing"));
      return;
    }

    const zoteroPane = Zotero.getMainWindow?.()?.ZoteroPane || null;
    const items = zoteroPane?.getSelectedItems?.() || [];
    const context = await buildSelectionContext(items);
    await Zotero.File.createDirectoryIfMissingAsync(outputDir);
    const filename = `selection-context-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`;
    const filePath = joinPath(outputDir, filename);
    await Zotero.File.putContentsAsync(
      filePath,
      JSON.stringify(context, null, 2),
    );
    showProgress(
      getString("sample-output-saved", { args: { path: filePath } }),
      "success",
    );
  } catch (error) {
    showAlert(`${config.addonName} sample failed: ${String(error)}`);
  }
}

function showAlert(message: string) {
  const win = Zotero.getMainWindow?.();
  const alertFn = resolveRuntimeAlert(win);
  if (alertFn) {
    alertFn(message);
  }
}

function joinPath(dir: string, filename: string) {
  if (typeof PathUtils !== "undefined") {
    return PathUtils.join(dir, filename);
  }
  if (typeof OS !== "undefined" && OS.Path?.join) {
    return OS.Path.join(dir, filename);
  }
  const sep = Zotero.isWin ? "\\" : "/";
  return dir.endsWith(sep) ? `${dir}${filename}` : `${dir}${sep}${filename}`;
}

async function validateSelectionContext() {
  try {
    const zoteroPane = Zotero.getMainWindow?.()?.ZoteroPane || null;
    const items = zoteroPane?.getSelectedItems?.() || [];
    const context = await buildSelectionContext(items);
    const validate = getSelectionValidator();
    const valid = validate(context);
    if (valid) {
      showProgress(getString("validate-selection-ok"), "success");
      return;
    }
    const errors = (validate.errors || [])
      .map(
        (error: ErrorObject) =>
          `${error.instancePath || "/"} ${error.message || ""}`,
      )
      .join("; ");
    showAlert(`${getString("validate-selection-failed")}: ${errors}`);
  } catch (error) {
    showAlert(`${config.addonName} validate failed: ${String(error)}`);
  }
}
