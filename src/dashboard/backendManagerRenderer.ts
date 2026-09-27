// Chrome renderer factory for the Backend Manager dialog page, mirroring
// src/dashboard/dashboardChromeRenderer.ts: each region renders through its
// own Preact root inside a managed mount, so re-rendering one region never
// clears or rebuilds sibling regions.
//
// Page skeleton: addon/content/dashboard/backend-manager.html ships the
// #backend-manager-root flex container; this renderer adopts it and creates
// five managed mounts (header / body / footer / the two preset dialogs). The
// mounts use display:contents (see backend-manager.css) so the region root
// elements keep their legacy position in the root's flex layout.
//
// Scroll: the legacy implementation preserved per-provider scroll offsets
// across full DOM rebuilds. The body region's scroll container now persists
// across re-renders, so scroll survives in place; the renderer only restores
// a remembered offset when the controller asks for it (provider switch).

import { h, render } from "preact";

import { ensureRegionMount } from "../shared/preactRegionMount";
import {
  BackendManagerAcpPresetDialogRegion,
  BackendManagerBodyRegion,
  BackendManagerFooterRegion,
  BackendManagerGenericHttpPresetDialogRegion,
  BackendManagerHeaderRegion,
  type BackendManagerRegionHandlers,
  type BackendManagerView,
} from "./components/BackendManagerRegion";

export type BackendManagerRenderOptions = {
  // Restore the body scroll offset after this render (provider switch).
  restoreBodyScrollTop?: number;
};

export type BackendManagerRendererDeps = {
  // Page root; defaults to document.getElementById("backend-manager-root").
  root?: HTMLElement | null;
  handlers: BackendManagerRegionHandlers;
};

export function createBackendManagerRenderer(deps: BackendManagerRendererDeps) {
  let pendingRestoreFrame: number | null = null;

  function resolveRoot(): HTMLElement | null {
    return (
      deps.root ??
      (typeof document === "undefined"
        ? null
        : document.getElementById("backend-manager-root"))
    );
  }

  function restoreBodyScroll(root: HTMLElement, scrollTop: number): void {
    const apply = () => {
      const body = root.querySelector("[data-zs-role='backend-manager-body']");
      if (body) {
        (body as HTMLElement).scrollTop = scrollTop;
      }
    };
    const raf =
      typeof window !== "undefined" &&
      typeof window.requestAnimationFrame === "function"
        ? window.requestAnimationFrame.bind(window)
        : null;
    if (raf) {
      if (
        pendingRestoreFrame !== null &&
        typeof window.cancelAnimationFrame === "function"
      ) {
        window.cancelAnimationFrame(pendingRestoreFrame);
      }
      pendingRestoreFrame = raf(() => {
        pendingRestoreFrame = null;
        apply();
      });
    } else {
      apply();
    }
  }

  function renderView(
    view: BackendManagerView | null,
    options?: BackendManagerRenderOptions,
  ): void {
    const root = resolveRoot();
    if (!root) return;

    const headerMount = ensureRegionMount(root, "header");
    if (headerMount) {
      render(
        view
          ? h(BackendManagerHeaderRegion, {
              selection: view.header,
              handlers: deps.handlers,
            })
          : null,
        headerMount,
      );
    }

    const bodyMount = ensureRegionMount(root, "body");
    if (bodyMount) {
      render(
        view
          ? view.body
            ? h(BackendManagerBodyRegion, {
                selection: view.body,
                handlers: deps.handlers,
              })
            : null
          : h("div", { class: "backend-manager-body" }, "Loading..."),
        bodyMount,
      );
    }

    const footerMount = ensureRegionMount(root, "footer");
    if (footerMount) {
      render(
        view
          ? h(BackendManagerFooterRegion, {
              selection: view.footer,
              handlers: deps.handlers,
            })
          : null,
        footerMount,
      );
    }

    const acpDialogMount = ensureRegionMount(root, "acp-preset-dialog");
    if (acpDialogMount) {
      render(
        view && view.acpDialog
          ? h(BackendManagerAcpPresetDialogRegion, {
              selection: view.acpDialog,
              handlers: deps.handlers,
            })
          : null,
        acpDialogMount,
      );
    }

    const genericDialogMount = ensureRegionMount(
      root,
      "generic-http-preset-dialog",
    );
    if (genericDialogMount) {
      render(
        view && view.genericHttpDialog
          ? h(BackendManagerGenericHttpPresetDialogRegion, {
              selection: view.genericHttpDialog,
              handlers: deps.handlers,
            })
          : null,
        genericDialogMount,
      );
    }

    if (
      view &&
      options &&
      typeof options.restoreBodyScrollTop === "number" &&
      Number.isFinite(options.restoreBodyScrollTop)
    ) {
      restoreBodyScroll(root, options.restoreBodyScrollTop);
    }
  }

  function dispose(): void {
    if (
      pendingRestoreFrame !== null &&
      typeof window !== "undefined" &&
      typeof window.cancelAnimationFrame === "function"
    ) {
      window.cancelAnimationFrame(pendingRestoreFrame);
    }
    pendingRestoreFrame = null;
    const root = resolveRoot();
    if (!root) return;
    root
      .querySelectorAll("[data-region-mount]")
      .forEach((mount) => render(null, mount as HTMLElement));
  }

  return { renderView, dispose };
}
