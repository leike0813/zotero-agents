import { assert } from "chai";

type DynamicImport = (specifier: string) => Promise<any>;

const dynamicImport: DynamicImport = new Function(
  "specifier",
  "return import(specifier)",
) as DynamicImport;

export function isZoteroRuntime() {
  const runtime = globalThis as {
    IOUtils?: unknown;
    PathUtils?: unknown;
  };
  return !!runtime.IOUtils && !!runtime.PathUtils;
}

function getPathSeparator() {
  const runtime = globalThis as {
    Zotero?: { isWin?: boolean };
    process?: { platform?: string };
  };
  if (typeof runtime.Zotero?.isWin === "boolean") {
    return runtime.Zotero.isWin ? "\\" : "/";
  }
  return runtime.process?.platform === "win32" ? "\\" : "/";
}

export function joinPath(...segments: string[]) {
  const normalizedSegments = segments
    .map((segment) => String(segment || ""))
    .filter(Boolean);
  const separator = getPathSeparator();
  const firstNonEmpty =
    normalizedSegments.find((segment) => segment.length > 0) || "";
  const isPosixAbsolute = firstNonEmpty.startsWith("/");
  const driveMatch = firstNonEmpty.match(/^([A-Za-z]:)[\\/]?/);
  const drivePrefix = driveMatch?.[1] || "";
  const normalized = normalizedSegments
    .flatMap((segment) => segment.split(/[\\/]+/))
    .filter(Boolean);
  if (!normalized.length) {
    if (drivePrefix) {
      return `${drivePrefix}${separator}`;
    }
    return isPosixAbsolute ? separator : "";
  }
  if (
    drivePrefix &&
    normalized[0].toLowerCase() === drivePrefix.toLowerCase()
  ) {
    normalized.shift();
  }
  const joined = normalized.join(separator);
  if (drivePrefix) {
    return `${drivePrefix}${separator}${joined}`;
  }
  if (isPosixAbsolute) {
    return `${separator}${joined}`;
  }
  return joined;
}

export function getProjectRoot() {
  const services = globalThis as {
    Services?: {
      dirsvc?: {
        get?: (key: string, iface: unknown) => { path?: string };
      };
    };
    Ci?: { nsIFile?: unknown };
    process?: { cwd?: () => string };
  };
  if (services.Services?.dirsvc?.get && services.Ci?.nsIFile) {
    const file = services.Services.dirsvc.get("CurWorkD", services.Ci.nsIFile);
    if (file?.path) {
      return file.path;
    }
  }
  if (typeof services.process?.cwd === "function") {
    return services.process.cwd();
  }
  return ".";
}

export function fixturePath(...segments: string[]) {
  const normalizedSegments = segments.map((segment) =>
    String(segment || "").trim(),
  );
  const preferred = joinPath(
    getProjectRoot(),
    "test",
    "fixtures",
    ...normalizedSegments,
  );
  if (isZoteroRuntime()) {
    return preferred;
  }
  return preferred;
}

export function workflowsPath(...segments: string[]) {
  return joinPath(getProjectRoot(), "workflows_builtin", ...segments);
}

function dirnamePath(targetPath: string) {
  const normalized = targetPath.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length <= 1) {
    return "";
  }
  return joinPath(...parts.slice(0, -1));
}

export async function mkTempDir(prefix: string) {
  if (isZoteroRuntime()) {
    const runtime = globalThis as {
      PathUtils: { tempDir: string };
      IOUtils: {
        makeDirectory: (
          path: string,
          options?: Record<string, unknown>,
        ) => Promise<void>;
      };
    };
    const dir = joinPath(
      runtime.PathUtils.tempDir,
      `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    );
    await runtime.IOUtils.makeDirectory(dir, { createAncestors: true });
    return dir;
  }
  const fs = await dynamicImport("fs/promises");
  const os = await dynamicImport("os");
  const path = await dynamicImport("path");
  return fs.mkdtemp(path.join(os.tmpdir(), `${prefix}-`)) as Promise<string>;
}

export async function writeUtf8(filePath: string, content: string) {
  if (isZoteroRuntime()) {
    const runtime = globalThis as {
      IOUtils: {
        makeDirectory: (
          path: string,
          options?: Record<string, unknown>,
        ) => Promise<void>;
        writeUTF8: (path: string, data: string) => Promise<void>;
      };
    };
    const parent = dirnamePath(filePath);
    if (parent) {
      await runtime.IOUtils.makeDirectory(parent, { createAncestors: true });
    }
    await runtime.IOUtils.writeUTF8(filePath, content);
    return;
  }
  const fs = await dynamicImport("fs/promises");
  const path = await dynamicImport("path");
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

export async function ensureDir(dirPath: string) {
  if (isZoteroRuntime()) {
    const runtime = globalThis as {
      IOUtils: {
        makeDirectory: (
          path: string,
          options?: Record<string, unknown>,
        ) => Promise<void>;
      };
    };
    await runtime.IOUtils.makeDirectory(dirPath, { createAncestors: true });
    return;
  }
  const fs = await dynamicImport("fs/promises");
  await fs.mkdir(dirPath, { recursive: true });
}

export async function writeBytes(filePath: string, data: Uint8Array) {
  if (isZoteroRuntime()) {
    const runtime = globalThis as {
      IOUtils: {
        makeDirectory: (
          path: string,
          options?: Record<string, unknown>,
        ) => Promise<void>;
        write: (path: string, data: Uint8Array) => Promise<void>;
      };
    };
    const parent = dirnamePath(filePath);
    if (parent) {
      await runtime.IOUtils.makeDirectory(parent, { createAncestors: true });
    }
    await runtime.IOUtils.write(filePath, data);
    return;
  }
  const fs = await dynamicImport("fs/promises");
  const path = await dynamicImport("path");
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, data);
}

export async function readBytes(filePath: string): Promise<Uint8Array> {
  if (isZoteroRuntime()) {
    const runtime = globalThis as {
      IOUtils: {
        read: (path: string) => Promise<Uint8Array>;
      };
    };
    return runtime.IOUtils.read(filePath);
  }
  const fs = await dynamicImport("fs/promises");
  return fs.readFile(filePath) as Promise<Uint8Array>;
}

export async function readUtf8(filePath: string): Promise<string> {
  if (isZoteroRuntime()) {
    const runtime = globalThis as {
      IOUtils: {
        readUTF8: (path: string) => Promise<string>;
      };
    };
    return runtime.IOUtils.readUTF8(filePath);
  }
  const fs = await dynamicImport("fs/promises");
  return fs.readFile(filePath, "utf8") as Promise<string>;
}

export async function existsPath(targetPath: string): Promise<boolean> {
  if (isZoteroRuntime()) {
    const runtime = globalThis as {
      IOUtils: {
        stat: (path: string) => Promise<unknown>;
      };
    };
    try {
      await runtime.IOUtils.stat(targetPath);
      return true;
    } catch {
      return false;
    }
  }
  const fs = await dynamicImport("fs/promises");
  try {
    await fs.stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function listDirNames(dirPath: string): Promise<string[]> {
  if (isZoteroRuntime()) {
    const runtime = globalThis as {
      IOUtils: {
        getChildren: (path: string) => Promise<string[]>;
      };
    };
    const children = await runtime.IOUtils.getChildren(dirPath);
    return children
      .map(
        (entry) =>
          String(entry || "")
            .replace(/\\/g, "/")
            .split("/")
            .pop() || "",
      )
      .filter(Boolean);
  }
  const fs = await dynamicImport("fs/promises");
  return fs.readdir(dirPath) as Promise<string[]>;
}

export function encodeBase64Utf8(text: string): string {
  const source = String(text || "");
  const bufferCtor =
    typeof Buffer !== "undefined" && Buffer && typeof Buffer.from === "function"
      ? Buffer
      : null;
  if (bufferCtor) {
    return bufferCtor.from(source, "utf8").toString("base64");
  }
  if (typeof TextEncoder !== "undefined" && typeof btoa === "function") {
    const bytes = new TextEncoder().encode(source);
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  }
  if (typeof btoa === "function") {
    return btoa(unescape(encodeURIComponent(source)));
  }
  throw new Error("No base64 encoder available in current runtime");
}

export function decodeBase64Utf8(text: string): string {
  const encoded = String(text || "").trim();
  const bufferCtor =
    typeof Buffer !== "undefined" && Buffer && typeof Buffer.from === "function"
      ? Buffer
      : null;
  if (bufferCtor) {
    return bufferCtor.from(encoded, "base64").toString("utf8");
  }
  if (typeof TextDecoder !== "undefined" && typeof atob === "function") {
    const binary = atob(encoded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }
  if (typeof atob === "function") {
    return decodeURIComponent(escape(atob(encoded)));
  }
  throw new Error("No base64 decoder available in current runtime");
}

type WorkflowSummaryCounterField = "succeeded" | "failed" | "skipped";

const WORKFLOW_SUMMARY_COUNTER_ALIASES: Record<
  WorkflowSummaryCounterField,
  string[]
> = {
  succeeded: ["succeeded", "\u6210\u529f"],
  failed: ["failed", "\u5931\u8d25"],
  skipped: ["skipped", "\u8df3\u8fc7"],
};

export function hasWorkflowSummaryCounter(
  message: string,
  field: WorkflowSummaryCounterField,
  value: number,
) {
  const summary = String(message || "");
  return WORKFLOW_SUMMARY_COUNTER_ALIASES[field].some((label) =>
    summary.includes(`${label}=${value}`),
  );
}

export function expectWorkflowSummaryCounter(
  message: string,
  field: WorkflowSummaryCounterField,
  value: number,
) {
  assert.isTrue(
    hasWorkflowSummaryCounter(message, field, value),
    `expected workflow summary to include ${field}=${value} (or localized equivalent), got: ${message}`,
  );
}
