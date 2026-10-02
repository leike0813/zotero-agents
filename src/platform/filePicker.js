import { resolveRuntimeToolkit, resolveRuntimeWindowCandidates, } from "../utils/runtimeBridge";
function isUsableRuntimeFilePickerParentWindow(value) {
    if (!value || typeof value !== "object") {
        return false;
    }
    try {
        const window = value;
        return !window.closed && !!window.browsingContext;
    }
    catch {
        return false;
    }
}
function resolveRuntimeFilePickerParentWindow() {
    return resolveRuntimeWindowCandidates().find(isUsableRuntimeFilePickerParentWindow);
}
async function openNativeMultiFilePicker(args) {
    const runtime = globalThis;
    if (typeof runtime.ChromeUtils?.importESModule !== "function") {
        return { supported: false, selected: null };
    }
    try {
        const pickerModule = runtime.ChromeUtils.importESModule("chrome://zotero/content/modules/filePicker.mjs");
        const Picker = pickerModule?.FilePicker;
        if (typeof Picker !== "function") {
            return { supported: false, selected: null };
        }
        const picker = new Picker();
        picker.init(resolveRuntimeFilePickerParentWindow(), String(args.title || "").trim(), picker.modeOpenMultiple);
        if (String(args.directory || "").trim()) {
            picker.displayDirectory = String(args.directory || "").trim();
        }
        for (const filter of Array.isArray(args.filters) ? args.filters : []) {
            if (!Array.isArray(filter) || filter.length < 2)
                continue;
            picker.appendFilter(String(filter[0] || "").trim(), String(filter[1] || "").trim());
        }
        const result = await picker.show();
        if (result === picker.returnCancel) {
            return { supported: true, selected: null };
        }
        const files = Array.isArray(picker.files)
            ? picker.files
                .map((entry) => String(entry || "").trim())
                .filter(Boolean)
            : [];
        return { supported: true, selected: files };
    }
    catch {
        return { supported: false, selected: null };
    }
}
export async function openRuntimeFilePicker(args) {
    if (args.mode === "multiple") {
        const native = await openNativeMultiFilePicker(args);
        if (native.supported)
            return native.selected;
    }
    const toolkit = resolveRuntimeToolkit();
    const FilePicker = toolkit?.FilePicker;
    if (typeof FilePicker !== "function")
        return null;
    const selected = await new FilePicker(String(args.title || "").trim(), args.mode, Array.isArray(args.filters) ? args.filters : [], String(args.suggestion || "").trim(), resolveRuntimeFilePickerParentWindow(), undefined, String(args.directory || "").trim() || undefined).open();
    if (args.mode === "multiple") {
        if (selected == null || selected === false) {
            return null;
        }
        const values = Array.isArray(selected) ? selected : [selected];
        const normalized = values
            .map((entry) => String(entry || "").trim())
            .filter(Boolean);
        return normalized;
    }
    return typeof selected === "string" && selected.trim()
        ? selected.trim()
        : null;
}
