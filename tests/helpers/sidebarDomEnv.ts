import { assert } from "chai";
import { JSDOM, type DOMWindow } from "jsdom";

// Shared jsdom-backed DOM environment for sidebar renderer tests.
//
// Mocha runs every suite in a single process. The sidebar renderer modules
// (src/sidebar/assistant*.js) read the bare `document` global at render time
// and `window.requestAnimationFrame` when scheduling frame work, so each
// test installs a jsdom document/window pair as the renderer globals and the
// suite-level after hook restores the previous global state so nothing leaks
// into other suites. Tests that need to control frame timing inject their
// own requestAnimationFrame; the default shim runs callbacks synchronously.

export interface SidebarDomEnvironment {
  dom: JSDOM;
  window: DOMWindow;
  document: Document;
}

export type SidebarAnimationFrameRequest = (callback: () => void) => number;

export function createSidebarDomEnvironment(): SidebarDomEnvironment {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  return { dom, window: dom.window, document: dom.window.document };
}

let rendererGlobalDescriptors:
  | Partial<Record<"document" | "window", PropertyDescriptor | undefined>>
  | undefined;

export function installSidebarDomGlobals(
  environment: SidebarDomEnvironment,
  requestAnimationFrame: SidebarAnimationFrameRequest = (callback) => {
    callback();
    return 0;
  },
) {
  const runtime = globalThis as Record<string, unknown>;
  if (!rendererGlobalDescriptors) {
    rendererGlobalDescriptors = {
      document: Object.getOwnPropertyDescriptor(runtime, "document"),
      window: Object.getOwnPropertyDescriptor(runtime, "window"),
    };
  }
  const frameWindow = environment.window as unknown as {
    requestAnimationFrame: SidebarAnimationFrameRequest;
    cancelAnimationFrame: (id: number) => void;
  };
  frameWindow.requestAnimationFrame = requestAnimationFrame;
  frameWindow.cancelAnimationFrame = () => {};
  runtime.document = environment.document;
  runtime.window = environment.window;
}

export function restoreSidebarDomGlobals() {
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

// Region mounts are reused permanently, so mount-level identity alone cannot
// catch a guard miss that rebuilds the mount's content. Capture the full
// subtree node list and compare element-wise by reference. The walk follows
// childNodes so text nodes are covered too: real DOM (and Preact) materialize
// textContent/innerHTML as Text children whose identity is just as
// significant as element identity.
export function subtreeNodes(node: Node | null): Node[] {
  if (!node) return [];
  const nodes: Node[] = [node];
  node.childNodes.forEach((child) => {
    nodes.push(...subtreeNodes(child));
  });
  return nodes;
}

export function captureRegionSubtrees(
  regions: Record<string, Node>,
): Record<string, Node[]> {
  return Object.fromEntries(
    Object.entries(regions).map(([key, region]) => [
      key,
      subtreeNodes(region.firstChild),
    ]),
  );
}

export function assertRegionSubtreesPreserved(
  regions: Record<string, Node>,
  captured: Record<string, Node[]>,
) {
  for (const [key, region] of Object.entries(regions)) {
    const current = subtreeNodes(region.firstChild);
    const previous = captured[key] || [];
    assert.equal(
      current.length,
      previous.length,
      `${key} subtree node count changed`,
    );
    current.forEach((node, index) => {
      assert.strictEqual(
        node,
        previous[index],
        `${key} subtree node #${index} was rebuilt`,
      );
    });
  }
}
