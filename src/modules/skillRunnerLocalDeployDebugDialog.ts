import type { DialogHelper } from "zotero-plugin-toolkit";
import { getString } from "../utils/locale";
import { resolveToolkitMember } from "../utils/runtimeBridge";
import { isWindowAlive } from "../utils/window";
import {
  listSkillRunnerLocalDeployDebugLogs,
  subscribeSkillRunnerLocalDeployDebugLogs,
  type SkillRunnerLocalDeployDebugEntry,
} from "./skillRunnerLocalDeployDebugStore";

const HTML_NS = "http://www.w3.org/1999/xhtml";
type DialogCtor = new (rows: number, columns: number) => DialogHelper;

let deployDebugDialog: DialogHelper | undefined;

function createHtmlElement<K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
) {
  return doc.createElementNS(HTML_NS, tag) as HTMLElementTagNameMap[K];
}

function clearChildren(node: Element) {
  while (node.firstChild) {
    node.removeChild(node.firstChild);
  }
}

function formatTimestamp(value: string) {
  return String(value || "")
    .replace("T", " ")
    .replace("Z", "");
}

function formatDetails(entry: SkillRunnerLocalDeployDebugEntry) {
  const details = entry.details as
    | {
        streamChunk?: unknown;
        stream?: unknown;
      }
    | undefined;
  const chunk = String(details?.streamChunk || "");
  if (chunk) {
    return chunk;
  }
  const errorLike = entry.error as
    | { name?: unknown; message?: unknown }
    | undefined;
  if (String(errorLike?.message || "").trim()) {
    return `ERROR: ${String(errorLike?.name || "Error")}: ${String(errorLike?.message || "")}`;
  }
  if (typeof entry.details === "undefined") {
    return "";
  }
  try {
    return JSON.stringify(entry.details, null, 2);
  } catch {
    return String(entry.details || "");
  }
}

function formatEntry(entry: SkillRunnerLocalDeployDebugEntry) {
  const operation = String(entry.operation || entry.stage || "unknown").trim();
  const header = `[${formatTimestamp(entry.ts)}] [${entry.level.toUpperCase()}] [${operation}] ${entry.message}`;
  const detailsText = formatDetails(entry);
  if (!detailsText) {
    return header;
  }
  return `${header}\n${detailsText}`;
}

function copyTextToClipboard(text: string) {
  const runtime = globalThis as {
    Zotero?: {
      Utilities?: {
        Internal?: {
          copyTextToClipboard?: (value: string) => void;
        };
      };
    };
  };
  const copyFn = runtime.Zotero?.Utilities?.Internal?.copyTextToClipboard;
  if (typeof copyFn === "function") {
    copyFn(text);
    return;
  }
  throw new Error("clipboard unavailable");
}

function listDeployDebugEntries() {
  return listSkillRunnerLocalDeployDebugLogs();
}

function buildConsoleText() {
  const entries = listDeployDebugEntries();
  if (entries.length === 0) {
    return getString("pref-skillrunner-local-debug-console-empty" as any);
  }
  return entries.map((entry) => formatEntry(entry)).join("\n\n");
}

export async function openSkillRunnerLocalDeployDebugDialog() {
  if (isWindowAlive(deployDebugDialog?.window)) {
    deployDebugDialog?.window?.focus();
    return;
  }
  const Dialog = resolveToolkitMember<DialogCtor>("Dialog");
  if (!Dialog) {
    throw new Error("debug console dialog is unavailable");
  }

  let unsubscribe: (() => void) | undefined;
  const dialogData: Record<string, unknown> = {
    loadCallback: () => {
      const doc = deployDebugDialog?.window?.document;
      if (!doc) {
        return;
      }
      const root = doc.getElementById(
        "zs-local-deploy-debug-root",
      ) as HTMLElement | null;
      if (!root) {
        return;
      }
      clearChildren(root);
      root.style.display = "flex";
      root.style.flexDirection = "column";
      root.style.width = "100%";
      root.style.height = "100%";
      root.style.minWidth = "1000px";
      root.style.minHeight = "700px";
      root.style.boxSizing = "border-box";
      root.style.padding = "8px";
      root.style.gap = "8px";

      const win = doc.defaultView;
      if (win) {
        try {
          win.resizeTo(1100, 760);
        } catch {
          // ignore window resize failures
        }
      }

      const toolbar = createHtmlElement(doc, "div");
      toolbar.style.display = "flex";
      toolbar.style.alignItems = "center";
      toolbar.style.gap = "8px";
      root.appendChild(toolbar);

      const title = createHtmlElement(doc, "strong");
      title.textContent = getString(
        "pref-skillrunner-local-debug-console-title" as any,
      );
      toolbar.appendChild(title);

      const copyButton = createHtmlElement(doc, "button");
      copyButton.type = "button";
      copyButton.textContent = getString(
        "pref-skillrunner-local-debug-console-copy" as any,
      );
      toolbar.appendChild(copyButton);

      const status = createHtmlElement(doc, "span");
      status.style.fontSize = "12px";
      status.style.color = "#166534";
      toolbar.appendChild(status);

      const output = createHtmlElement(doc, "textarea");
      output.readOnly = true;
      output.style.width = "100%";
      output.style.flex = "1";
      output.style.minHeight = "0";
      output.style.resize = "none";
      output.style.fontFamily = "ui-monospace, Consolas, monospace";
      output.style.fontSize = "12px";
      output.style.lineHeight = "1.45";
      output.style.whiteSpace = "pre";
      output.style.wordBreak = "break-word";
      root.appendChild(output);

      const setStatus = (message: string, isError = false) => {
        status.textContent = message;
        status.style.color = isError ? "#b91c1c" : "#166534";
      };

      const render = () => {
        const nearBottom =
          output.scrollTop + output.clientHeight >= output.scrollHeight - 24;
        output.value = buildConsoleText();
        if (nearBottom) {
          output.scrollTop = output.scrollHeight;
        }
      };

      copyButton.addEventListener("click", () => {
        try {
          copyTextToClipboard(output.value || "");
          setStatus(
            getString(
              "pref-skillrunner-local-debug-console-copy-success" as any,
            ),
          );
        } catch (error) {
          setStatus(
            getString(
              "pref-skillrunner-local-debug-console-copy-failed" as any,
              {
                args: { error: String(error) },
              },
            ),
            true,
          );
        }
      });

      render();
      unsubscribe = subscribeSkillRunnerLocalDeployDebugLogs(() => {
        render();
      });
    },
    unloadCallback: () => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = undefined;
      }
    },
  };

  deployDebugDialog = new Dialog(1, 1)
    .addCell(0, 0, {
      tag: "div",
      namespace: "html",
      id: "zs-local-deploy-debug-root",
      styles: {
        width: "100%",
        height: "100%",
      },
    })
    .addButton(getString("log-viewer-close" as any), "close")
    .setDialogData(dialogData)
    .open(getString("pref-skillrunner-local-debug-console-title" as any));
  const unloadPromise = (
    dialogData as { unloadLock?: { promise?: Promise<void> } }
  ).unloadLock?.promise;
  if (unloadPromise) {
    void unloadPromise.finally(() => {
      deployDebugDialog = undefined;
    });
  }
}
