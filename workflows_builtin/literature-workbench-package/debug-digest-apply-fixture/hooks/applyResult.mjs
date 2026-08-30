import { joinPath } from "../../lib/path.mjs";
import {
  portableItemRef,
  requireHostApi,
  withPackageRuntimeScope,
} from "../../lib/runtime.mjs";
import { upsertLiteratureDigestGeneratedNotes } from "../../lib/literatureDigestNotes.mjs";

const DEBUG_IMAGE_BASE64 = [
  "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAGymlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDUgNzkuMTYzNDk5LCAyMDE4LzA4LzEzLTE2OjQwOjIyICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOSAoV2luZG93cykiIHhtcDpDcmVhdGVEYXRlPSIyMDI2LTAyLTEwVDIwOjExOjE2KzA4OjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyNi0wMi0xMFQyMDoyNjoyMiswODowMCIgeG1wOk1ldGFkYXRhRGF0ZT0iMjAyNi0wMi0xMFQyMDoyNjoyMiswODowMCIgZGM6Zm9ybWF0PSJpbWFnZS9wbmciIHBob3Rvc2hvcDpDb2xvck1vZGU9IjMiIHBob3Rvc2hvcDpJQ0NQcm9maWxlPSJzUkdCIElFQzYxOTY2LTIuMSIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDowMDgxYjZiOC01OWE0LWExNGMtYTFmMC04MmU0YWY5NmY0NDkiIHhtcE1NOkRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDo0NjM0MjgzOC1kOWIwLTQwNDYtOTE3ZS0zZDNkN2JhMmQ2MDkiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDoyNmJjOWY2Yy1iMjM2LTY3NDMtOTVkNS04MjdlMmM3NDVhNjYiPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjcmVhdGVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjI2YmM5ZjZjLWIyMzYtNjc0My05NWQ1LTgyN2UyYzc0NWE2NiIgc3RFdnQ6d2hlbj0iMjAyNi0wMi0xMFQyMDoxMToxNiswODowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTkgKFdpbmRvd3MpIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDo3YjZiNWVhMC1mYWEwLTI0NDgtOGFjOS03Y2IwMDNmYzg0MWIiIHN0RXZ0OndoZW49IjIwMjYtMDItMTBUMjA6MTU6MzcrMDg6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE5IChXaW5kb3dzKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8cmRmOmxpIHN0RXZ0OmFjdGlvbj0ic2F2ZWQiIHN0RXZ0Omluc3RhbmNlSUQ9InhtcC5paWQ6MDA4MWI2YjgtNTlhNC1hMTRjLWExZjAtODJlNGFmOTZmNDQ5IiBzdEV2dDp3aGVuPSIyMDI2LTAyLTEwVDIwOjI2OjIyKzA4OjAwIiBzdEV2dDpzb2Z0d2FyZUFnZW50PSJBZG9iZSBQaG90b3Nob3AgQ0MgMjAxOSAoV2luZG93cykiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPC9yZGY6U2VxPiA8L3htcE1NOkhpc3Rvcnk+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+gyfwXAAAA0BJREFUOI0lkd1LnXUAgJ/fx/u+5z2e4/E4y5o6U0tDN2yZjlrISjYLIgZJEHQhdVPULupqVDQmFGNRdLNa7DKKRkSFIy9WydpHFmOVOpsj3NbcnF8nz845O5734/frwgeeP+DhEdZavh2bGDz8wam3J2cXt+EqJaUAIYhjAwiUFIDFxBYRGbP1/rsvHhzZ+95gf8cP4szvc/2P942cQggyXQ2YyFJYK0HuDqQ8wEI5BDdJoqYaLxWT//smGMP4ubcG1MxK6+j8v6v1td2NICxhENDaeg8Du9t5Y98unnv2EZSXYEuPYDlaJCokSTdXU167w8xCvldU9xwoWyUT2lryKwEvDbfx+nAv3Vvaya+XcDX4Os2l6/N8OPoVx7/MEd+uRiVBRHGovbQfxbFBCjBBCbwU3VtaOHDkF74+MYXVIf072/hs/xDPdD3J59F3aF/juKB8J9Ru0ovLlQgEUJekoSZLaT3go+N/UDz9D9RnuHR+mdp0huVcgCJDMqMxxuK4OtbSc5FIhACRShIjWbhV4uArj/HnE/fhew6np1c59MlZiA1NXfcSBhEYi3I1WvouSiqUhIx2OPzNJA+3ZXnzhe0UlhqoVEKiRA0n/1rm3WNnKQYhju8hjUW4GpXtGdpvpExIrfA8TSQEK2U4eeEGJjbM5wIKpsLenZ2ESL4/c4XspiqslDieE2jhaYQUSCFQErKJBGPnrkEU8tPFWoqBIZ1McuzVgJ42jwc6m8jdLpDwXKSn0K7vYLTauGAtjoShPe1MLRSZvZoHIB+ESGFJpX0iBU7SRTtqQzxXOdoiBKwW4aGWPEdf3szNtSoOjV4mMBHP79jM7u3NfPzjHFeW1uloThEbi5BS6lC7WrkbFzNaM71U4chvRYb77uKLfT1AhXKc4OfLOS7cWKG+sQ7jWqSA0FhPPH10YnJsZmVbZ30VBsN6oFgPDJaIF/ua8B3N6NQi+XKFyBjSvkJJwfStEoMP1s2Kiav/7Xr00/PjUik6NvlIAZXIEBnLYqGCNZCtcnCVxHcVCsvsapk4Nvz6Wu8eYa1l4nr+qZHxa+/MrVW2KiWkBBACwUaaZQNrLWFsTHPGmxkZaHl/R2P1if8BXkpbaowVydgAAAAASUVORK5CYII=",
].join("");

function decodeBase64Bytes(text, runtime) {
  const raw = String(text || "").trim();
  if (runtime?.Buffer && typeof runtime.Buffer.from === "function") {
    return new Uint8Array(runtime.Buffer.from(raw, "base64"));
  }
  const atobImpl =
    typeof runtime?.atob === "function"
      ? runtime.atob
      : typeof globalThis?.atob === "function"
        ? globalThis.atob.bind(globalThis)
        : null;
  if (!atobImpl) {
    throw new Error("base64 decoder unavailable");
  }
  const binary = atobImpl(raw);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function normalizeEntryPath(path) {
  return String(path || "")
    .replace(/^file:\/\/+/, "")
    .replaceAll("\\", "/")
    .replace(/^\/+([A-Za-z]:\/)/, "$1")
    .replace(/\/+/g, "/");
}

async function applyResultImpl(args) {
  const runtime = args?.runtime || {};
  const host = requireHostApi(runtime);
  const parentRef = portableItemRef(args?.parent);
  const parentItem = (await host.library.getItemDetail(parentRef)).item;

  const stamp = Date.now().toString(36);
  const root = joinPath(
    host.file.getTempDirectoryPath(),
    `zs-debug-digest-apply-fixture-${stamp}`,
  );
  const figuresDir = joinPath(root, "figures");
  await host.file.makeDirectory({ path: figuresDir });

  const sourcePath = joinPath(root, "source.md");
  const imagePath = joinPath(figuresDir, "overview.png");
  const digestPath = "artifacts/digest.md";
  const referencesPath = "artifacts/references.json";
  const citationPath = "artifacts/citation_analysis.json";

  await host.file.writeBytes(imagePath, decodeBase64Bytes(DEBUG_IMAGE_BASE64, runtime));
  const sourceMarkdown = [
    "# Debug Source Paper",
    "",
    "This source markdown is generated by the Zotero Agents debug workflow.",
    "",
    "![Figure Debug](figures/overview.png)",
    "",
    "Figure Debug. Debug representative image fixture.",
    "",
    "More source text after the figure.",
  ].join("\n");
  await host.file.writeText(sourcePath, sourceMarkdown);

  const digestMarkdown = [
    "# Digest",
    "",
    `Debug marker: zs-debug-digest-apply-fixture-${stamp}`,
    "",
    "This digest was written by the real literature-analysis applyResult hook.",
    "",
    "## TL;DR",
    "",
    "This fixture verifies payload-backed digest notes with a real embedded image attachment.",
  ].join("\n");
  const referencesJson = [
    {
      entry_index: 1,
      citekey: "debug_fixture_2026",
      title: "Debug fixture reference",
      author: ["Zotero Agents"],
      year: 2026,
      raw: "Zotero Agents. Debug fixture reference. 2026.",
    },
  ];
  const citationJson = {
    meta: {
      language: "zh-CN",
      scope: {
        section_title: "DEBUG",
        line_start: 1,
        line_end: 10,
      },
    },
    report_md: [
      "## Citation Analysis",
      "",
      `Debug marker: zs-debug-digest-apply-fixture-${stamp}`,
      "",
      "- This citation artifact is generated by the debug fixture workflow.",
    ].join("\n"),
  };
  const resultJson = {
    digest_path: digestPath,
    references_path: referencesPath,
    citation_analysis_path: citationPath,
    representative_image: {
      status: "selected",
      source_kind: "markdown_image_ref",
      label: "Figure Debug",
      caption_quote: "Debug representative image fixture",
      section_hint: "Debug",
      page_hint: null,
      markdown_src_hint: "figures/overview.png",
      selection_reason: "The generated image is the deterministic debug representative image.",
      confidence: "high",
    },
  };

  const applied = await upsertLiteratureDigestGeneratedNotes({
    runtime,
    parentItem,
    digest: {
      payload: {
        version: 1,
        entry: digestPath,
        format: "markdown",
        content: digestMarkdown,
      },
      representativeImage: {
        imagePath,
        sourcePath,
        strategy: "debug-fixture",
        locator: resultJson.representative_image,
      },
    },
    references: {
      payload: {
        version: 1,
        entry: referencesPath,
        format: "json",
        references: referencesJson,
      },
    },
    citationAnalysis: {
      payload: {
        version: 1,
        entry: citationPath,
        format: "json",
        citation_analysis: citationJson,
      },
    },
  });
  return {
    status: "debug_fixture_applied",
    parent: {
      ref: parentRef,
      title: String(parentItem.title || ""),
    },
    fixture: {
      root,
      sourcePath,
      imagePath,
      resultJson,
    },
    applied: {
      notes: applied.notes,
      representative_image: applied.representative_image,
      auto_reference_matching: {
        enabled: false,
        attempted: false,
      },
    },
  };
}

export async function applyResult(args) {
  return withPackageRuntimeScope(args?.runtime, () => applyResultImpl(args));
}
