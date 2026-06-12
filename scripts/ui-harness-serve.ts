import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { watch, type FSWatcher } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  applySynthesisUiAction,
  buildSynthesisUiSnapshot,
  createDefaultSynthesisUiState,
  mergeSynthesisUiSnapshotInput,
  type SynthesisUiActionOperation,
  type SynthesisUiSnapshotInput,
  type SynthesisUiState,
  type SynthesisWorkbenchSurfaceName,
} from "../src/modules/synthesis/uiModel";
import { parseHarnessEnv } from "../src/modules/harness/env";
import { createSynthesisReadonlyService } from "../src/modules/harness/synthesisReadonlyService";
import { buildHarnessSynthesisI18nEnvelope } from "../src/modules/harness/synthesisWorkbenchI18nEnvelope";
import {
  installReadonlyZoteroPrefs,
  readZoteroPrefsStore,
  resolveZoteroPrefsPath,
} from "../src/modules/harness/prefsReadonly";

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), "..");
const contentRoot = path.join(root, "addon", "content");
const envPath = path.join(root, ".env");

type HarnessMessage = { type: string; payload: unknown };

const SYNTHESIS_I18N_MESSAGE_TYPES = new Set([
  "synthesis:init",
  "synthesis:snapshot",
  "synthesis:chrome",
  "synthesis:surface",
  "synthesis:surface-error",
]);

type SynthesisRuntime = {
  state: SynthesisUiState;
  input: SynthesisUiSnapshotInput;
  warnings: SynthesisUiActionOperation[];
  service?: Awaited<
    ReturnType<typeof createSynthesisReadonlyService>
  >["service"];
};

const diagnostics: string[] = [];
const actionLog: Array<Record<string, unknown>> = [];
let dashboardModel: Awaited<
  ReturnType<
    typeof import("../src/modules/harness/dashboardReadonlyModel").createDashboardReadonlyModel
  >
> | null = null;
let assistantModel: Awaited<
  ReturnType<
    typeof import("../src/modules/harness/assistantReadonlyModel").createAssistantReadonlyModel
  >
> | null = null;
let synthesisRuntime: SynthesisRuntime | null = null;
let closeSynthesis: (() => void) | undefined;
let workspaceBundle: string | null = null;
let synthesisBundle: string | null = null;
let bundleBuildError = "";
let liveReloadSeq = 0;
let liveReloadTimer: ReturnType<typeof setTimeout> | undefined;
const liveReloadClients = new Set<ServerResponse>();
const watchers: FSWatcher[] = [];

function nowIso() {
  return new Date().toISOString();
}

function logAction(
  source: string,
  action: string,
  payload?: Record<string, unknown>,
  readonlyReason = "readonly",
) {
  const entry = {
    id: `harness-${actionLog.length + 1}`,
    ts: nowIso(),
    source,
    action,
    payload: payload || {},
    readonlyReason,
    message: `Readonly harness blocked ${source}:${action} (${readonlyReason})`,
  };
  actionLog.unshift(entry);
  actionLog.splice(80);
  return entry;
}

function readonlyReasonForAction(action: string) {
  if (action.includes("copy")) return "clipboard";
  if (action.includes("open") || action.includes("export")) return "host-api";
  if (
    action.includes("run") ||
    action.includes("submit") ||
    action.includes("cancel") ||
    action.includes("connect") ||
    action.includes("reply")
  ) {
    return "backend-submit";
  }
  if (
    action.includes("merge") ||
    action.includes("update") ||
    action.includes("archive") ||
    action.includes("delete") ||
    action.includes("apply") ||
    action.includes("accept") ||
    action.includes("reject") ||
    action.includes("save")
  ) {
    return "db-write";
  }
  return "readonly";
}

function json(res: ServerResponse, status: number, payload: unknown) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(body);
}

function text(res: ServerResponse, status: number, body: string, mime: string) {
  res.writeHead(status, {
    "content-type": mime,
    "cache-control": "no-store",
  });
  res.end(body);
}

function bytes(
  res: ServerResponse,
  status: number,
  body: Buffer,
  mime: string,
) {
  res.writeHead(status, {
    "content-type": mime,
    "cache-control": "no-store",
  });
  res.end(body);
}

function mimeFor(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js") return "text/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".png") return "image/png";
  if (ext === ".woff2") return "font/woff2";
  return "application/octet-stream";
}

async function readJsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function safeResolveContent(urlPath: string) {
  const relative = decodeURIComponent(urlPath.replace(/^\/content\//, ""));
  const resolved = path.resolve(contentRoot, relative);
  if (
    !resolved.startsWith(contentRoot + path.sep) &&
    resolved !== contentRoot
  ) {
    throw new Error("invalid content path");
  }
  return resolved;
}

async function exists(filePath: string) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function buildBrowserBundle(entryPoint: string) {
  const esbuild = await import("esbuild");
  const result = await esbuild.build({
    entryPoints: [path.join(root, entryPoint)],
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: ["es2022"],
    logLevel: "silent",
  });
  return result.outputFiles[0].text;
}

function sse(res: ServerResponse, event: string, payload: unknown) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function broadcastLiveReload(event: string, payload: Record<string, unknown>) {
  for (const client of liveReloadClients) {
    try {
      sse(client, event, payload);
    } catch {
      liveReloadClients.delete(client);
    }
  }
}

async function rebuildHarnessBundles(reason: string) {
  try {
    const [nextWorkspaceBundle, nextSynthesisBundle] = await Promise.all([
      buildBrowserBundle("src/workspaceApp.ts"),
      buildBrowserBundle("src/synthesisWorkbenchApp.ts"),
    ]);
    workspaceBundle = nextWorkspaceBundle;
    synthesisBundle = nextSynthesisBundle;
    bundleBuildError = "";
    console.log(`[harness] rebuilt browser bundles (${reason})`);
    return true;
  } catch (error) {
    bundleBuildError = error instanceof Error ? error.message : String(error);
    console.error(
      `[harness] browser bundle rebuild failed: ${bundleBuildError}`,
    );
    return false;
  }
}

function shouldRebuildBundles(filePath: string) {
  const normalized = filePath.split(path.sep).join("/");
  if (!normalized.includes("/src/")) return false;
  return /\.(ts|tsx|js|jsx|css|html)$/.test(normalized);
}

function shouldReloadForContent(filePath: string) {
  const normalized = filePath.split(path.sep).join("/");
  if (!normalized.includes("/addon/content/")) return false;
  return /\.(html|xhtml|js|css|svg|png|json|woff2)$/.test(normalized);
}

function scheduleLiveReload(filePath: string) {
  const rebuild = shouldRebuildBundles(filePath);
  const reload = rebuild || shouldReloadForContent(filePath);
  if (!reload) return;
  if (liveReloadTimer) {
    clearTimeout(liveReloadTimer);
  }
  liveReloadTimer = setTimeout(() => {
    void (async () => {
      liveReloadTimer = undefined;
      const ok = rebuild ? await rebuildHarnessBundles(filePath) : true;
      liveReloadSeq += 1;
      if (!ok) {
        broadcastLiveReload("build-error", {
          seq: liveReloadSeq,
          path: path.relative(root, filePath),
          error: bundleBuildError,
        });
        return;
      }
      broadcastLiveReload("reload", {
        seq: liveReloadSeq,
        path: path.relative(root, filePath),
        rebuiltBundles: rebuild,
      });
    })();
  }, 120);
}

function startLiveReloadWatchers() {
  const watchRoots = [path.join(root, "src"), contentRoot];
  for (const watchRoot of watchRoots) {
    try {
      const watcher = watch(
        watchRoot,
        { recursive: true },
        (_eventType, filename) => {
          if (!filename) return;
          const relative = Buffer.isBuffer(filename)
            ? filename.toString("utf8")
            : String(filename);
          scheduleLiveReload(path.join(watchRoot, relative));
        },
      );
      watchers.push(watcher);
    } catch (error) {
      diagnostics.push(
        `Live reload watcher failed for ${watchRoot}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}

function buildDefaultSnapshotInput(): SynthesisUiSnapshotInput {
  return {
    libraryId: 1,
    storage: {
      rootState: "unbound",
      anchorState: "missing",
      mirrorState: "missing",
    },
    preferences: {
      sourceWatchEnabled: false,
      registryAutoRebuild: false,
      graphRebuildMode: "off",
      stalenessScanEnabled: false,
      debounceMs: 0,
      startupHashCheck: false,
    },
    artifacts: [],
    deletedArtifacts: { rows: [] },
    registry: { rows: [] },
    graph: {
      graph_hash: "",
      nodes: [],
      edges: [],
    },
  };
}

function snapshot(runtime: SynthesisRuntime) {
  return buildSynthesisUiSnapshot(
    {
      ...runtime.input,
      actions: {
        warnings: runtime.warnings,
      },
    },
    runtime.state,
  );
}

function localeFromRequest(
  req: IncomingMessage,
  body?: Record<string, unknown>,
) {
  return String(
    body?.locale ||
      req.headers["x-zs-harness-locale"] ||
      req.headers["accept-language"] ||
      "",
  );
}

function withSynthesisHarnessI18n(payload: unknown, localeInput: string) {
  const i18n = buildHarnessSynthesisI18nEnvelope(localeInput, {
    rootDir: root,
  });
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return {
      ...(payload as Record<string, unknown>),
      i18n,
    };
  }
  return { value: payload, i18n };
}

function decorateSynthesisHarnessResult<
  T extends { messages?: HarnessMessage[] },
>(result: T, localeInput: string): T {
  return {
    ...result,
    messages: (result.messages || []).map((message) =>
      SYNTHESIS_I18N_MESSAGE_TYPES.has(message.type)
        ? {
            ...message,
            payload: withSynthesisHarnessI18n(message.payload, localeInput),
          }
        : message,
    ),
  };
}

function surfaceForTab(tab: string): SynthesisWorkbenchSurfaceName {
  if (tab === "overview") return "home";
  if (tab === "artifacts") return "topics";
  if (tab === "registry") return "index";
  if (tab === "reviews") return "review";
  return tab as SynthesisWorkbenchSurfaceName;
}

async function refreshSynthesisInput(
  runtime: SynthesisRuntime,
  surface: SynthesisWorkbenchSurfaceName,
) {
  if (!runtime.service) return;
  const input = await runtime.service.getSynthesisWorkbenchSurfaceInput(
    surface,
    runtime.state,
  );
  runtime.input = mergeSynthesisUiSnapshotInput(runtime.input, input);
}

async function handleSynthesisAction(
  action: string,
  payload: Record<string, unknown>,
) {
  const runtime = synthesisRuntime;
  if (!runtime?.service) {
    return {
      messages: [
        {
          type: "synthesis:surface-error",
          payload: {
            surface: "home",
            message:
              diagnostics.join("\n") ||
              "Synthesis readonly service unavailable.",
          },
        },
      ],
      actionLog: [],
    };
  }
  const messages: HarnessMessage[] = [];
  const result = applySynthesisUiAction(runtime.state, { action, payload });
  runtime.state = result.state;
  let surface = surfaceForTab(runtime.state.selectedTab);

  if (action === "ready") {
    const chrome = await runtime.service.getSynthesisWorkbenchChromeInput(
      runtime.state,
    );
    runtime.input = mergeSynthesisUiSnapshotInput(runtime.input, chrome);
    await refreshSynthesisInput(runtime, surface);
    messages.push({ type: "synthesis:init", payload: snapshot(runtime) });
    messages.push({ type: "synthesis:chrome", payload: snapshot(runtime) });
    messages.push({
      type: "synthesis:surface",
      payload: { surface, snapshot: snapshot(runtime) },
    });
    return { messages, actionLog: [] };
  }

  const logEntries: Record<string, unknown>[] = [];
  if (result.hostCommand) {
    const command = result.hostCommand.command;
    const args = result.hostCommand.args;
    if (command === "openTopicArtifact") {
      const topicId = String(args.topicId || args.id || "").trim();
      if (topicId) {
        const detail = await runtime.service.readTopicDetail({ topicId });
        const reader = applySynthesisUiAction(runtime.state, {
          action: "showArtifactReader",
          payload: { topicId },
        });
        runtime.state = reader.state;
        surface = "reader";
        await refreshSynthesisInput(runtime, "concepts").catch(() => undefined);
        await refreshSynthesisInput(runtime, surface);
        messages.push({
          type: "synthesis:topic-detail",
          payload: detail,
        });
      }
    } else if (command === "resolveTopicPaperDigest") {
      messages.push({
        type: "synthesis:digest",
        payload: await runtime.service.resolveTopicPaperDigest(args),
      });
    } else {
      const entry = logAction(
        "synthesis",
        command,
        args,
        readonlyReasonForAction(command),
      );
      logEntries.push(entry);
      runtime.warnings.unshift({
        key: String(entry.id),
        command,
        status: "completed",
        label: command,
        completed_at: String(entry.ts),
        message: "Readonly harness mocked this host command.",
      });
      runtime.warnings.splice(8);
    }
  }

  await refreshSynthesisInput(runtime, surface);
  messages.push({
    type: "synthesis:surface",
    payload: { surface, snapshot: snapshot(runtime) },
  });
  return { messages, actionLog: logEntries };
}

async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  try {
    if (url.pathname === "/" || url.pathname === "/content/harness/") {
      const file = path.join(contentRoot, "harness", "index.html");
      text(res, 200, await readFile(file, "utf8"), mimeFor(file));
      return;
    }
    if (url.pathname === "/content/workspace/app.bundle.js") {
      text(res, 200, workspaceBundle || "", "text/javascript; charset=utf-8");
      return;
    }
    if (url.pathname === "/content/synthesis/app.bundle.js") {
      text(res, 200, synthesisBundle || "", "text/javascript; charset=utf-8");
      return;
    }
    if (url.pathname === "/api/harness/live") {
      res.writeHead(200, {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-store",
        connection: "keep-alive",
      });
      liveReloadClients.add(res);
      sse(res, "connected", {
        seq: liveReloadSeq,
        bundleBuildError,
      });
      req.on("close", () => {
        liveReloadClients.delete(res);
      });
      return;
    }
    if (url.pathname === "/api/harness/status") {
      json(res, 200, {
        ok: diagnostics.length === 0,
        diagnostics,
        actionLog,
        modelDiagnostics: {
          dashboard:
            dashboardModel && "diagnostics" in dashboardModel
              ? dashboardModel.diagnostics()
              : null,
          assistant:
            assistantModel && "diagnostics" in assistantModel
              ? assistantModel.diagnostics()
              : null,
          synthesis: {
            canonicalRevisionProposals:
              synthesisRuntime?.input.registry?.cleanupProposals?.filter(
                (proposal) =>
                  String(proposal.review_kind || proposal.kind || "") ===
                  "canonical_revision",
              ).length || 0,
            mockActionCount: actionLog.length,
          },
        },
        liveReload: {
          clients: liveReloadClients.size,
          seq: liveReloadSeq,
          bundleBuildError,
        },
      });
      return;
    }
    if (url.pathname === "/api/harness/assistant/snapshot") {
      if (!assistantModel) {
        json(res, 503, {
          error: diagnostics.join("\n") || "Assistant model unavailable.",
        });
        return;
      }
      json(res, 200, assistantModel.snapshot());
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/harness/mock-action") {
      const body = await readJsonBody(req);
      json(res, 200, {
        logEntry: logAction(
          String(body.source || "harness"),
          String(body.action || "unknown"),
          body.payload || {},
          readonlyReasonForAction(String(body.action || "unknown")),
        ),
      });
      return;
    }
    if (
      req.method === "POST" &&
      url.pathname === "/api/harness/dashboard/action"
    ) {
      if (!dashboardModel) {
        json(res, 503, {
          error: diagnostics.join("\n") || "Dashboard model unavailable.",
        });
        return;
      }
      const body = await readJsonBody(req);
      const action = String(body.action || "");
      const logEntry =
        action === "select-tab" || action === "ready"
          ? undefined
          : logAction(
              "dashboard",
              action,
              body.payload || {},
              readonlyReasonForAction(action),
            );
      const snapshotPayload = await dashboardModel.handleAction(
        action,
        body.payload || {},
      );
      json(res, 200, { snapshot: snapshotPayload, logEntry });
      return;
    }
    if (
      req.method === "POST" &&
      url.pathname === "/api/harness/synthesis/action"
    ) {
      const body = await readJsonBody(req);
      const localeInput = localeFromRequest(
        req,
        body && typeof body === "object" && !Array.isArray(body)
          ? (body as Record<string, unknown>)
          : {},
      );
      const result = await handleSynthesisAction(
        String(body.action || ""),
        body.payload || {},
      );
      json(res, 200, decorateSynthesisHarnessResult(result, localeInput));
      return;
    }
    if (url.pathname.startsWith("/content/")) {
      const file = safeResolveContent(url.pathname);
      bytes(res, 200, await readFile(file), mimeFor(file));
      return;
    }
    json(res, 404, { error: "not found" });
  } catch (error) {
    json(res, 500, {
      error:
        error instanceof Error
          ? error.message
          : String(error || "unknown error"),
    });
  }
}

async function main() {
  const env = parseHarnessEnv(await readFile(envPath, "utf8").catch(() => ""));
  const dataDir = env.zoteroPluginDataDir;
  if (!dataDir) {
    diagnostics.push("ZOTERO_PLUGIN_DATA_DIR is missing from .env.");
  }
  const zoteroDbPath = dataDir ? path.join(dataDir, "zotero.sqlite") : "";
  const pluginRuntimeRoot = dataDir ? path.join(dataDir, "zotero-agents") : "";
  const pluginDbPath = pluginRuntimeRoot
    ? path.join(pluginRuntimeRoot, "state", "zotero-agents.db")
    : "";
  const prefsPath = resolveZoteroPrefsPath({
    explicitPrefsPath: env.zoteroPrefsPath,
    profilePath: env.zoteroPluginProfilePath,
  });
  if (zoteroDbPath && !(await exists(zoteroDbPath))) {
    diagnostics.push(`Zotero DB not found: ${zoteroDbPath}`);
  }
  if (pluginDbPath && !(await exists(pluginDbPath))) {
    diagnostics.push(`Plugin DB not found: ${pluginDbPath}`);
  }
  if (prefsPath && (await exists(prefsPath))) {
    installReadonlyZoteroPrefs(await readZoteroPrefsStore(prefsPath));
  } else {
    diagnostics.push(
      prefsPath
        ? `Zotero prefs not found: ${prefsPath}`
        : "ZOTERO_PLUGIN_PROFILE_PATH or ZOTERO_PREFS_PATH is missing from .env.",
    );
  }

  if (!(await rebuildHarnessBundles("startup"))) {
    diagnostics.push(`Browser bundle build failed: ${bundleBuildError}`);
  }

  if (pluginDbPath && (await exists(pluginDbPath))) {
    const { createDashboardReadonlyModel } =
      await import("../src/modules/harness/dashboardReadonlyModel");
    const { createAssistantReadonlyModel } =
      await import("../src/modules/harness/assistantReadonlyModel");
    const workflowsDir = String(
      (globalThis as any).Zotero?.Prefs?.get?.(
        "extensions.zotero.zotero-skills.workflowDir",
      ) || path.join(pluginRuntimeRoot, "data", "workflows"),
    ).trim();
    dashboardModel = await createDashboardReadonlyModel(pluginDbPath, {
      workflowsDir,
      builtinWorkflowsDir: path.join(
        pluginRuntimeRoot,
        "data",
        "workflows_builtin",
      ),
    }).catch((error) => {
      diagnostics.push(
        `Dashboard readonly model failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    });
    assistantModel = await createAssistantReadonlyModel(pluginDbPath).catch(
      (error) => {
        diagnostics.push(
          `Assistant readonly model failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        return null;
      },
    );
  }
  if (
    zoteroDbPath &&
    pluginDbPath &&
    (await exists(zoteroDbPath)) &&
    (await exists(pluginDbPath))
  ) {
    const serviceHandle = await createSynthesisReadonlyService({
      zoteroDbPath,
      pluginDbPath,
      pluginRuntimeRoot,
      libraryId: 1,
    }).catch((error) => {
      diagnostics.push(
        `Synthesis readonly service failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    });
    if (serviceHandle) {
      closeSynthesis = serviceHandle.close;
      synthesisRuntime = {
        state: createDefaultSynthesisUiState(),
        input: buildDefaultSnapshotInput(),
        warnings: [],
        service: serviceHandle.service,
      };
    }
  }

  if (process.argv.includes("--check")) {
    console.log(
      JSON.stringify(
        {
          ok: diagnostics.length === 0,
          diagnostics,
          bundles: {
            workspace: Boolean(workspaceBundle),
            synthesis: Boolean(synthesisBundle),
          },
          dashboard: Boolean(dashboardModel),
          assistant: Boolean(assistantModel),
          synthesis: Boolean(synthesisRuntime?.service),
        },
        null,
        2,
      ),
    );
    dashboardModel?.close();
    assistantModel?.close();
    closeSynthesis?.();
    return;
  }

  const port = Number(process.env.HARNESS_UI_PORT || 5177);
  const server = createServer((req, res) => void handleRequest(req, res));
  server.listen(port, "127.0.0.1", () => {
    console.log(`Readonly UI harness: http://127.0.0.1:${port}/`);
  });
  startLiveReloadWatchers();
  const close = () => {
    watchers.splice(0).forEach((watcher) => watcher.close());
    liveReloadClients.forEach((client) => client.end());
    liveReloadClients.clear();
    dashboardModel?.close();
    assistantModel?.close();
    closeSynthesis?.();
    server.close();
  };
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
