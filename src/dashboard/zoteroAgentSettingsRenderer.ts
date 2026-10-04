// Chrome renderer for the Zotero Agent settings window.
//
// addon/content/dashboard/zotero-agent-settings.html ships four fixed
// containers. This renderer adopts them once and mounts each region's Preact
// tree in place, so re-rendering one region never clears or rebuilds a sibling.
// Regions memoize on their own selection signature, so an action result for one
// object leaves every other region's DOM, focus and selection untouched.

import { h, render } from "preact";

import type {
  ZoteroAgentSettingsHandlers,
  ZoteroAgentSettingsView,
} from "./components/ZoteroAgentSettingsView";
import {
  DialogHostRegion,
  NavRegion,
  PageHost,
  StatusRegion,
} from "./components/ZoteroAgentSettingsShell";

export type ZoteroAgentSettingsRendererDeps = {
  root?: HTMLElement | null;
  handlers: ZoteroAgentSettingsHandlers;
};

export function createZoteroAgentSettingsRenderer(
  deps: ZoteroAgentSettingsRendererDeps,
) {
  function resolveRoot(): HTMLElement | null {
    return (
      deps.root ??
      (typeof document === "undefined"
        ? null
        : document.getElementById("zs-agent-settings-root"))
    );
  }

  function renderView(view: ZoteroAgentSettingsView): void {
    const root = resolveRoot();
    if (!root) return;
    const nav = root.querySelector("[data-zs-region='nav']");
    const page = root.querySelector("[data-zs-region='page']");
    const status = root.querySelector("[data-zs-region='status']");
    const dialog = root.querySelector("[data-zs-region='dialog']");
    if (nav) {
      render(
        h(NavRegion, { selection: view.nav, handlers: deps.handlers }),
        nav,
      );
    }
    if (page) {
      render(h(PageHost, { view, handlers: deps.handlers }), page);
    }
    if (status) {
      render(h(StatusRegion, { selection: view.status }), status);
    }
    if (dialog) {
      render(h(DialogHostRegion, { view, handlers: deps.handlers }), dialog);
    }
  }

  function dispose(): void {
    const root = resolveRoot();
    if (!root) return;
    root
      .querySelectorAll("[data-zs-region]")
      .forEach((node) => render(null, node as HTMLElement));
  }

  return { renderView, dispose };
}
