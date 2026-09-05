import { cp, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { build } from "esbuild";

// Browser-based dashboard tests load addon/content/dashboard/index.html over
// file://; the page's app bundle is an esbuild artifact, so build it (with
// diagnostics regions enabled, matching the debug build flags) into a temp
// mirror of the content tree and hand back the index.html path.
let cachedPagePath: Promise<string> | null = null;

export function buildDashboardBrowserPage(): Promise<string> {
  if (!cachedPagePath) {
    cachedPagePath = (async () => {
      const root = await mkdtemp(path.join(tmpdir(), "zs-dashboard-page-"));
      await cp(path.resolve("addon/content"), path.join(root, "content"), {
        recursive: true,
      });
      await build({
        entryPoints: [path.resolve("src/dashboard/dashboardApp.ts")],
        bundle: true,
        format: "iife",
        target: "firefox115",
        platform: "browser",
        jsx: "automatic",
        jsxImportSource: "preact",
        define: {
          __debug_mode__: "true",
          __synthesis_sidecar_diagnostics_enabled__: "true",
        },
        outfile: path.join(root, "content", "dashboard", "app.js"),
        logLevel: "silent",
      });
      return path.join(root, "content", "dashboard", "index.html");
    })();
  }
  return cachedPagePath;
}
