// Shared markdown-it singleton for the sidebar child pages (design Decision 7
// of openspec/changes/2026-07-21-assistant-workspace-skillrunner-convergence).
// The vendor <script> tags (markdown-it / texmath / katex) stay page-level
// static assets (assistant-sidebar-build-pipeline spec); this module only
// memoizes parser construction, which previously happened on every render
// call in assistantWorkspaceAcpChild.js.

let sharedParser = null;

function createMarkdownParser() {
  if (
    typeof window === "undefined" ||
    typeof window.markdownit !== "function"
  ) {
    return null;
  }
  const parser = window.markdownit({
    html: false,
    breaks: true,
    linkify: false,
  });
  if (window.texmath && window.katex) {
    parser.use(window.texmath, {
      engine: window.katex,
      delimiters: "dollars",
      katexOptions: { throwOnError: false },
    });
  }
  return parser;
}

function getMarkdownParser() {
  if (!sharedParser) {
    sharedParser = createMarkdownParser();
  }
  return sharedParser;
}

export function renderSidebarMarkdown(value) {
  const input = String(value == null ? "" : value);
  const parser = getMarkdownParser();
  if (!parser) {
    return input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");
  }
  try {
    return parser.render(input);
  } catch (_error) {
    return input;
  }
}
