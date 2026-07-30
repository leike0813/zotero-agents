import {
  ASSISTANT_WORKSPACE_ACP_CHILD_BRIDGE_KEY,
  ASSISTANT_WORKSPACE_MESSAGE_TYPES,
} from "../../src/shared/assistantWireContract";
import { ASSISTANT_WORKSPACE_ACTION_REGISTRY } from "../../src/modules/assistantWorkspacePublication";
import { createAssistantWorkspaceAcpChildRuntime } from "../../src/sidebar/assistantWorkspaceAcpChild.js";

type AssistantWorkspaceAcpChildRuntime = {
  applyPublication(publication: unknown): unknown;
};

type FakeEventListener = (event: any) => void;

export class FakeElement {
  parentNode: FakeElement | null = null;
  children: FakeElement[] = [];
  attributes = new Map<string, string>();
  className = "";
  textContent = "";
  disabled = false;
  type = "";
  value = "";
  selectionStart: number | null = 0;
  selectionEnd: number | null = 0;
  onclick: FakeEventListener | null = null;
  listeners = new Map<string, FakeEventListener[]>();
  failNextInsertBefore = false;
  scrollTop = 0;
  scrollHeight = 0;
  clientHeight = 0;
  offsetHeight = 0;
  innerHTML = "";
  style = { height: "", setProperty() {} };
  classList = {
    add: (...names: string[]) => {
      const values = new Set(this.className.split(/\s+/).filter(Boolean));
      names.forEach((name) => values.add(name));
      this.className = [...values].join(" ");
    },
    remove: (...names: string[]) => {
      const values = new Set(this.className.split(/\s+/).filter(Boolean));
      names.forEach((name) => values.delete(name));
      this.className = [...values].join(" ");
    },
    toggle: (name: string, force?: boolean) => {
      const values = new Set(this.className.split(/\s+/).filter(Boolean));
      const enabled = typeof force === "boolean" ? force : !values.has(name);
      if (enabled) values.add(name);
      else values.delete(name);
      this.className = [...values].join(" ");
    },
    contains: (name: string) => this.className.split(/\s+/).includes(name),
  };

  constructor(
    public readonly tagName: string,
    public readonly ownerDocument: FakeDocument,
  ) {}

  get firstChild() {
    return this.children[0] || null;
  }

  get firstElementChild() {
    return this.firstChild;
  }

  get parentElement() {
    return this.parentNode;
  }

  appendChild(child: FakeElement) {
    this.detach(child);
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  insertBefore(child: FakeElement, before: FakeElement | null) {
    if (this.failNextInsertBefore) {
      this.failNextInsertBefore = false;
      throw new Error("synthetic-dom-failure");
    }
    if (child === before) return child;
    this.detach(child);
    child.parentNode = this;
    const index = before ? this.children.indexOf(before) : -1;
    if (index < 0) this.children.push(child);
    else this.children.splice(index, 0, child);
    return child;
  }

  replaceChild(next: FakeElement, previous: FakeElement) {
    const index = this.children.indexOf(previous);
    if (index < 0) return previous;
    this.detach(next);
    next.parentNode = this;
    previous.parentNode = null;
    this.children[index] = next;
    return previous;
  }

  removeChild(child: FakeElement) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    child.parentNode = null;
    return child;
  }

  remove() {
    this.parentNode?.removeChild(this);
  }

  private detach(child: FakeElement) {
    if (child.parentNode) child.parentNode.removeChild(child);
  }

  setAttribute(name: string, value: string) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name: string) {
    return this.attributes.has(name) ? this.attributes.get(name) || "" : null;
  }

  removeAttribute(name: string) {
    this.attributes.delete(name);
  }

  getBoundingClientRect() {
    return {
      height:
        this.offsetHeight ||
        (this.classList.contains("assistant-transcript-row")
          ? this.ownerDocument.transcriptRowHeight
          : 0),
    };
  }

  addEventListener(type: string, listener: FakeEventListener) {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  dispatchEvent(event: any) {
    event.target ||= this;
    for (const listener of this.listeners.get(String(event.type || "")) || []) {
      listener(event);
    }
    return true;
  }

  click() {
    if (this.disabled) return;
    const event = {
      type: "click",
      target: this,
      preventDefault() {},
      stopPropagation() {},
    };
    this.onclick?.(event);
    this.dispatchEvent(event);
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }

  setSelectionRange(start: number, end: number) {
    this.selectionStart = start;
    this.selectionEnd = end;
  }

  contains(node: FakeElement): boolean {
    return node === this || this.children.some((child) => child.contains(node));
  }

  querySelector(selector: string) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector: string) {
    const directClass = /^:scope > \.([A-Za-z0-9_-]+)$/.exec(selector);
    if (directClass) {
      return this.children.filter((child) =>
        child.classList.contains(directClass[1]),
      );
    }
    const className = /^\.([A-Za-z0-9_-]+)$/.exec(selector);
    if (className) {
      return this.descendants().filter((child) =>
        child.classList.contains(className[1]),
      );
    }
    const attributeValue = /^\[([A-Za-z0-9_-]+)=["']([^"']+)["']\]$/.exec(
      selector,
    );
    if (attributeValue) {
      return this.descendants().filter(
        (child) => child.getAttribute(attributeValue[1]) === attributeValue[2],
      );
    }
    const attribute = /^\[([A-Za-z0-9_-]+)\]$/.exec(selector);
    if (attribute) {
      return this.descendants().filter(
        (child) => child.getAttribute(attribute[1]) !== null,
      );
    }
    return [];
  }

  private descendants(): FakeElement[] {
    return this.children.flatMap((child) => [child, ...child.descendants()]);
  }
}

export class FakeDocument {
  activeElement: FakeElement | null = null;
  transcriptRowHeight = 0;
  title = "";
  readyState = "complete";
  documentElement = new FakeElement("HTML", this);
  body = new FakeElement("BODY", this);

  constructor() {
    this.documentElement.appendChild(this.body);
  }

  createElement(tagName: string) {
    return new FakeElement(tagName.toUpperCase(), this);
  }

  createElementNS(_namespace: string, tagName: string) {
    return this.createElement(tagName);
  }

  querySelector(selector: string) {
    if (selector === "body") return this.body;
    return this.documentElement.querySelector(selector);
  }

  querySelectorAll(selector: string) {
    return this.documentElement.querySelectorAll(selector);
  }

  addEventListener(_type: string, _listener: FakeEventListener) {
    return;
  }
}

let rendererGlobalDescriptors:
  | Partial<Record<"document" | "window", PropertyDescriptor | undefined>>
  | undefined;

export function installAssistantWorkspaceRendererGlobals(
  document: FakeDocument,
  windowValue: Record<string, unknown> = {},
) {
  const runtime = globalThis as Record<string, unknown>;
  if (!rendererGlobalDescriptors) {
    rendererGlobalDescriptors = {
      document: Object.getOwnPropertyDescriptor(runtime, "document"),
      window: Object.getOwnPropertyDescriptor(runtime, "window"),
    };
  }
  runtime.document = document;
  runtime.window = {
    requestAnimationFrame(callback: () => void) {
      callback();
      return 0;
    },
    ...windowValue,
  };
}

export function restoreAssistantWorkspaceRendererGlobals() {
  if (!rendererGlobalDescriptors) return;
  const runtime = globalThis as Record<string, unknown>;
  for (const key of ["document", "window"] as const) {
    const descriptor = rendererGlobalDescriptors[key];
    if (descriptor) {
      Object.defineProperty(runtime, key, descriptor);
    } else {
      delete runtime[key];
    }
  }
  rendererGlobalDescriptors = undefined;
}

function appendRole(document: FakeDocument, role: string) {
  const element = document.createElement("div");
  element.setAttribute("data-role", role);
  document.body.appendChild(element);
  return element;
}

export function createAssistantWorkspaceAcpChildHarness(
  source: "acp-chat" | "acp-skills",
) {
  const document = new FakeDocument();
  document.body.setAttribute("data-source", source);
  for (const role of [
    "root",
    "toolbar",
    "banner",
    "message-counts",
    "context-drawer",
    "empty",
    "main",
    "conversation",
    "transcript",
    "plan",
    "interaction",
    "composer",
    "details-drawer",
  ]) {
    appendRole(document, role);
  }
  const actions: Record<string, unknown>[] = [];
  const messageListeners: FakeEventListener[] = [];
  const windowValue = {
    addEventListener(type: string, listener: FakeEventListener) {
      if (type === "message") messageListeners.push(listener);
    },
    [ASSISTANT_WORKSPACE_ACP_CHILD_BRIDGE_KEY]: {
      sendAction(envelope: Record<string, unknown>) {
        actions.push(structuredClone(envelope));
      },
    },
  };
  installAssistantWorkspaceRendererGlobals(document, windowValue);
  const runtime = createAssistantWorkspaceAcpChildRuntime(source);
  if (!runtime) {
    throw new Error(
      `ACP child runtime failed: ${document.body.getAttribute(
        "data-acp-child-failure",
      )}`,
    );
  }
  for (const listener of messageListeners) {
    listener({
      data: {
        type: ASSISTANT_WORKSPACE_MESSAGE_TYPES.SURFACE_BOOTSTRAP,
        payload: {
          configuration: {
            executionDisplayMode: "live",
            transcriptPaginationVirtualizationEnabled: true,
            actionRegistry: ASSISTANT_WORKSPACE_ACTION_REGISTRY,
          },
          labels: {},
        },
      },
    });
  }
  return {
    document,
    runtime: runtime as AssistantWorkspaceAcpChildRuntime,
    actions,
    replyInput() {
      return document.querySelector(".assistant-panel-reply-input");
    },
    replyButton() {
      return document.querySelector(".assistant-panel-reply-submit");
    },
    dispose: restoreAssistantWorkspaceRendererGlobals,
  };
}
