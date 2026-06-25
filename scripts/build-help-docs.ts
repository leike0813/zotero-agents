import { mkdir, readFile, readdir, rm, stat, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { format } from "prettier";
import sharp from "sharp";

type Locale = string;

type SourceDoc = {
  id: string;
  locale: Locale;
  sourcePath: string;
  relativePath: string;
  markdown: string;
  title: string;
};

type ManifestDoc = {
  id: string;
  locale: Locale;
  title: string;
  path: string;
};

type ManifestNavItem =
  | { type: "doc"; id: string; label: string }
  | { type: "category"; label: string; items: ManifestNavItem[] };

type HelpDocsManifest = {
  schema: "zotero-agents.help-docs.v1";
  generated_at: string;
  default_doc: string;
  locales: Locale[];
  docs: ManifestDoc[];
  sidebar: Record<Locale, ManifestNavItem[]>;
  assets: string[];
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outputRoot = path.join(repoRoot, "addon", "content", "help-docs");
const docsOutputRoot = path.join(outputRoot, "docs");
const assetsOutputRoot = path.join(outputRoot, "assets", "img");
const staticImgRoot = path.join(repoRoot, "site", "static", "img");
const defaultDoc = "installation";
const maxOutputBytes = 6 * 1024 * 1024;
const chromeAssetRoot = "chrome://zotero-skills/content/help-docs/assets/img/";

async function discoverLocaleInputs(): Promise<Record<Locale, string>> {
  const inputs: Record<Locale, string> = {
    en: path.join(repoRoot, "site", "docs"),
  };
  const i18nRoot = path.join(repoRoot, "site", "i18n");
  const entries = await readdir(i18nRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const docsRoot = path.join(
      i18nRoot,
      entry.name,
      "docusaurus-plugin-content-docs",
      "current",
    );
    try {
      const info = await stat(docsRoot);
      if (info.isDirectory()) {
        inputs[entry.name] = docsRoot;
      }
    } catch {
      // Locale has no docs content.
    }
  }
  return Object.fromEntries(
    Object.entries(inputs).sort(([a], [b]) => {
      if (a === "en") {
        return -1;
      }
      if (b === "en") {
        return 1;
      }
      return a.localeCompare(b);
    }),
  );
}

function toPosix(value: string) {
  return value.replace(/\\/g, "/");
}

function trimSlash(value: string) {
  return value.replace(/^\/+|\/+$/g, "");
}

function withoutDocExtension(value: string) {
  return value.replace(/\.(?:md|mdx)$/i, "");
}

function encodeAssetPath(value: string) {
  return value
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function escapeHtmlAttribute(value: string) {
  return value.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function stripFrontmatter(markdown: string) {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

function extractTitle(markdown: string, fallback: string) {
  const match = /^#\s+(.+?)\s*$/m.exec(markdown);
  return match?.[1]?.replace(/[`*_]/g, "").trim() || fallback;
}

function admonitionLabel(kind: string, title: string) {
  const normalized = kind.trim().toLowerCase();
  const fallback =
    normalized === "caution"
      ? "Caution"
      : normalized === "warning"
        ? "Warning"
        : normalized === "info"
          ? "Info"
          : "Tip";
  const label = title.trim() || fallback;
  return `> **${label}**`;
}

function convertAdmonitions(markdown: string) {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const output: string[] = [];
  let active:
    | {
        fence: string;
      }
    | undefined;

  for (const line of lines) {
    const start = /^(::{3,4})\s*(tip|warning|info|caution)\s*(.*)$/i.exec(
      line.trim(),
    );
    if (!active && start) {
      active = { fence: start[1] };
      output.push(admonitionLabel(start[2], start[3] || ""));
      continue;
    }

    if (active && line.trim() === active.fence) {
      active = undefined;
      output.push(">");
      continue;
    }

    if (active) {
      output.push(line.trim() ? `> ${line}` : ">");
      continue;
    }

    output.push(line);
  }

  return output.join("\n");
}

async function listMarkdownFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listMarkdownFiles(fullPath)));
      continue;
    }
    if (/\.(?:md|mdx)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

async function loadSourceDocs(localeInputs: Record<Locale, string>) {
  const docs: SourceDoc[] = [];
  for (const [locale, root] of Object.entries(localeInputs) as [
    Locale,
    string,
  ][]) {
    const files = await listMarkdownFiles(root);
    for (const filePath of files) {
      const relativePath = toPosix(path.relative(root, filePath));
      const id = withoutDocExtension(relativePath);
      const stripped = stripFrontmatter(await readFile(filePath, "utf8"));
      const markdown = convertAdmonitions(stripped).trim() + "\n";
      docs.push({
        id,
        locale,
        sourcePath: filePath,
        relativePath,
        markdown,
        title: extractTitle(markdown, id),
      });
    }
  }
  return docs;
}

function parseTarget(rawTarget: string) {
  const trimmed = rawTarget.trim();
  const match = /^(\S+)(\s+["'][^"']*["'])?$/.exec(trimmed);
  return {
    href: match?.[1] || trimmed,
    suffix: match?.[2] || "",
  };
}

function splitHref(href: string) {
  const hashIndex = href.indexOf("#");
  const queryIndex = href.indexOf("?");
  const cutIndexes = [hashIndex, queryIndex].filter((index) => index >= 0);
  const cut = cutIndexes.length ? Math.min(...cutIndexes) : href.length;
  const pathPart = href.slice(0, cut);
  const suffix = href.slice(cut);
  return { pathPart, suffix };
}

function isExternalHref(href: string) {
  return /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("//");
}

function resolveDocId(
  href: string,
  fromDoc: SourceDoc,
  docIdsByLocale: Map<Locale, Set<string>>,
) {
  if (!href || href.startsWith("#") || isExternalHref(href)) {
    return null;
  }
  const { pathPart, suffix } = splitHref(href);
  if (!pathPart || /\.(?:png|jpe?g|webp|gif|svg)$/i.test(pathPart)) {
    return null;
  }

  const localeDocIds = docIdsByLocale.get(fromDoc.locale) || new Set<string>();
  let candidate = "";
  if (pathPart.startsWith("/")) {
    candidate = trimSlash(pathPart);
    const localePrefix = fromDoc.locale.toLowerCase() + "/";
    if (candidate.toLowerCase().startsWith(localePrefix)) {
      candidate = candidate.slice(fromDoc.locale.length + 1);
    }
  } else {
    candidate = path.posix.normalize(
      path.posix.join(path.posix.dirname(fromDoc.id), pathPart),
    );
  }
  candidate = trimSlash(withoutDocExtension(candidate));
  const options = [candidate, `${candidate}/index`].filter(Boolean);
  const resolved = options.find((option) => localeDocIds.has(option));
  return resolved ? `#doc/${encodeURIComponent(resolved)}${suffix}` : null;
}

function normalizeImageReference(href: string, fromDoc: SourceDoc) {
  const { pathPart } = splitHref(href);
  if (!/\.(?:png|jpe?g|webp|gif|svg)$/i.test(pathPart)) {
    return null;
  }
  if (pathPart.startsWith("/img/")) {
    return trimSlash(pathPart.slice("/img/".length));
  }
  if (pathPart.startsWith("img/")) {
    return trimSlash(pathPart.slice("img/".length));
  }
  if (pathPart.startsWith("/") || isExternalHref(pathPart)) {
    return null;
  }
  const sourceDir = path.posix.dirname(toPosix(fromDoc.sourcePath));
  const resolved = path.posix.normalize(path.posix.join(sourceDir, pathPart));
  const staticRoot = toPosix(staticImgRoot);
  if (!resolved.startsWith(staticRoot)) {
    return null;
  }
  return trimSlash(resolved.slice(staticRoot.length));
}

function outputAssetPath(relativeImagePath: string) {
  const ext = path.posix.extname(relativeImagePath).toLowerCase();
  if (ext === ".svg") {
    return relativeImagePath;
  }
  return relativeImagePath.replace(/\.(?:png|jpe?g|webp)$/i, ".webp");
}

function imageFigureClass(relativeImagePath: string) {
  const normalized = `/${relativeImagePath}`;
  const classes = ["zs-doc-figure"];
  if (
    /(^|\/)(icon_[^/]+|favicon)([-.][^/]*)?\.(?:png|jpe?g|webp|svg)$/i.test(
      normalized,
    )
  ) {
    classes.push("zs-doc-figure--icon");
  }
  if (/(^|\/)poster\.(?:png|jpe?g|webp|svg)$/i.test(normalized)) {
    classes.push("zs-doc-figure--poster");
  }
  return classes.join(" ");
}

function renderImageFigure(
  label: string,
  assetUrl: string,
  sourceRelative: string,
) {
  const alt = escapeHtmlAttribute(label);
  const className = imageFigureClass(sourceRelative);
  const caption = label.trim()
    ? `<figcaption>${escapeHtmlAttribute(label)}</figcaption>`
    : "";
  return `<figure class="${className}"><img src="${escapeHtmlAttribute(assetUrl)}" alt="${alt}" title="${alt}" loading="lazy" />${caption}</figure>`;
}

function rewriteMarkdown(
  doc: SourceDoc,
  docIdsByLocale: Map<Locale, Set<string>>,
  referencedImages: Map<string, string>,
) {
  return doc.markdown.replace(
    /(!?)\[([^\]]*)\]\(([^)\n]+)\)/g,
    (match, bang: string, label: string, rawTarget: string) => {
      const target = parseTarget(rawTarget);
      if (bang) {
        const imageRef = normalizeImageReference(target.href, doc);
        if (!imageRef) {
          return match;
        }
        const assetPath = outputAssetPath(imageRef);
        referencedImages.set(imageRef, assetPath);
        const assetUrl = `${chromeAssetRoot}${encodeAssetPath(assetPath)}`;
        return renderImageFigure(
          label,
          `${assetUrl}${target.suffix}`,
          imageRef,
        );
      }
      const resolvedDocHref = resolveDocId(target.href, doc, docIdsByLocale);
      if (!resolvedDocHref) {
        return match;
      }
      return `[${label}](${resolvedDocHref}${target.suffix})`;
    },
  );
}

async function ensureInsideRepo(targetPath: string) {
  const resolved = path.resolve(targetPath);
  const expected = path.resolve(repoRoot, "addon", "content", "help-docs");
  if (resolved !== expected) {
    throw new Error(`Refusing to clear unexpected help docs path: ${resolved}`);
  }
}

async function writeGeneratedDocs(
  docs: SourceDoc[],
  docIdsByLocale: Map<Locale, Set<string>>,
) {
  const referencedImages = new Map<string, string>();
  for (const doc of docs) {
    const markdown = rewriteMarkdown(doc, docIdsByLocale, referencedImages);
    const outPath = path.join(
      docsOutputRoot,
      doc.locale,
      toPosix(doc.relativePath),
    );
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, markdown, "utf8");
  }
  return referencedImages;
}

async function copyOrCompressAsset(
  sourceRelative: string,
  outputRelative: string,
) {
  const sourcePath = path.join(staticImgRoot, sourceRelative);
  const outputPath = path.join(assetsOutputRoot, outputRelative);
  await mkdir(path.dirname(outputPath), { recursive: true });
  if (/\.svg$/i.test(sourceRelative) || /\.gif$/i.test(sourceRelative)) {
    await writeFile(outputPath, await readFile(sourcePath));
    return;
  }
  await sharp(sourcePath)
    .resize({ width: 1280, withoutEnlargement: true })
    .webp({ quality: 74, effort: 5 })
    .toFile(outputPath);
}

async function writeReferencedAssets(referencedImages: Map<string, string>) {
  const assets = Array.from(referencedImages.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  for (const [sourceRelative, outputRelative] of assets) {
    await copyOrCompressAsset(sourceRelative, outputRelative);
  }
  return assets.map(([, outputRelative]) => `assets/img/${outputRelative}`);
}

async function loadSidebarConfig() {
  const sidebarModule = await import("../site/sidebars.ts");
  return sidebarModule.default?.docsSidebar || [];
}

function flattenSidebarItems(
  items: unknown[],
  docsById: Map<string, SourceDoc>,
): ManifestNavItem[] {
  const nav: ManifestNavItem[] = [];
  for (const item of items) {
    if (typeof item === "string") {
      const id = item;
      const doc = docsById.get(id);
      if (doc) {
        nav.push({ type: "doc", id, label: doc.title });
      }
      continue;
    }
    if (!item || typeof item !== "object") {
      continue;
    }
    const record = item as Record<string, unknown>;
    if (record.type === "doc" && typeof record.id === "string") {
      const doc = docsById.get(record.id);
      if (doc) {
        nav.push({
          type: "doc",
          id: record.id,
          label: String(record.label || doc.title),
        });
      }
      continue;
    }
    if (record.type === "category" && Array.isArray(record.items)) {
      nav.push({
        type: "category",
        label: String(record.label || "Docs"),
        items: flattenSidebarItems(record.items, docsById),
      });
    }
  }
  return nav;
}

async function buildSidebar(
  docs: SourceDoc[],
  localeInputs: Record<Locale, string>,
) {
  const sidebarItems = await loadSidebarConfig();
  const sidebar = {} as Record<Locale, ManifestNavItem[]>;
  for (const locale of Object.keys(localeInputs)) {
    const docsById = new Map(
      docs.filter((doc) => doc.locale === locale).map((doc) => [doc.id, doc]),
    );
    sidebar[locale] = flattenSidebarItems(sidebarItems, docsById);
  }
  return sidebar;
}

async function directorySize(root: string): Promise<number> {
  let total = 0;
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      total += await directorySize(fullPath);
    } else {
      total += (await stat(fullPath)).size;
    }
  }
  return total;
}

async function readManifest() {
  return JSON.parse(
    await readFile(path.join(outputRoot, "manifest.json"), "utf8"),
  ) as HelpDocsManifest;
}

async function validateOutput() {
  const manifest = await readManifest();
  if (manifest.schema !== "zotero-agents.help-docs.v1") {
    throw new Error(`Unexpected help docs schema: ${manifest.schema}`);
  }
  const docsByLocale = new Map<Locale, Set<string>>();
  for (const locale of manifest.locales) {
    docsByLocale.set(locale, new Set<string>());
  }
  for (const doc of manifest.docs) {
    docsByLocale.get(doc.locale)?.add(doc.id);
    await stat(path.join(outputRoot, doc.path));
  }
  for (const asset of manifest.assets) {
    await stat(path.join(outputRoot, asset));
  }
  for (const doc of manifest.docs) {
    const markdown = await readFile(path.join(outputRoot, doc.path), "utf8");
    for (const match of markdown.matchAll(/\]\(#doc\/([^)#?]+)[^)]*\)/g)) {
      const id = decodeURIComponent(match[1]);
      if (!docsByLocale.get(doc.locale)?.has(id)) {
        throw new Error(`${doc.locale}/${doc.id} links to missing doc ${id}`);
      }
    }
    for (const match of markdown.matchAll(
      /chrome:\/\/zotero-skills\/content\/help-docs\/([^)"'\s]+)/g,
    )) {
      await stat(path.join(outputRoot, decodeURIComponent(match[1])));
    }
  }
  const totalBytes = await directorySize(outputRoot);
  if (totalBytes > maxOutputBytes) {
    throw new Error(
      `Built-in help docs exceed size budget: ${totalBytes} > ${maxOutputBytes}`,
    );
  }
  return {
    docs: manifest.docs.length,
    assets: manifest.assets.length,
    totalBytes,
  };
}

async function build() {
  await ensureInsideRepo(outputRoot);
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });
  const localeInputs = await discoverLocaleInputs();
  const locales = Object.keys(localeInputs);
  const docs = await loadSourceDocs(localeInputs);
  const docIdsByLocale = new Map<Locale, Set<string>>();
  for (const locale of locales) {
    docIdsByLocale.set(
      locale,
      new Set(docs.filter((doc) => doc.locale === locale).map((doc) => doc.id)),
    );
  }
  const referencedImages = await writeGeneratedDocs(docs, docIdsByLocale);
  const assets = await writeReferencedAssets(referencedImages);
  const sidebar = await buildSidebar(docs, localeInputs);
  const manifest: HelpDocsManifest = {
    schema: "zotero-agents.help-docs.v1",
    generated_at: new Date().toISOString(),
    default_doc: defaultDoc,
    locales,
    docs: docs
      .map((doc) => ({
        id: doc.id,
        locale: doc.locale,
        title: doc.title,
        path: `docs/${doc.locale}/${toPosix(doc.relativePath)}`,
      }))
      .sort((a, b) =>
        `${a.locale}/${a.id}`.localeCompare(`${b.locale}/${b.id}`),
      ),
    sidebar,
    assets,
  };
  const formattedManifest = await format(JSON.stringify(manifest), {
    parser: "json",
  });
  await writeFile(
    path.join(outputRoot, "manifest.json"),
    formattedManifest,
    "utf8",
  );
  return validateOutput();
}

const checkOnly = process.argv.includes("--check");
const result = checkOnly ? await validateOutput() : await build();
console.log(
  `[help-docs] ${checkOnly ? "checked" : "built"} docs=${result.docs} assets=${result.assets} size=${result.totalBytes}`,
);
