import {
  resolveRuntimeAddon,
  resolveRuntimeToolkit,
  resolveRuntimeZotero,
} from "../utils/runtimeBridge";

type RuntimeFilePickerCtor = new (
  title: string,
  mode: string,
  filters: [string, string][],
  suggestion: string,
  window: Window | undefined,
  filterMask?: string,
  directory?: string,
) => {
  open: () => Promise<unknown> | unknown;
};

function isUsableRuntimeFilePickerParentWindow(
  value: unknown,
): value is Window {
  if (!value || typeof value !== "object") {
    return false;
  }
  try {
    const window = value as Window & { browsingContext?: unknown };
    return !window.closed && !!window.browsingContext;
  } catch {
    return false;
  }
}

export function resolveRuntimeFilePickerParentWindow() {
  const runtimeAddon = resolveRuntimeAddon() as
    | {
        data?: {
          dialog?: { window?: Window };
          prefs?: { window?: Window };
        };
      }
    | undefined;
  const runtimeZotero = resolveRuntimeZotero() as
    | { getMainWindow?: () => Window | null | undefined }
    | undefined;
  let mainWindow: Window | null | undefined;
  try {
    mainWindow = runtimeZotero?.getMainWindow?.();
  } catch {
    mainWindow = undefined;
  }
  const candidates = [
    runtimeAddon?.data?.dialog?.window || undefined,
    runtimeAddon?.data?.prefs?.window || undefined,
    mainWindow || undefined,
  ];
  return candidates.find(isUsableRuntimeFilePickerParentWindow);
}

export async function openRuntimeFilePicker(args: {
  title?: string;
  mode: "folder" | "open" | "multiple" | "save";
  filters?: [string, string][];
  directory?: string;
  suggestion?: string;
}): Promise<string | string[] | null> {
  const toolkit = resolveRuntimeToolkit() as
    | { FilePicker?: RuntimeFilePickerCtor }
    | undefined;
  const FilePicker = toolkit?.FilePicker;
  if (typeof FilePicker !== "function") return null;
  const selected = await new FilePicker(
    String(args.title || "").trim(),
    args.mode,
    Array.isArray(args.filters) ? args.filters : [],
    String(args.suggestion || "").trim(),
    resolveRuntimeFilePickerParentWindow(),
    undefined,
    String(args.directory || "").trim() || undefined,
  ).open();
  if (args.mode === "multiple") {
    const values = Array.isArray(selected) ? selected : [selected];
    const normalized = values
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
    return normalized.length > 0 ? normalized : null;
  }
  return typeof selected === "string" && selected.trim()
    ? selected.trim()
    : null;
}
