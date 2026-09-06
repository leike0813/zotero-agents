import { config } from "../../package.json";
import {
  readSelectionContext,
  type SelectionContext,
} from "./selectionContext";
import { getString } from "../utils/locale";
import { getPref } from "../utils/prefs";
import {
  resolveRuntimeAlert,
  resolveRuntimeToolkit,
  resolveRuntimeWindowCandidates,
} from "../utils/runtimeBridge";
import { isDebugModeEnabled } from "./debugMode";
import { joinPath } from "../utils/path";
import {
  ensureRuntimeDirectoryStrict,
  writeRuntimeTextFileStrict,
} from "./runtimePersistence";

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

    const context = await readSelectionContext();
    await ensureRuntimeDirectoryStrict(outputDir);
    const filename = `selection-context-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`;
    const filePath = joinPath(outputDir, filename);
    await writeRuntimeTextFileStrict(
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
  const win = resolveRuntimeWindowCandidates()[0];
  const alertFn = resolveRuntimeAlert(win);
  if (alertFn) {
    alertFn(message);
  }
}

async function validateSelectionContext() {
  try {
    const context: SelectionContext = await readSelectionContext();
    if (
      !Array.isArray(context.items) ||
      typeof context.sampledAt !== "string"
    ) {
      throw new Error("canonical selection context is invalid");
    }
    showProgress(getString("validate-selection-ok"), "success");
  } catch (error) {
    showAlert(`${config.addonName} validate failed: ${String(error)}`);
  }
}
