(function () {
  "use strict";

  const PROFILE_OPTIONS = {
    document: {
      html: true,
      breaks: false,
      linkify: true,
      highlight: true,
      mathOutput: "htmlAndMathML",
    },
    preview: {
      html: false,
      breaks: false,
      linkify: true,
      highlight: true,
      mathOutput: "htmlAndMathML",
    },
    transcript: {
      html: false,
      breaks: true,
      linkify: false,
      highlight: false,
      mathOutput: "htmlAndMathML",
    },
    synthesis: {
      html: true,
      breaks: false,
      linkify: true,
      highlight: false,
      mathOutput: "htmlAndMathML",
    },
    standaloneDigest: {
      html: true,
      breaks: false,
      linkify: true,
      highlight: false,
      mathOutput: "htmlAndMathML",
    },
  };

  const UNSAFE_TAGS =
    "script, style, iframe, frame, frameset, object, embed, applet, form, input, textarea, select, button";
  const ALLOWED_PROTOCOLS = new Set([
    "http:",
    "https:",
    "mailto:",
    "zotero:",
    "chrome:",
    "resource:",
    "file:",
  ]);
  const ALLOWED_DATA_IMAGE = /^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);/i;

  const parserCache = new Map();

  function escapeHtml(value) {
    return String(value || "").replace(
      /[&<>"']/g,
      (ch) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[ch],
    );
  }

  function optionForProfile(profile) {
    return PROFILE_OPTIONS[profile] || PROFILE_OPTIONS.document;
  }

  function highlightCode(source, language) {
    const runtime = window.hljs;
    if (!runtime) {
      return "";
    }
    try {
      if (language && runtime.getLanguage && runtime.getLanguage(language)) {
        return runtime.highlight(String(source || ""), {
          language,
          ignoreIllegals: true,
        }).value;
      }
      if (runtime.highlightAuto) {
        return runtime.highlightAuto(String(source || "")).value;
      }
    } catch {
      return "";
    }
    return "";
  }

  function parserForOptions(options) {
    const profile = String(options.profile || "document");
    const base = optionForProfile(profile);
    const key = JSON.stringify({
      profile,
      html: options.allowHtml ?? base.html,
      breaks: options.breaks ?? base.breaks,
      linkify: options.linkify ?? base.linkify,
      highlight: options.highlight ?? base.highlight,
      mathOutput: options.mathOutput || base.mathOutput,
    });
    if (parserCache.has(key)) {
      return parserCache.get(key);
    }
    if (typeof window.markdownit !== "function") {
      parserCache.set(key, null);
      return null;
    }
    const parser = window.markdownit({
      html: options.allowHtml ?? base.html,
      xhtmlOut: false,
      breaks: options.breaks ?? base.breaks,
      linkify: options.linkify ?? base.linkify,
      langPrefix: "language-",
      highlight:
        (options.highlight ?? base.highlight)
          ? function (source, language) {
              return highlightCode(source, language);
            }
          : null,
    });
    if (window.texmath && window.katex) {
      try {
        parser.use(window.texmath, {
          engine: window.katex,
          delimiters: "dollars",
          katexOptions: {
            throwOnError: false,
            output: options.mathOutput || base.mathOutput,
          },
        });
      } catch {
        // Markdown remains usable without math support.
      }
    }
    parserCache.set(key, parser);
    return parser;
  }

  function fallbackInline(value) {
    return escapeHtml(value)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>");
  }

  function fallbackRender(markdown, options) {
    if ((options.profile || "") === "transcript") {
      return escapeHtml(markdown).replace(/\n/g, "<br>");
    }
    const lines = String(markdown || "")
      .replace(/\r\n?/g, "\n")
      .split("\n");
    const html = [];
    let paragraph = [];
    let list = [];
    let code = [];
    let inCode = false;
    const flushParagraph = () => {
      const text = paragraph.join(" ").trim();
      paragraph = [];
      if (text) {
        html.push(`<p>${fallbackInline(text)}</p>`);
      }
    };
    const flushList = () => {
      if (list.length) {
        html.push(
          `<ul>${list.map((item) => `<li>${fallbackInline(item)}</li>`).join("")}</ul>`,
        );
        list = [];
      }
    };
    for (const raw of lines) {
      const line = raw || "";
      if (/^```/.test(line.trim())) {
        if (inCode) {
          html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
          code = [];
          inCode = false;
        } else {
          flushParagraph();
          flushList();
          inCode = true;
        }
        continue;
      }
      if (inCode) {
        code.push(line);
        continue;
      }
      const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
      if (heading) {
        flushParagraph();
        flushList();
        const level = Math.min(6, Math.max(1, heading[1].length));
        html.push(`<h${level}>${fallbackInline(heading[2])}</h${level}>`);
        continue;
      }
      const listItem = /^\s*[-*+]\s+(.+)$/.exec(line);
      if (listItem) {
        flushParagraph();
        list.push(listItem[1]);
        continue;
      }
      if (!line.trim()) {
        flushParagraph();
        flushList();
        continue;
      }
      paragraph.push(line.trim());
    }
    flushParagraph();
    flushList();
    if (inCode) {
      html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
    }
    return html.join("\n");
  }

  function normalizeBaseFileUri(value) {
    const raw = String(value || "").trim();
    if (!raw) {
      return "";
    }
    try {
      const url = new URL(raw);
      if (!url.href.endsWith("/")) {
        const parts = url.href.split("/");
        parts.pop();
        return parts.join("/") + "/";
      }
      return url.href;
    } catch {
      return "";
    }
  }

  function safeResolvedUrl(rawValue, options) {
    const value = String(rawValue || "").trim();
    if (!value) {
      return "";
    }
    if (value.startsWith("#")) {
      return value;
    }
    if (ALLOWED_DATA_IMAGE.test(value)) {
      return value;
    }
    try {
      const base = normalizeBaseFileUri(options.baseFileUri);
      const url =
        base && !/^[a-z][a-z0-9+.-]*:/i.test(value)
          ? new URL(value, base)
          : new URL(value);
      if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
        return "";
      }
      if (url.protocol === "file:" && base && !url.href.startsWith(base)) {
        return "";
      }
      return url.href;
    } catch {
      return "";
    }
  }

  function sanitizeRenderedHtml(html, options) {
    const template = document.createElement("template");
    template.innerHTML = String(html || "");
    template.content.querySelectorAll(UNSAFE_TAGS).forEach((node) => {
      node.remove();
    });
    template.content.querySelectorAll("*").forEach((node) => {
      Array.from(node.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase();
        const value = String(attr.value || "");
        if (name.startsWith("on")) {
          node.removeAttribute(attr.name);
          return;
        }
        if (name === "style" && !/\bkatex\b/.test(node.className || "")) {
          node.removeAttribute(attr.name);
          return;
        }
        if (name === "href" || name === "src") {
          const resolved = safeResolvedUrl(value, options);
          if (!resolved) {
            node.removeAttribute(attr.name);
          } else {
            node.setAttribute(attr.name, resolved);
          }
        }
        if (name === "srcset") {
          node.removeAttribute(attr.name);
        }
      });
      if (node.tagName === "A") {
        const href = node.getAttribute("href") || "";
        if (href && !href.startsWith("#")) {
          node.setAttribute("target", "_blank");
          node.setAttribute("rel", "noopener noreferrer");
        }
      }
      if (node.tagName === "IMG") {
        node.setAttribute("loading", "lazy");
      }
    });
    return template.innerHTML;
  }

  function ensureHeadingIds(root, options) {
    const prefix = String(options.headingIdPrefix || "markdown-heading");
    const seen = new Set();
    root
      .querySelectorAll("h1, h2, h3, h4, h5, h6")
      .forEach((heading, index) => {
        if (!heading.id) {
          const slug = String(heading.textContent || "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
            .replace(/^-+|-+$/g, "");
          heading.id = `${prefix}-${slug || index + 1}`;
        }
        let candidate = heading.id;
        let suffix = 2;
        while (seen.has(candidate)) {
          candidate = `${heading.id}-${suffix}`;
          suffix += 1;
        }
        heading.id = candidate;
        seen.add(candidate);
      });
  }

  function bindLocalAnchors(root, options) {
    root.querySelectorAll("a[href^='#']").forEach((anchor) => {
      anchor.addEventListener("click", (event) => {
        const href = anchor.getAttribute("href") || "";
        const rawId = href.slice(1);
        let id = rawId;
        try {
          id = decodeURIComponent(rawId);
        } catch {
          id = rawId;
        }
        const target = id ? root.querySelector(`#${CSS.escape(id)}`) : null;
        if (!target) {
          return;
        }
        event.preventDefault();
        if (typeof options.onNavigate === "function") {
          options.onNavigate(target);
        } else {
          target.scrollIntoView({ block: "start", inline: "nearest" });
        }
      });
    });
  }

  function renderToHtml(markdown, options) {
    const renderOptions = options || {};
    const parser = parserForOptions(renderOptions);
    let html = "";
    try {
      html = parser
        ? parser.render(String(markdown || ""))
        : fallbackRender(String(markdown || ""), renderOptions);
    } catch {
      html = fallbackRender(String(markdown || ""), renderOptions);
    }
    return sanitizeRenderedHtml(html, renderOptions);
  }

  function renderInto(container, markdown, options) {
    if (!container) {
      return null;
    }
    const renderOptions = options || {};
    container.innerHTML = renderToHtml(markdown, renderOptions);
    ensureHeadingIds(container, renderOptions);
    bindLocalAnchors(container, renderOptions);
    if (typeof renderOptions.afterRender === "function") {
      renderOptions.afterRender(container);
    }
    return container;
  }

  function buildOutline(root, options) {
    const outlineOptions = options || {};
    const headings = Array.from(root.querySelectorAll("h1, h2, h3, h4")).filter(
      (heading) => heading.id,
    );
    if (!headings.length) {
      return null;
    }
    const nav = document.createElement("nav");
    nav.className = outlineOptions.navClassName || "markdown-outline";
    nav.setAttribute(
      "aria-label",
      outlineOptions.ariaLabel || "Markdown outline",
    );
    const title = document.createElement("strong");
    title.textContent = outlineOptions.title || "Outline";
    nav.appendChild(title);
    headings.forEach((heading) => {
      const level = Number(heading.tagName.replace(/\D/g, "")) || 2;
      const link = document.createElement("a");
      link.className = `${outlineOptions.linkClassName || "markdown-outline-link"} depth-${Math.max(1, Math.min(4, level))}`;
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent || heading.id;
      link.addEventListener("click", (event) => {
        event.preventDefault();
        heading.scrollIntoView({ block: "start", inline: "nearest" });
      });
      nav.appendChild(link);
    });
    return nav;
  }

  window.ZoteroSkillsMarkdownRenderer = {
    renderToHtml,
    renderInto,
    buildOutline,
    sanitizeRenderedHtml,
  };
})();
