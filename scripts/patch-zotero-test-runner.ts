import { readFile, writeFile } from "fs/promises";
import path from "path";

const DIAGNOSTIC_MARKER = "ZOTERO_SKILLS_DIAGNOSTIC_PATCH_V1";
const MOCHA_CONTAINER_ANCHOR = `<div id="mocha"></div>`;
const MOCHA_CONTAINER_PATCH = `<div id="mocha" style="white-space: pre-wrap; overflow-wrap: anywhere;"></div>`;

const SEND_FUNCTION_ANCHOR = `async function send(data) {
  const req = await Zotero.HTTP.request(
    "POST",
    "http://localhost:__PORT__/update",
    {
      body: JSON.stringify(data),
    }
  );

  if (req.status !== 200) {
    dump("Error sending data to server" + req.responseText);
    return null;
  } else {
    const result = JSON.parse(req.responseText);
    return result;
  }
}`;

const DEBUG_ANCHOR = `window.debug = function (data) {
  send({ type: "debug", data });
};`;

const DUMP_LINE_ANCHOR = `    document.querySelector("#mocha").innerText += str;`;
const START_LOG_ANCHOR = `    console.log("start")`;
const SUITE_LOG_ANCHOR = `    console.log("suite", suite)`;
const SUITE_END_LOG_ANCHOR = `    console.log("suite end", suite)`;
const PENDING_LOG_ANCHOR = `    console.log("pending", test)`;
const PASS_LOG_ANCHOR = `    console.log("pass", test)`;
const FAIL_LOG_ANCHOR = `    console.log("fail", test, error)`;
const END_LOG_ANCHOR = `    console.log("end")`;

const START_SEND_ANCHOR = `    await send({ type: "start", data: { indents } });`;
const SUITE_SEND_ANCHOR = `    await send({ type: "suite", data: { title: suite.title, root: suite.root, indents } });`;
const SUITE_END_SEND_ANCHOR = `    await send({ type: "suite end", data: { title: suite.title, root: suite.root, indents } });`;
const PENDING_SEND_ANCHOR = `    await send({ type: "pending", data: { title: test.title, fulltest: test.fullTitle(), duration: test.duration, indents: indents + 1 } });`;
const PASS_SEND_ANCHOR = `    await send({ type: "pass", data: { title: test.title, fulltest: test.fullTitle(), duration: test.duration, indents: indents + 1 } });`;
const FAIL_SEND_ANCHOR = `    await send({ type: "fail", data: { title: test.title, fulltest: test.fullTitle(), duration: test.duration, error, indents: indents + 1 } });`;
const END_SEND_ANCHOR = `    await send({
      type: "end",
      data: { passed: passed, failed: failed, aborted: aborted, str, indents },
    });`;

function escapeInlineScriptForXml(source: string) {
  return source.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
}

function normalizeSystemE2EEventUrl(value: string | undefined) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+\/events$/.test(url)) {
    throw new Error("Invalid System E2E event URL");
  }
  return url;
}

function buildTransportBlock(port: string, systemE2EEventUrl: string) {
  return escapeInlineScriptForXml(`Services.prefs.setStringPref(
  "extensions.zotero-agents.test.systemE2EEventUrl",
  ${JSON.stringify(systemE2EEventUrl)},
);

async function __zsMirrorSystemE2EEvent(data) {
  const endpoint = ${JSON.stringify(systemE2EEventUrl)};
  if (!endpoint) {
    return;
  }
  const mirrored = await Zotero.HTTP.request("POST", endpoint, {
    body: JSON.stringify(data),
  });
  if (mirrored.status !== 200) {
    throw new Error("System E2E event sink rejected reporter event");
  }
}

async function sendBlocking(data) {
  const req = await Zotero.HTTP.request(
    "POST",
    "http://localhost:${port}/update",
    {
      body: JSON.stringify(data),
    }
  );

  await __zsMirrorSystemE2EEvent(data);

  if (req.status !== 200) {
    dump("Error sending data to server" + req.responseText);
    return null;
  }
  return JSON.parse(req.responseText);
}

function send(data) {
  return sendBlocking(data);
}

const __zsProgressEventQueue = [];
let __zsProgressDrainActive = false;

async function __zsDrainProgressEvents() {
  if (__zsProgressDrainActive) {
    return;
  }
  __zsProgressDrainActive = true;
  try {
    while (__zsProgressEventQueue.length > 0) {
      const payload = __zsProgressEventQueue.shift();
      try {
        await sendBlocking(payload);
      } catch (_error) {
        // swallow non-critical progress reporter failures
      }
    }
  } finally {
    __zsProgressDrainActive = false;
    if (__zsProgressEventQueue.length > 0) {
      void __zsDrainProgressEvents();
    }
  }
}

function __zsScheduleProgressEvent(data) {
  __zsProgressEventQueue.push(data);
  if (!__zsProgressDrainActive) {
    void __zsDrainProgressEvents();
  }
}`);
}

function buildDiagnosticBridgeBlock() {
  return escapeInlineScriptForXml(`${DEBUG_ANCHOR}

// ${DIAGNOSTIC_MARKER}
let __zsMochaOutputNode = null;

function __zsSafeStringify(value) {
  try {
    return JSON.stringify(value);
  } catch (_error) {
    return String(value);
  }
}

function __zsEnsureMochaOutputNode() {
  if (__zsMochaOutputNode) {
    return __zsMochaOutputNode;
  }
  const container = document.querySelector("#mocha");
  if (!container) {
    return null;
  }
  __zsMochaOutputNode = document.createTextNode("");
  container.appendChild(__zsMochaOutputNode);
  return __zsMochaOutputNode;
}

function __zsAppendMochaOutput(str) {
  const node = __zsEnsureMochaOutputNode();
  if (!node) {
    return;
  }
  node.appendData(String(str || ""));
}

function __zsSerializeError(error) {
  if (!error) {
    return { name: "Error", message: "Unknown error" };
  }
  return {
    name: String(error.name || "Error"),
    message: String(error.message || error),
    stack: typeof error.stack === "string" ? error.stack : undefined,
    expected: error.expected,
    actual: error.actual,
    showDiff: Boolean(error.showDiff),
  };
}

function __zsEmitRunnerDebug(data) {
  try {
    window.debug(data);
  } catch (_error) {
    // ignore reporter bridge failures
  }
}

if (!window.__zsConsoleErrorPatched) {
  window.__zsConsoleErrorPatched = true;
  const __zsOriginalConsoleError =
    typeof console.error === "function"
      ? console.error.bind(console)
      : null;
  console.error = function (...args) {
    if (__zsOriginalConsoleError) {
      __zsOriginalConsoleError(...args);
    }
    __zsEmitRunnerDebug({
      kind: "zotero-test-console-error",
      message: args
        .map((part) => {
          if (part instanceof Error) {
            return part.stack || part.message || String(part);
          }
          return typeof part === "string" ? part : __zsSafeStringify(part);
        })
        .join(" "),
    });
  };
}

if (!window.__zsGlobalErrorBridgeInstalled) {
  window.__zsGlobalErrorBridgeInstalled = true;
  const __zsPreviousOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    __zsEmitRunnerDebug({
      kind: "zotero-test-window-error",
      message: String(message || "Unhandled window error"),
      source: source ? String(source) : undefined,
      lineno: typeof lineno === "number" ? lineno : undefined,
      colno: typeof colno === "number" ? colno : undefined,
      error: __zsSerializeError(error),
    });
    if (typeof __zsPreviousOnError === "function") {
      return __zsPreviousOnError.call(
        this,
        message,
        source,
        lineno,
        colno,
        error,
      );
    }
    return false;
  };
  const __zsPreviousUnhandledRejection = window.onunhandledrejection;
  window.onunhandledrejection = function (event) {
    __zsEmitRunnerDebug({
      kind: "zotero-test-unhandled-rejection",
      reason:
        event && event.reason instanceof Error
          ? __zsSerializeError(event.reason)
          : String(event && event.reason),
    });
    if (typeof __zsPreviousUnhandledRejection === "function") {
      return __zsPreviousUnhandledRejection.call(this, event);
    }
    return false;
  };
}`);
}

function buildFailDebugBlock() {
  return escapeInlineScriptForXml(`    await sendBlocking({
      type: "debug",
      data: {
        kind: "zotero-test-fail-detail",
        title: test.title,
        fullTitle: test.fullTitle(),
        message: String(error && error.message ? error.message : error),
        name: String((error && error.name) || "Error"),
        stack:
          error && typeof error.stack === "string" ? error.stack : undefined,
        expected: error ? error.expected : undefined,
        actual: error ? error.actual : undefined,
        showDiff: Boolean(error && error.showDiff),
      },
    });
    await sendBlocking({ type: "fail", data: { title: test.title, fulltest: test.fullTitle(), duration: test.duration, error, indents: indents + 1 } });`);
}

function resolvePortFromHtml(html: string) {
  const matched = html.match(/http:\/\/localhost:(\d+)\/update/);
  if (!matched?.[1]) {
    throw new Error(
      "Failed to patch Zotero test runner: reporter port anchor not found",
    );
  }
  return matched[1];
}

function requireAnchor(html: string, anchor: string, message: string) {
  if (!html.includes(anchor)) {
    throw new Error(message);
  }
}

export function patchZoteroTestRunnerHtml(
  html: string,
  options: { systemE2EEventUrl?: string } = {},
) {
  if (html.includes(DIAGNOSTIC_MARKER)) {
    return html;
  }
  const port = resolvePortFromHtml(html);
  const systemE2EEventUrl = normalizeSystemE2EEventUrl(
    options.systemE2EEventUrl,
  );
  const sendAnchor = SEND_FUNCTION_ANCHOR.replace("__PORT__", port);

  requireAnchor(
    html,
    sendAnchor,
    "Failed to patch Zotero test runner: send function anchor not found",
  );
  requireAnchor(
    html,
    MOCHA_CONTAINER_ANCHOR,
    "Failed to patch Zotero test runner: mocha output container anchor not found",
  );
  requireAnchor(
    html,
    DEBUG_ANCHOR,
    "Failed to patch Zotero test runner: debug bridge anchor not found",
  );
  requireAnchor(
    html,
    DUMP_LINE_ANCHOR,
    "Failed to patch Zotero test runner: dump output anchor not found",
  );
  requireAnchor(
    html,
    FAIL_SEND_ANCHOR,
    "Failed to patch Zotero test runner: fail reporter anchor not found",
  );

  return html
    .replace(MOCHA_CONTAINER_ANCHOR, MOCHA_CONTAINER_PATCH)
    .replace(sendAnchor, buildTransportBlock(port, systemE2EEventUrl))
    .replace(DEBUG_ANCHOR, buildDiagnosticBridgeBlock())
    .replace(DUMP_LINE_ANCHOR, `    __zsAppendMochaOutput(str);`)
    .replaceAll(`${START_LOG_ANCHOR}\n`, "")
    .replaceAll(`${SUITE_LOG_ANCHOR}\n`, "")
    .replaceAll(`${SUITE_END_LOG_ANCHOR}\n`, "")
    .replaceAll(`${PENDING_LOG_ANCHOR}\n`, "")
    .replaceAll(`${PASS_LOG_ANCHOR}\n`, "")
    .replaceAll(`${FAIL_LOG_ANCHOR}\n`, "")
    .replaceAll(`${END_LOG_ANCHOR}\n`, "")
    .replace(
      START_SEND_ANCHOR,
      `    __zsScheduleProgressEvent({ type: "start", data: { indents } });`,
    )
    .replace(
      SUITE_SEND_ANCHOR,
      `    __zsScheduleProgressEvent({ type: "suite", data: { title: suite.title, root: suite.root, indents } });`,
    )
    .replace(
      SUITE_END_SEND_ANCHOR,
      `    __zsScheduleProgressEvent({ type: "suite end", data: { title: suite.title, root: suite.root, indents } });`,
    )
    .replace(
      PENDING_SEND_ANCHOR,
      `    __zsScheduleProgressEvent({ type: "pending", data: { title: test.title, fulltest: test.fullTitle(), duration: test.duration, indents: indents + 1 } });`,
    )
    .replace(
      PASS_SEND_ANCHOR,
      `    __zsScheduleProgressEvent({ type: "pass", data: { title: test.title, fulltest: test.fullTitle(), duration: test.duration, indents: indents + 1 } });`,
    )
    .replace(FAIL_SEND_ANCHOR, buildFailDebugBlock())
    .replace(
      END_SEND_ANCHOR,
      `    await sendBlocking({
      type: "end",
      data: { passed: passed, failed: failed, aborted: aborted, str, indents },
    });`,
    );
}

export function resolveGeneratedZoteroTestRunnerPath(rootDir = process.cwd()) {
  return path.join(
    rootDir,
    ".scaffold",
    "test",
    "resource",
    "content",
    "index.xhtml",
  );
}

export async function patchGeneratedZoteroTestRunner(rootDir = process.cwd()) {
  const runnerPath = resolveGeneratedZoteroTestRunnerPath(rootDir);
  const original = await readFile(runnerPath, "utf8");
  const patched = patchZoteroTestRunnerHtml(original, {
    systemE2EEventUrl: process.env.ZOTERO_SYSTEM_E2E_EVENT_URL,
  });
  if (patched !== original) {
    await writeFile(runnerPath, patched, "utf8");
  }
  return runnerPath;
}
