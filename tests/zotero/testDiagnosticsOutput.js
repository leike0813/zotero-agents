import { joinPath } from "../../src/utils/path";
const dynamicImport = new Function("specifier", "return import(specifier)");
function getRuntime() {
    return globalThis;
}
export function normalizeDiagnosticsString(value) {
    return String(value || "").trim();
}
export function readDiagnosticsEnv(name) {
    const runtime = getRuntime();
    const fromProcess = runtime.process?.env?.[name];
    if (typeof fromProcess === "string" && fromProcess.trim()) {
        return fromProcess.trim();
    }
    if (typeof runtime.Services?.env?.get === "function") {
        try {
            const fromServices = runtime.Services.env.get(name);
            if (typeof fromServices === "string" && fromServices.trim()) {
                return fromServices.trim();
            }
        }
        catch {
            // ignore env lookup failures
        }
    }
    return "";
}
export async function ensureDiagnosticsDirectory(targetPath) {
    const runtime = getRuntime();
    if (typeof runtime.IOUtils?.makeDirectory === "function") {
        await runtime.IOUtils.makeDirectory(targetPath, { createAncestors: true });
        return;
    }
    const fs = await dynamicImport("fs/promises");
    await fs.mkdir(targetPath, { recursive: true });
}
export async function writeDiagnosticsText(targetPath, content) {
    const runtime = getRuntime();
    if (typeof runtime.IOUtils?.writeUTF8 === "function") {
        await runtime.IOUtils.writeUTF8(targetPath, content);
        return;
    }
    const fs = await dynamicImport("fs/promises");
    await fs.writeFile(targetPath, content, "utf8");
}
export function resolveDefaultTestDiagnosticsDirectory() {
    const runtime = getRuntime();
    const cwd = runtime.process?.cwd?.();
    if (typeof cwd === "string" && cwd.trim()) {
        return joinPath(cwd, "artifacts", "test-diagnostics");
    }
    const tempDir = normalizeDiagnosticsString(runtime.PathUtils?.tempDir);
    if (tempDir) {
        return joinPath(tempDir, "zotero-skills-test-diagnostics");
    }
    return joinPath("artifacts", "test-diagnostics");
}
export function resolveDefaultTestDiagnosticsOutputPath(args) {
    const explicit = readDiagnosticsEnv(args.envName);
    if (explicit) {
        return explicit;
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    return joinPath(resolveDefaultTestDiagnosticsDirectory(), `${args.prefix}-${stamp}.json`);
}
