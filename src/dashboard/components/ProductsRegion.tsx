/** @jsxRuntime automatic */
/** @jsxImportSource preact */
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import { memo } from "preact/compat";

import { equalBySignature } from "../../shared/regionEquality";
import type {
  DashboardActionHandler,
  DashboardHostActionName,
} from "../../shared/dashboardWireContract";

// Products surface of the dashboard page: the products/feedback section
// switch, the expandable product file tree, code/Markdown preview with
// highlight.js and the vendor Markdown renderer, and the feedback selection
// toolbar. Action names and payload shapes mirror the legacy implementation
// (addon/content/dashboard/app.js renderProducts :2327-2704):
//   select-product-section                 { section }
//   select-product                         { productId }
//   select-product-asset                   { productId, assetId }
//   open-product-folder                    { productId }
//   open-run                               { backendId, runKey, requestId }
//   remove-product                         { productId }
//   select-feedback-skill-filter           { skillId }
//   select-feedback-product                { productId }
//   toggle-feedback-product-selected       { productId, selected }
//   toggle-all-feedback-products-selected  { selected }
//   export-selected-feedback               (no payload)
//   delete-selected-feedback               (no payload)
//   delete-all-feedback                    (no payload)
//
// Local UI state stays inside the component, mirroring the legacy page's
// `state` slots: the collapsed products list, and per-product expanded tree
// paths (legacy `state.productExpandedTreePathsById`).
//
// The selection is the region equality input and is fully render-ready: the
// panel model resolves every label through labelText() and pre-formats time/
// byte strings with dashboardDomUtils (this file cannot import ../dashboard*
// per the page-bundle import boundary). Label keys consumed by this surface:
//   tabProducts, productsSectionFiles, productsSectionFeedback,
//   productsOpenWorkspace, productsOpenRun, productsRemove,
//   feedbackFilterAllSkills, feedbackFilterSkill, feedbackExportSelected,
//   feedbackDeleteSelected, feedbackDeleteAll, feedbackSelectAll,
//   feedbackEmpty, productsEmpty, productsListTitle, productsListExpand,
//   productsListCollapse, productsListRail, productsNoFiles,
//   productsSelectFile, productsPreviewUnavailable, productsRawMarkdown,
//   productsViewerWrap (fallback "Wrap"), productsViewerCopy (fallback
//   "Copy"), productsViewerCopied, productsViewerCopyFailed.

// ---------------------------------------------------------------------------
// Narrowed page projections for the shared product wire DTO. The render-ready
// selection below intentionally keeps only fields visible on this surface.
// ---------------------------------------------------------------------------

export type DashboardProductAssetWire = {
  assetId?: string;
  label?: string;
  relativePath?: string;
  path?: string;
  contentType?: string;
  size?: number;
};

export type DashboardProductWire = {
  productId?: string;
  title?: string;
  kind?: string;
  workflowId?: string;
  workflowLabel?: string;
  backendId?: string;
  backendType?: string;
  runKey?: string;
  requestId?: string;
  storageMode?: string;
  updatedAt?: string;
  assets?: DashboardProductAssetWire[];
  metadata?: { skillId?: string };
};

export type DashboardProductPreviewWire = {
  path?: string;
  kind?: string;
  size?: number;
  previewable?: boolean;
  error?: string;
  text?: string;
  formattedText?: string;
  language?: string;
};

export type DashboardProductStorageViewWire = {
  section?: string;
  products?: DashboardProductWire[];
  selectedProduct?: DashboardProductWire;
  selectedAssetId?: string;
  selectedPreview?: DashboardProductPreviewWire;
  feedbackProducts?: DashboardProductWire[];
  feedbackSkillOptions?: string[];
  feedbackSkillFilter?: string;
  selectedFeedbackProduct?: DashboardProductWire;
  selectedFeedbackProductIds?: string[];
  selectedFeedbackPreview?: DashboardProductPreviewWire;
  isExporting?: boolean;
};

// ---------------------------------------------------------------------------
// Render-ready selection DTO (panel-model output; the region equality input).
// ---------------------------------------------------------------------------

export type DashboardProductsText = {
  productsSection: string;
  feedbackSection: string;
  openWorkspace: string;
  openRun: string;
  remove: string;
  filterAllSkills: string;
  filterSkillAria: string;
  exportSelected: string;
  deleteSelected: string;
  deleteAll: string;
  selectAll: string;
  feedbackEmpty: string;
  productsEmpty: string;
  listTitle: string;
  listExpand: string;
  listCollapse: string;
  listRail: string;
  noFiles: string;
  selectFile: string;
  previewUnavailable: string;
  rawMarkdown: string;
  viewerWrap: string;
  viewerCopy: string;
  viewerCopied: string;
  viewerCopyFailed: string;
};

export type DashboardProductAssetView = {
  assetId: string;
  label: string;
  relativePath: string;
  path: string;
  contentType: string;
  // formatBytes() output, pre-formatted by the panel model.
  sizeText: string;
};

export type DashboardProductPreviewView = {
  // path · kind · "N bytes", pre-joined by the panel model.
  metaText: string;
  kind: string;
  // language || kind.
  language: string;
  // Raw preview text (Markdown render + raw Markdown details view).
  text: string;
  // formattedText || text || "" (code viewer source for non-Markdown kinds).
  source: string;
  previewable: boolean;
  error: string;
};

export type DashboardProductCardView = {
  productId: string;
  title: string;
  metaText: string;
  active: boolean;
};

export type DashboardSelectedProductView = {
  productId: string;
  title: string;
  metaText: string;
  // Legacy open-run gate: backendId && (skillrunner ? runKey : requestId).
  canOpenRun: boolean;
  backendId: string;
  runKey: string;
  requestId: string;
  assets: DashboardProductAssetView[];
  selectedAssetId: string;
  preview: DashboardProductPreviewView | null;
};

export type DashboardProductsSectionSelection = {
  items: DashboardProductCardView[];
  selected: DashboardSelectedProductView | null;
};

export type DashboardFeedbackItemView = {
  productId: string;
  title: string;
  metaText: string;
  active: boolean;
  checked: boolean;
};

export type DashboardFeedbackDetailView = {
  productId: string;
  title: string;
  metaText: string;
  preview: DashboardProductPreviewView | null;
};

export type DashboardFeedbackSelection = {
  skillOptions: string[];
  skillFilter: string;
  // selectedFeedbackProductIds.length > 0 (drives export/delete-selected).
  hasSelection: boolean;
  selectAllChecked: boolean;
  selectAllIndeterminate: boolean;
  items: DashboardFeedbackItemView[];
  selected: DashboardFeedbackDetailView | null;
};

// The inactive branch is null so hidden-section data changes never rebuild
// the visible section (the selection is the region equality input).
export type DashboardProductsSelection = {
  pageTitle: string;
  section: "products" | "feedback";
  isExporting: boolean;
  text: DashboardProductsText;
  products: DashboardProductsSectionSelection | null;
  feedback: DashboardFeedbackSelection | null;
};

export type DashboardProductsAction = Extract<
  DashboardHostActionName,
  | "select-product-section"
  | "select-product"
  | "select-product-asset"
  | "open-product-folder"
  | "open-run"
  | "remove-product"
  | "select-feedback-skill-filter"
  | "select-feedback-product"
  | "toggle-feedback-product-selected"
  | "toggle-all-feedback-products-selected"
  | "export-selected-feedback"
  | "delete-selected-feedback"
  | "delete-all-feedback"
>;

export type DashboardProductsActionHandler =
  DashboardActionHandler<DashboardProductsAction>;

export type ProductsRegionProps = {
  selection: DashboardProductsSelection;
  onAction: DashboardProductsActionHandler;
};

// Region equality guard, shared by the memo boundary below and any future
// imperative guard: only the selection signature and the action channel
// identity matter.
export function productsRegionPropsEqual(
  prev: ProductsRegionProps,
  next: ProductsRegionProps,
): boolean {
  return (
    prev.onAction === next.onAction &&
    equalBySignature(prev.selection, next.selection)
  );
}

// ---------------------------------------------------------------------------
// Presentation helpers ported from the legacy page (pure, no dependencies).
// ---------------------------------------------------------------------------

function escapeHtmlText(value: unknown): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function normalizeProductAssetPath(
  asset: DashboardProductAssetView,
): string {
  return String(
    asset.relativePath || asset.path || asset.label || asset.assetId || "",
  )
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part !== "" && part !== "." && part !== "..")
    .join("/");
}

export type DashboardProductTreeNode = {
  kind: "folder" | "file";
  name: string;
  path: string;
  children: DashboardProductTreeNode[];
  asset: DashboardProductTreeNodeAsset | null;
};

type DashboardProductTreeNodeAsset = DashboardProductAssetView;

function compareTreeNames(
  a: DashboardProductTreeNode,
  b: DashboardProductTreeNode,
): number {
  if (a.kind !== b.kind) {
    return a.kind === "folder" ? -1 : 1;
  }
  return String(a.name || "").localeCompare(String(b.name || ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function buildProductAssetTree(
  assets: DashboardProductAssetView[],
): DashboardProductTreeNode {
  type FolderNode = DashboardProductTreeNode & {
    childByName: Record<string, DashboardProductTreeNode>;
  };
  const root: FolderNode = {
    kind: "folder",
    name: "",
    path: "",
    children: [],
    asset: null,
    childByName: Object.create(null) as Record<
      string,
      DashboardProductTreeNode
    >,
  };
  (assets || []).forEach((asset) => {
    const normalizedPath =
      normalizeProductAssetPath(asset) || String(asset.assetId || "asset");
    const parts = normalizedPath.split("/").filter(Boolean);
    let parent: FolderNode = root;
    parts.slice(0, -1).forEach((part) => {
      const key = part.toLowerCase();
      let child = parent.childByName[key] as FolderNode | undefined;
      if (!child || child.kind !== "folder") {
        child = {
          kind: "folder",
          name: part,
          path: parent.path ? parent.path + "/" + part : part,
          children: [],
          asset: null,
          childByName: Object.create(null),
        };
        parent.childByName[key] = child;
        parent.children.push(child);
      }
      parent = child;
    });
    const fileName = parts[parts.length - 1] || asset.label || asset.assetId;
    parent.children.push({
      kind: "file",
      name: fileName,
      path: normalizedPath,
      children: [],
      asset,
    });
  });
  const sortChildren = (node: DashboardProductTreeNode) => {
    node.children.sort(compareTreeNames);
    node.children.forEach((child) => {
      if (child.kind === "folder") {
        sortChildren(child);
      }
    });
  };
  sortChildren(root);
  return root;
}

export function productFileTypeIconClass(
  asset: DashboardProductAssetView,
): string {
  const path = normalizeProductAssetPath(asset).toLowerCase();
  const contentType = String(asset.contentType || "").toLowerCase();
  if (/\.(csv|tsv)$/.test(path) || contentType.includes("csv")) {
    return "zs-icon-product-table";
  }
  if (
    /(\.md|\.markdown|\.txt|\.text|\.tex|\.bib|\.log)$/.test(path) ||
    contentType.includes("markdown") ||
    contentType.includes("latex") ||
    contentType.startsWith("text/plain")
  ) {
    return "zs-icon-product-article";
  }
  if (
    /\.(json|yaml|yml|toml|xml)$/.test(path) ||
    contentType.includes("json") ||
    contentType.includes("yaml") ||
    contentType.includes("toml") ||
    contentType.includes("xml")
  ) {
    return "zs-icon-product-data";
  }
  if (
    /\.(html|htm|css|js|ts|mjs|tsx|jsx)$/.test(path) ||
    contentType.includes("html") ||
    contentType.includes("css") ||
    contentType.includes("javascript") ||
    contentType.includes("typescript")
  ) {
    return "zs-icon-product-code";
  }
  return "zs-icon-product-file";
}

export function resolveProductHighlightLanguage(language: unknown): string {
  const raw = String(language || "text").toLowerCase();
  const aliases: Record<string, string> = {
    js: "javascript",
    mjs: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    md: "markdown",
    text: "plaintext",
    txt: "plaintext",
    log: "plaintext",
  };
  return aliases[raw] || raw;
}

export function splitProductPreviewLines(text: unknown): string[] {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n");
}

// ---------------------------------------------------------------------------
// Vendor globals (highlight.js, markdown-it, texmath/katex, and the shared
// Zotero Skills Markdown renderer) — same usage as the legacy page.
// ---------------------------------------------------------------------------

type DashboardHighlightRuntime = {
  highlight?(
    source: string,
    options: { language: string; ignoreIllegals: boolean },
  ): { value: string };
  getLanguage?(name: string): unknown;
  highlightAuto?(source: string): { value: string };
};

type DashboardMarkdownParser = {
  render(markdownText: string): string;
  use(plugin: unknown, options?: Record<string, unknown>): unknown;
};

type DashboardVendorGlobals = {
  hljs?: DashboardHighlightRuntime;
  markdownit?: (options: Record<string, unknown>) => DashboardMarkdownParser;
  texmath?: unknown;
  katex?: unknown;
  ZoteroSkillsMarkdownRenderer?: {
    renderInto?(
      target: HTMLElement,
      markdownText: string,
      options: { profile: string },
    ): void;
  };
};

function dashboardVendorGlobals(): DashboardVendorGlobals {
  return (typeof window === "undefined"
    ? {}
    : window) as unknown as DashboardVendorGlobals;
}

export function highlightProductCode(
  source: unknown,
  language: unknown,
): string {
  const text = String(source || "");
  const runtime = dashboardVendorGlobals().hljs;
  const normalized = resolveProductHighlightLanguage(language);
  if (!runtime || typeof runtime.highlight !== "function") {
    return escapeHtmlText(text);
  }
  try {
    if (
      runtime.getLanguage &&
      runtime.getLanguage(normalized) &&
      runtime.highlight
    ) {
      return runtime.highlight(text, {
        language: normalized,
        ignoreIllegals: true,
      }).value;
    }
    if (typeof runtime.highlightAuto === "function") {
      return runtime.highlightAuto(text).value;
    }
  } catch {
    // Fall through to escaped text.
  }
  return escapeHtmlText(text);
}

function createProductMarkdownParser(): DashboardMarkdownParser | null {
  const vendor = dashboardVendorGlobals();
  if (typeof vendor.markdownit !== "function") {
    return null;
  }
  const parser = vendor.markdownit({
    html: false,
    linkify: true,
    breaks: false,
    langPrefix: "language-",
    highlight: (source: string, language: string) =>
      highlightProductCode(source, language),
  });
  if (vendor.texmath && vendor.katex) {
    try {
      parser.use(vendor.texmath, {
        engine: vendor.katex,
        delimiters: "dollars",
        katexOptions: { throwOnError: false, output: "htmlAndMathML" },
      });
    } catch {
      // Markdown rendering still works without math support.
    }
  }
  return parser;
}

function copyProductTextToClipboard(text: unknown): Promise<void> {
  const source = String(text || "");
  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    return navigator.clipboard.writeText(source);
  }
  const textarea = document.createElement("textarea");
  textarea.value = source;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand("copy");
    return Promise.resolve();
  } finally {
    textarea.remove();
  }
}

// ---------------------------------------------------------------------------
// Code / Markdown preview
// ---------------------------------------------------------------------------

export function ProductCodeViewer(props: {
  source: string;
  language: string;
  text: DashboardProductsText;
}) {
  const { source, language, text } = props;
  const [wrapLines, setWrapLines] = useState(true);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    },
    [],
  );
  const resolvedLanguage = resolveProductHighlightLanguage(language);
  const safeLanguage = String(resolvedLanguage || "plaintext").replace(
    /[^a-z0-9_-]/gi,
    "",
  );
  const lines = useMemo(
    () =>
      splitProductPreviewLines(source).map((line) => ({
        empty: line === "",
        // highlight.js output (or escaped text) is injected verbatim, same
        // trust channel as the legacy page's `code.innerHTML`.
        html: line === "" ? "" : highlightProductCode(line, resolvedLanguage),
      })),
    [source, resolvedLanguage],
  );
  const viewerClass = [
    "product-code-viewer",
    wrapLines ? "wrap-lines" : "",
    "language-" + safeLanguage,
  ]
    .filter(Boolean)
    .join(" ");
  const handleCopy = () => {
    copyProductTextToClipboard(source).then(
      () => {
        setCopyState("copied");
        if (copyTimerRef.current) {
          clearTimeout(copyTimerRef.current);
        }
        copyTimerRef.current = setTimeout(() => setCopyState("idle"), 900);
      },
      () => setCopyState("failed"),
    );
  };
  return (
    <div class={viewerClass}>
      <div class="product-code-toolbar">
        <div class="product-code-summary">
          {[safeLanguage, lines.length + " lines"].filter(Boolean).join(" · ")}
        </div>
        <div class="product-code-actions">
          <button
            type="button"
            class={wrapLines ? "product-code-tool active" : "product-code-tool"}
            aria-pressed={wrapLines ? "true" : "false"}
            onClick={() => setWrapLines((enabled) => !enabled)}
          >
            {text.viewerWrap}
          </button>
          <button type="button" class="product-code-tool" onClick={handleCopy}>
            {copyState === "copied"
              ? text.viewerCopied
              : copyState === "failed"
                ? text.viewerCopyFailed
                : text.viewerCopy}
          </button>
        </div>
      </div>
      <div class="product-code-scroller">
        <div class="product-code-lines">
          {lines.map((line, index) => (
            <div class="product-code-line" key={index}>
              <span class="product-code-line-number">{String(index + 1)}</span>
              {line.empty ? (
                <code
                  class={"product-code-line-text hljs language-" + safeLanguage}
                >
                  <br />
                </code>
              ) : (
                <code
                  class={"product-code-line-text hljs language-" + safeLanguage}
                  dangerouslySetInnerHTML={{ __html: line.html }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Imperative island: the vendor Markdown renderer owns this container's
// children; Preact renders an empty div and the effect fills it.
function ProductMarkdownView(props: {
  markdownText: string;
  text: DashboardProductsText;
}) {
  const { markdownText, text } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const vendor = dashboardVendorGlobals();
  const hasDomRenderer =
    typeof vendor.ZoteroSkillsMarkdownRenderer?.renderInto === "function";
  const hasParserFactory = typeof vendor.markdownit === "function";
  useLayoutEffect(() => {
    const target = containerRef.current;
    if (!target) return;
    target.textContent = "";
    const current = dashboardVendorGlobals();
    if (
      typeof current.ZoteroSkillsMarkdownRenderer?.renderInto === "function"
    ) {
      current.ZoteroSkillsMarkdownRenderer.renderInto(
        target,
        markdownText || "",
        { profile: "preview" },
      );
      return;
    }
    const parser = createProductMarkdownParser();
    if (parser) {
      target.innerHTML = parser.render(markdownText || "");
    }
  }, [markdownText]);
  if (!hasDomRenderer && !hasParserFactory) {
    return (
      <div class="product-preview-markdown">
        <ProductCodeViewer
          source={markdownText}
          language="markdown"
          text={text}
        />
      </div>
    );
  }
  return <div class="product-preview-markdown" ref={containerRef} />;
}

export function ProductPreview(props: {
  preview: DashboardProductPreviewView | null;
  text: DashboardProductsText;
}) {
  const { preview, text } = props;
  if (!preview) {
    return (
      <div class="product-preview">
        <div class="empty">{text.selectFile}</div>
      </div>
    );
  }
  if (!preview.previewable) {
    return (
      <div class="product-preview">
        <div class="product-preview-meta">{preview.metaText}</div>
        <div class="empty">{preview.error || text.previewUnavailable}</div>
      </div>
    );
  }
  if (preview.kind === "markdown") {
    return (
      <div class="product-preview">
        <div class="product-preview-meta">{preview.metaText}</div>
        <ProductMarkdownView markdownText={preview.text} text={text} />
        <details class="product-preview-raw">
          <summary>{text.rawMarkdown}</summary>
          <ProductCodeViewer
            source={preview.text}
            language="markdown"
            text={text}
          />
        </details>
      </div>
    );
  }
  return (
    <div class="product-preview">
      <div class="product-preview-meta">{preview.metaText}</div>
      <ProductCodeViewer
        source={preview.source}
        language={preview.language}
        text={text}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// File tree
// ---------------------------------------------------------------------------

function ProductTreeNodeView(props: {
  node: DashboardProductTreeNode;
  productId: string;
  selectedAssetId: string;
  expandedPaths: ReadonlySet<string>;
  level: number;
  onToggleTreePath: (productId: string, path: string) => void;
  onAction: DashboardProductsActionHandler;
}) {
  const {
    node,
    productId,
    selectedAssetId,
    expandedPaths,
    level,
    onToggleTreePath,
    onAction,
  } = props;
  if (node.kind === "folder") {
    const expanded = expandedPaths.has(node.path);
    return (
      <div class="product-tree-row-wrap">
        <button
          type="button"
          class="product-tree-node product-tree-folder"
          style={{ "--product-tree-level": String(level) }}
          aria-expanded={expanded ? "true" : "false"}
          title={node.path}
          onClick={() => onToggleTreePath(productId, node.path)}
        >
          <span
            class={`zs-icon zs-icon-sm product-tree-folder-icon ${
              expanded
                ? "zs-icon-product-folder-open"
                : "zs-icon-product-folder"
            }`}
            aria-hidden="true"
          />
          <span class="product-tree-name">{node.name}</span>
        </button>
        {expanded
          ? node.children.map((child) => (
              <ProductTreeNodeView
                key={child.kind + ":" + child.path}
                node={child}
                productId={productId}
                selectedAssetId={selectedAssetId}
                expandedPaths={expandedPaths}
                level={level + 1}
                onToggleTreePath={onToggleTreePath}
                onAction={onAction}
              />
            ))
          : null}
      </div>
    );
  }
  const asset = node.asset;
  const assetPath = asset ? normalizeProductAssetPath(asset) : "";
  const meta = [assetPath, (asset && asset.sizeText) || ""]
    .filter(Boolean)
    .join(" · ");
  const active = Boolean(asset && asset.assetId === selectedAssetId);
  return (
    <div class="product-tree-row-wrap">
      <button
        type="button"
        class={
          active
            ? "product-tree-node product-tree-file active"
            : "product-tree-node product-tree-file"
        }
        style={{ "--product-tree-level": String(level) }}
        title={assetPath}
        onClick={() => {
          if (!asset) return;
          onAction("select-product-asset", {
            productId,
            assetId: asset.assetId,
          });
        }}
      >
        <span
          class={`zs-icon zs-icon-sm product-tree-file-icon ${
            asset ? productFileTypeIconClass(asset) : "zs-icon-product-file"
          }`}
          aria-hidden="true"
        />
        <span class="product-tree-file-text">
          <span class="product-tree-name">
            {(asset && (asset.label || node.name || asset.assetId)) ||
              node.name}
          </span>
          {meta ? <span class="product-tree-meta">{meta}</span> : null}
        </span>
      </button>
    </div>
  );
}

export function ProductFileTree(props: {
  productId: string;
  assets: DashboardProductAssetView[];
  selectedAssetId: string;
  expandedPaths: ReadonlySet<string>;
  emptyText: string;
  onToggleTreePath: (productId: string, path: string) => void;
  onAction: DashboardProductsActionHandler;
  onTreeScroll?: (productId: string, scrollTop: number) => void;
  treeRef?: (node: HTMLDivElement | null) => void;
}) {
  const {
    productId,
    assets,
    selectedAssetId,
    expandedPaths,
    emptyText,
    onToggleTreePath,
    onAction,
    onTreeScroll,
    treeRef,
  } = props;
  const tree = useMemo(() => buildProductAssetTree(assets), [assets]);
  return (
    <div
      class="product-file-tree"
      ref={treeRef}
      onScroll={
        onTreeScroll
          ? (event) =>
              onTreeScroll(
                productId,
                (event.currentTarget as HTMLDivElement).scrollTop,
              )
          : undefined
      }
    >
      {assets.length === 0 ? (
        <div class="empty">{emptyText}</div>
      ) : (
        tree.children.map((child) => (
          <ProductTreeNodeView
            key={child.kind + ":" + child.path}
            node={child}
            productId={productId}
            selectedAssetId={selectedAssetId}
            expandedPaths={expandedPaths}
            level={0}
            onToggleTreePath={onToggleTreePath}
            onAction={onAction}
          />
        ))
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

function ProductsToolbarActions(props: {
  selected: DashboardSelectedProductView;
  isExporting: boolean;
  text: DashboardProductsText;
  onAction: DashboardProductsActionHandler;
}) {
  const { selected, isExporting, text, onAction } = props;
  return (
    <div class="toolbar-actions">
      <button
        type="button"
        class={isExporting ? "btn is-busy" : "btn"}
        disabled={isExporting}
        aria-busy={isExporting ? "true" : "false"}
        onClick={() => {
          if (isExporting) return;
          onAction("open-product-folder", { productId: selected.productId });
        }}
      >
        {isExporting ? (
          <span class="dashboard-button-spinner" aria-hidden="true" />
        ) : null}
        {text.openWorkspace}
      </button>
      {selected.canOpenRun ? (
        <button
          type="button"
          class="btn"
          onClick={() =>
            onAction("open-run", {
              backendId: selected.backendId,
              runKey: selected.runKey,
              requestId: selected.requestId,
            })
          }
        >
          {text.openRun}
        </button>
      ) : null}
      <button
        type="button"
        class="btn danger"
        onClick={() =>
          onAction("remove-product", { productId: selected.productId })
        }
      >
        {text.remove}
      </button>
    </div>
  );
}

function FeedbackToolbarActions(props: {
  feedback: DashboardFeedbackSelection;
  text: DashboardProductsText;
  onAction: DashboardProductsActionHandler;
}) {
  const { feedback, text, onAction } = props;
  return (
    <div class="toolbar-actions">
      <select
        class="input feedback-skill-filter"
        aria-label={text.filterSkillAria}
        value={feedback.skillFilter}
        onChange={(event) =>
          onAction("select-feedback-skill-filter", {
            skillId: event.currentTarget.value,
          })
        }
      >
        <option value="">{text.filterAllSkills}</option>
        {feedback.skillOptions.map((skillId) => (
          <option key={skillId} value={skillId}>
            {skillId}
          </option>
        ))}
      </select>
      <button
        type="button"
        class="btn"
        disabled={!feedback.hasSelection}
        onClick={() => onAction("export-selected-feedback")}
      >
        {text.exportSelected}
      </button>
      <button
        type="button"
        class="btn danger"
        disabled={!feedback.hasSelection}
        onClick={() => onAction("delete-selected-feedback")}
      >
        {text.deleteSelected}
      </button>
      <button
        type="button"
        class="btn danger"
        disabled={feedback.items.length === 0}
        onClick={() => onAction("delete-all-feedback")}
      >
        {text.deleteAll}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

function FeedbackProductRow(props: {
  item: DashboardFeedbackItemView;
  onAction: DashboardProductsActionHandler;
}) {
  const { item, onAction } = props;
  return (
    <div
      class={
        item.active
          ? "product-card feedback-product-card active"
          : "product-card feedback-product-card"
      }
    >
      <input
        class="feedback-product-checkbox"
        type="checkbox"
        checked={item.checked}
        onChange={(event) => {
          event.stopPropagation();
          onAction("toggle-feedback-product-selected", {
            productId: item.productId,
            selected: event.currentTarget.checked,
          });
        }}
      />
      <button
        type="button"
        class="feedback-product-body"
        onClick={() =>
          onAction("select-feedback-product", { productId: item.productId })
        }
      >
        <strong>{item.title}</strong>
        <span class="product-card-meta">{item.metaText}</span>
      </button>
    </div>
  );
}

function FeedbackSection(props: {
  feedback: DashboardFeedbackSelection;
  text: DashboardProductsText;
  onAction: DashboardProductsActionHandler;
  listScrollOwner: string;
  listScrollTop: number;
  onListScroll: (scrollTop: number) => void;
}) {
  const {
    feedback,
    text,
    onAction,
    listScrollOwner,
    listScrollTop,
    onListScroll,
  } = props;
  const listRef = useRef<HTMLDivElement | null>(null);
  const onListScrollRef = useRef(onListScroll);
  onListScrollRef.current = onListScroll;
  useLayoutEffect(() => {
    const node = listRef.current;
    if (node) {
      node.scrollTop = listScrollTop;
    }
  }, [listScrollOwner, listScrollTop]);
  useLayoutEffect(
    () => () => {
      const node = listRef.current;
      if (node) {
        onListScrollRef.current(node.scrollTop);
      }
    },
    [],
  );
  if (feedback.items.length === 0) {
    return <div class="empty">{text.feedbackEmpty}</div>;
  }
  return (
    <div class="products-layout">
      <div
        class="product-list"
        ref={listRef}
        onScroll={(event) =>
          onListScroll((event.currentTarget as HTMLDivElement).scrollTop)
        }
      >
        <div class="product-list-header">
          <div class="product-list-title">
            {text.feedbackSection}
            <span class="product-list-count">
              {String(feedback.items.length)}
            </span>
          </div>
          <label class="feedback-select-all">
            <input
              class="feedback-select-all-checkbox"
              type="checkbox"
              checked={feedback.selectAllChecked}
              aria-label={text.selectAll}
              ref={(node: HTMLInputElement | null) => {
                if (node) {
                  node.indeterminate = feedback.selectAllIndeterminate;
                }
              }}
              onChange={(event) =>
                onAction("toggle-all-feedback-products-selected", {
                  selected: event.currentTarget.checked,
                })
              }
            />
            <span>{text.selectAll}</span>
          </label>
        </div>
        {feedback.items.map((item) => (
          <FeedbackProductRow
            key={item.productId}
            item={item}
            onAction={onAction}
          />
        ))}
      </div>
      <div class="product-detail">
        {feedback.selected ? (
          <>
            <h3 class="panel-title">{feedback.selected.title}</h3>
            <div class="product-meta">{feedback.selected.metaText}</div>
            <ProductPreview preview={feedback.selected.preview} text={text} />
          </>
        ) : null}
      </div>
    </div>
  );
}

function ProductsSection(props: {
  products: DashboardProductsSectionSelection;
  text: DashboardProductsText;
  listCollapsed: boolean;
  expandedPaths: ReadonlySet<string>;
  onToggleListCollapsed: () => void;
  onToggleTreePath: (productId: string, path: string) => void;
  onAction: DashboardProductsActionHandler;
  onTreeScroll: (productId: string, scrollTop: number) => void;
  treeRef: (node: HTMLDivElement | null) => void;
  listScrollTop: number;
  onListScroll: (scrollTop: number) => void;
}) {
  const {
    products,
    text,
    listCollapsed,
    expandedPaths,
    onToggleListCollapsed,
    onToggleTreePath,
    onAction,
    onTreeScroll,
    treeRef,
    listScrollTop,
    onListScroll,
  } = props;
  const listRef = useRef<HTMLDivElement | null>(null);
  const onListScrollRef = useRef(onListScroll);
  onListScrollRef.current = onListScroll;
  useLayoutEffect(() => {
    const node = listRef.current;
    if (node) {
      node.scrollTop = listScrollTop;
    }
  }, [listScrollTop]);
  useLayoutEffect(
    () => () => {
      const node = listRef.current;
      if (node) {
        onListScrollRef.current(node.scrollTop);
      }
    },
    [],
  );
  if (products.items.length === 0) {
    return <div class="empty">{text.productsEmpty}</div>;
  }
  const selected = products.selected;
  const toggleTitle = listCollapsed ? text.listExpand : text.listCollapse;
  return (
    <div
      class={
        listCollapsed
          ? "products-layout products-layout-collapsed"
          : "products-layout"
      }
    >
      <div
        class="product-list"
        ref={listRef}
        onScroll={(event) =>
          onListScroll((event.currentTarget as HTMLDivElement).scrollTop)
        }
      >
        <div class="product-list-header">
          <div class="product-list-title">
            {text.listTitle}
            <span class="product-list-count">
              {String(products.items.length)}
            </span>
          </div>
          <button
            type="button"
            class="product-list-toggle"
            title={toggleTitle}
            aria-label={toggleTitle}
            onClick={onToggleListCollapsed}
          >
            <span
              class={`zs-icon zs-icon-sm ${
                listCollapsed
                  ? "zs-icon-right-panel-open"
                  : "zs-icon-right-panel-close"
              }`}
              aria-hidden="true"
            />
          </button>
        </div>
        {listCollapsed ? (
          <div class="product-list-rail">
            <span class="product-list-rail-count">
              {String(products.items.length)}
            </span>
            <span class="product-list-rail-label">{text.listRail}</span>
            {selected ? (
              <span class="product-list-rail-current">{selected.title}</span>
            ) : null}
          </div>
        ) : (
          products.items.map((item) => (
            <button
              key={item.productId}
              type="button"
              class={item.active ? "product-card active" : "product-card"}
              onClick={() =>
                onAction("select-product", { productId: item.productId })
              }
            >
              <strong>{item.title}</strong>
              <span class="product-card-meta">{item.metaText}</span>
            </button>
          ))
        )}
      </div>
      <div class="product-detail">
        {selected ? (
          <>
            <h3 class="panel-title">{selected.title}</h3>
            <div class="product-meta">{selected.metaText}</div>
            <div class="product-detail-body">
              <ProductFileTree
                productId={selected.productId}
                assets={selected.assets}
                selectedAssetId={selected.selectedAssetId}
                expandedPaths={expandedPaths}
                emptyText={text.noFiles}
                onToggleTreePath={onToggleTreePath}
                onAction={onAction}
                onTreeScroll={onTreeScroll}
                treeRef={treeRef}
              />
              <ProductPreview preview={selected.preview} text={text} />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

const NO_EXPANDED_PATHS: ReadonlySet<string> = new Set<string>();

export const ProductsRegion = memo(function ProductsRegion(
  props: ProductsRegionProps,
) {
  const { selection, onAction } = props;
  const text = selection.text;
  const [listCollapsed, setListCollapsed] = useState(false);
  // Per-product expanded tree paths (legacy
  // state.productExpandedTreePathsById): survives snapshot re-renders,
  // resets when the region unmounts (tab switch).
  const expandedPathsByProductRef = useRef<Map<string, Set<string>>>(new Map());
  const [, setTreeRevision] = useState(0);
  const handleToggleTreePath = (productId: string, path: string) => {
    const byProduct = expandedPathsByProductRef.current;
    let paths = byProduct.get(productId);
    if (!paths) {
      paths = new Set();
      byProduct.set(productId, paths);
    }
    if (paths.has(path)) {
      paths.delete(path);
    } else {
      paths.add(path);
    }
    setTreeRevision((revision) => revision + 1);
  };
  // Per-product tree scroll memory: tracked live via onScroll and restored
  // when the selected product or visible section changes.
  const treeScrollTopByProductRef = useRef<Map<string, number>>(new Map());
  const treeNodeRef = useRef<HTMLDivElement | null>(null);
  const handleTreeScroll = (productId: string, scrollTop: number) => {
    treeScrollTopByProductRef.current.set(productId, scrollTop);
  };
  const selectedProductId =
    (selection.products && selection.products.selected
      ? selection.products.selected.productId
      : "") || "";
  useLayoutEffect(() => {
    const node = treeNodeRef.current;
    if (node) {
      node.scrollTop =
        treeScrollTopByProductRef.current.get(selectedProductId) || 0;
    }
  }, [selectedProductId, selection.section]);
  const productsListScrollTopRef = useRef(0);
  const feedbackListScrollTopByOwnerRef = useRef<Map<string, number>>(
    new Map(),
  );
  const feedbackListOwner = selection.feedback?.skillFilter || "all";
  const handleProductsListScroll = (scrollTop: number) => {
    productsListScrollTopRef.current = scrollTop;
  };
  const handleFeedbackListScroll = (scrollTop: number) => {
    feedbackListScrollTopByOwnerRef.current.set(feedbackListOwner, scrollTop);
  };
  const expandedPaths =
    expandedPathsByProductRef.current.get(selectedProductId) ||
    NO_EXPANDED_PATHS;
  const sectionEntries: Array<{
    key: "products" | "feedback";
    label: string;
  }> = [
    { key: "products", label: text.productsSection },
    { key: "feedback", label: text.feedbackSection },
  ];
  return (
    <div class="dashboard-products" data-region-content="dashboard-products">
      <div class="toolbar">
        <h2 class="page-title">{selection.pageTitle}</h2>
        <div class="toolbar-actions product-section-tabs">
          {sectionEntries.map((entry) => (
            <button
              key={entry.key}
              type="button"
              class={selection.section === entry.key ? "btn active" : "btn"}
              onClick={() =>
                onAction("select-product-section", { section: entry.key })
              }
            >
              {entry.label}
            </button>
          ))}
        </div>
        {selection.section === "products" &&
        selection.products &&
        selection.products.selected ? (
          <ProductsToolbarActions
            selected={selection.products.selected}
            isExporting={selection.isExporting}
            text={text}
            onAction={onAction}
          />
        ) : null}
        {selection.section === "feedback" && selection.feedback ? (
          <FeedbackToolbarActions
            feedback={selection.feedback}
            text={text}
            onAction={onAction}
          />
        ) : null}
      </div>
      {selection.section === "feedback" ? (
        selection.feedback ? (
          <FeedbackSection
            feedback={selection.feedback}
            text={text}
            onAction={onAction}
            listScrollOwner={feedbackListOwner}
            listScrollTop={
              feedbackListScrollTopByOwnerRef.current.get(feedbackListOwner) ||
              0
            }
            onListScroll={handleFeedbackListScroll}
          />
        ) : null
      ) : selection.products ? (
        <ProductsSection
          products={selection.products}
          text={text}
          listCollapsed={listCollapsed}
          expandedPaths={expandedPaths}
          onToggleListCollapsed={() =>
            setListCollapsed((collapsed) => !collapsed)
          }
          onToggleTreePath={handleToggleTreePath}
          onAction={onAction}
          onTreeScroll={handleTreeScroll}
          listScrollTop={productsListScrollTopRef.current}
          onListScroll={handleProductsListScroll}
          treeRef={(node: HTMLDivElement | null) => {
            treeNodeRef.current = node;
          }}
        />
      ) : null}
    </div>
  );
}, productsRegionPropsEqual);
