import { resolveRuntimeHostCapabilities } from "../utils/runtimeBridge";
import { createWorkflowHostError } from "./workflowHostErrorContract";
import type {
  WorkflowCallControl,
  WorkflowClipboardOwner,
} from "./types";

const DEFAULT_MAX_TEXT_BYTES = 16 * 1024 * 1024;

export type WorkflowClipboardAdapter = Readonly<{
  readText(): Promise<string | null>;
  writeText(text: string): Promise<void>;
  hasText(): Promise<boolean>;
  clear(): Promise<void>;
}>;

function canceled() {
  return createWorkflowHostError("canceled", "Clipboard operation canceled", {
    reason: "caller_signal",
  });
}

function unavailable() {
  return createWorkflowHostError(
    "unavailable",
    "Clipboard adapter is unavailable",
    { reason: "adapter" },
    { retryable: true },
  );
}

function interactionRequired(
  member:
    | "clipboard.readText"
    | "clipboard.writeText"
    | "clipboard.hasText"
    | "clipboard.clear",
) {
  return createWorkflowHostError(
    "interaction_required",
    `${member} requires an interactive Workflow Host`,
    { member },
  );
}

function utf8Bytes(text: string) {
  return new TextEncoder().encode(text).byteLength;
}

function requireWithinLimit(text: string, limit: number) {
  const observed = utf8Bytes(text);
  if (observed > limit) {
    throw createWorkflowHostError(
      "resource_limited",
      "Clipboard text exceeds the byte limit",
      { resource: "bytes", limit, observed },
    );
  }
}

async function guarded<T>(
  control: WorkflowCallControl | undefined,
  operation: () => Promise<T>,
) {
  if (control?.signal?.aborted) throw canceled();
  try {
    const result = await operation();
    if (control?.signal?.aborted) throw canceled();
    return result;
  } catch (error) {
    if ((error as { code?: string })?.code) throw error;
    throw unavailable();
  }
}

export function createMemoryWorkflowClipboardAdapter(
  initial?: string | null,
): WorkflowClipboardAdapter {
  let present = initial !== undefined && initial !== null;
  let text = present ? initial! : "";
  return {
    async readText() {
      return present ? text : null;
    },
    async writeText(value) {
      present = true;
      text = value;
    },
    async hasText() {
      return present;
    },
    async clear() {
      present = false;
      text = "";
    },
  };
}

function resolveGeckoClipboardAdapter(): WorkflowClipboardAdapter | null {
  const components = (globalThis as typeof globalThis & {
    Components?: any;
  }).Components;
  const clipboard = components?.classes?.[
    "@mozilla.org/widget/clipboard;1"
  ]?.getService?.(components.interfaces?.nsIClipboard);
  const transferableFactory = components?.classes?.[
    "@mozilla.org/widget/transferable;1"
  ];
  if (!clipboard || !transferableFactory) return null;
  const which = clipboard.kGlobalClipboard;
  const flavor = "text/unicode";
  const hasText = () =>
    Boolean(clipboard.hasDataMatchingFlavors([flavor], 1, which));
  return {
    async hasText() {
      return hasText();
    },
    async readText() {
      if (!hasText()) return null;
      const transferable = transferableFactory.createInstance(
        components.interfaces.nsITransferable,
      );
      transferable.init?.(null);
      transferable.addDataFlavor(flavor);
      clipboard.getData(transferable, which);
      const value = transferable.getTransferData(flavor);
      const data = Array.isArray(value) ? value[0] : value?.value ?? value;
      return String(
        data?.QueryInterface?.(components.interfaces.nsISupportsString)?.data ??
          data?.data ??
          "",
      );
    },
    async writeText(text) {
      const helper = components.classes?.[
        "@mozilla.org/widget/clipboardhelper;1"
      ]?.getService?.(components.interfaces.nsIClipboardHelper);
      if (!helper?.copyString) throw unavailable();
      helper.copyString(text);
    },
    async clear() {
      clipboard.emptyClipboard(which);
    },
  };
}

function resolveNavigatorClipboardAdapter(): WorkflowClipboardAdapter | null {
  const clipboard = resolveRuntimeHostCapabilities().navigator?.clipboard as
    | (Clipboard & {
        read?: () => Promise<ClipboardItem[]>;
        write?: (items: ClipboardItem[]) => Promise<void>;
      })
    | undefined;
  if (!clipboard?.read || !clipboard.write || !clipboard.writeText) return null;
  const readTextItem = async () => {
    const items = await clipboard.read!();
    const item = items.find((candidate) => candidate.types.includes("text/plain"));
    return item ? (await item.getType("text/plain")).text() : null;
  };
  return {
    readText: readTextItem,
    async writeText(text) {
      await clipboard.writeText(text);
    },
    async hasText() {
      return (await readTextItem()) !== null;
    },
    async clear() {
      await clipboard.write!([]);
    },
  };
}

function resolveRuntimeClipboardAdapter() {
  return resolveGeckoClipboardAdapter() || resolveNavigatorClipboardAdapter();
}

export function createWorkflowClipboardOwner(args: {
  interactionMode: "interactive" | "non_interactive";
  resolveAdapter?: () => WorkflowClipboardAdapter | null | undefined;
  maxTextBytes?: number;
}): WorkflowClipboardOwner {
  const resolveAdapter = args.resolveAdapter || resolveRuntimeClipboardAdapter;
  const limit = args.maxTextBytes ?? DEFAULT_MAX_TEXT_BYTES;
  const call = <T>(
    member:
      | "clipboard.readText"
      | "clipboard.writeText"
      | "clipboard.hasText"
      | "clipboard.clear",
    control: WorkflowCallControl | undefined,
    operation: (adapter: WorkflowClipboardAdapter) => Promise<T>,
  ) => {
    if (args.interactionMode !== "interactive") {
      return Promise.reject(interactionRequired(member));
    }
    return guarded(control, async () => {
      const adapter = resolveAdapter();
      if (!adapter) throw unavailable();
      return operation(adapter);
    });
  };
  return {
    readText: (control) =>
      call("clipboard.readText", control, async (adapter) => {
        const text = await adapter.readText();
        if (text !== null) requireWithinLimit(text, limit);
        return text;
      }),
    writeText: (text, control) => {
      if (typeof text !== "string") {
        return Promise.reject(
          createWorkflowHostError(
            "invalid_request",
            "Clipboard text must be a string",
            { reason: "invalid_type", field: "text" },
          ),
        );
      }
      try {
        requireWithinLimit(text, limit);
      } catch (error) {
        return Promise.reject(error);
      }
      return call("clipboard.writeText", control, (adapter) =>
        adapter.writeText(text),
      );
    },
    hasText: (control) =>
      call("clipboard.hasText", control, (adapter) => adapter.hasText()),
    clear: (control) =>
      call("clipboard.clear", control, (adapter) => adapter.clear()),
  };
}
