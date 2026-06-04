export const DEFAULT_CITEKEY_TEMPLATE = "{author}_{title}_{year}";
export const CITEKEY_TEMPLATE_KEY = "citekey_template";
const SUPPORTED_LEGACY_CITEKEY_TEMPLATE_TOKENS = new Set(["author", "year", "title"]);
const BBT_LITE_ALLOWED_OBJECTS = new Set(["auth", "year", "title"]);
const BBT_LITE_TEMPLATE_AST_CACHE = new Map();
const BBT_LITE_SKIP_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "into",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

const BBT_LITE_METHOD_SPECS = {
  auth: {
    lower: { minArgs: 0, maxArgs: 0, fn: (value) => String(value || "").toLowerCase() },
    upper: { minArgs: 0, maxArgs: 0, fn: (value) => String(value || "").toUpperCase() },
    nopunct: { minArgs: 0, maxArgs: 0, fn: (value) => normalizeBbtLitePunctuation(value) },
    skipwords: { minArgs: 0, maxArgs: 0, fn: (value) => skipBbtLiteWords(value) },
    select: { minArgs: 1, maxArgs: 2, fn: (value, args) => selectBbtLiteWords(value, args) },
    prefix: { minArgs: 1, maxArgs: 1, fn: (value, args) => prefixBbtLiteChars(value, args) },
    postfix: { minArgs: 1, maxArgs: 1, fn: (value, args) => postfixBbtLiteChars(value, args) },
    initials: { minArgs: 0, maxArgs: 0, fn: (value) => initialsBbtLiteWords(value) },
    trim: { minArgs: 0, maxArgs: 0, fn: (value) => String(value || "").trim() },
    replace: { minArgs: 2, maxArgs: 2, fn: (value, args) => replaceBbtLiteText(value, args) },
    clean: { minArgs: 0, maxArgs: 0, fn: (value) => normalizeBbtLiteWords(value).join(" ") },
    short: { minArgs: 0, maxArgs: 0, fn: (value) => selectBbtLiteWords(value, [1, 1]) },
    abbr: { minArgs: 0, maxArgs: 0, fn: (value) => initialsBbtLiteWords(value) },
  },
  title: {
    lower: { minArgs: 0, maxArgs: 0, fn: (value) => String(value || "").toLowerCase() },
    upper: { minArgs: 0, maxArgs: 0, fn: (value) => String(value || "").toUpperCase() },
    nopunct: { minArgs: 0, maxArgs: 0, fn: (value) => normalizeBbtLitePunctuation(value) },
    skipwords: { minArgs: 0, maxArgs: 0, fn: (value) => skipBbtLiteWords(value) },
    select: { minArgs: 1, maxArgs: 2, fn: (value, args) => selectBbtLiteWords(value, args) },
    prefix: { minArgs: 1, maxArgs: 1, fn: (value, args) => prefixBbtLiteChars(value, args) },
    postfix: { minArgs: 1, maxArgs: 1, fn: (value, args) => postfixBbtLiteChars(value, args) },
    initials: { minArgs: 0, maxArgs: 0, fn: (value) => initialsBbtLiteWords(value) },
    trim: { minArgs: 0, maxArgs: 0, fn: (value) => String(value || "").trim() },
    replace: { minArgs: 2, maxArgs: 2, fn: (value, args) => replaceBbtLiteText(value, args) },
    clean: { minArgs: 0, maxArgs: 0, fn: (value) => normalizeBbtLiteWords(value).join(" ") },
    short: { minArgs: 0, maxArgs: 0, fn: (value) => selectBbtLiteWords(value, [1, 1]) },
    abbr: { minArgs: 0, maxArgs: 0, fn: (value) => initialsBbtLiteWords(value) },
  },
  year: {
    lower: { minArgs: 0, maxArgs: 0, fn: (value) => String(value || "").toLowerCase() },
    upper: { minArgs: 0, maxArgs: 0, fn: (value) => String(value || "").toUpperCase() },
    nopunct: { minArgs: 0, maxArgs: 0, fn: (value) => normalizeBbtLitePunctuation(value) },
    select: { minArgs: 1, maxArgs: 2, fn: (value, args) => selectBbtLiteWords(value, args) },
    prefix: { minArgs: 1, maxArgs: 1, fn: (value, args) => prefixBbtLiteChars(value, args) },
    postfix: { minArgs: 1, maxArgs: 1, fn: (value, args) => postfixBbtLiteChars(value, args) },
    trim: { minArgs: 0, maxArgs: 0, fn: (value) => String(value || "").trim() },
    replace: { minArgs: 2, maxArgs: 2, fn: (value, args) => replaceBbtLiteText(value, args) },
  },
};

function isObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasOwnWorkflowParam(options, key) {
  return (
    isObject(options?.workflowParams) &&
    Object.prototype.hasOwnProperty.call(options.workflowParams, key)
  );
}

function tokenizeBbtLiteTemplate(template) {
  const text = String(template || "");
  const tokens = [];
  let index = 0;
  while (index < text.length) {
    const ch = text[index];
    if (/\s/.test(ch)) {
      index += 1;
      continue;
    }
    if (ch === "+" || ch === "." || ch === "," || ch === "(" || ch === ")") {
      tokens.push({ type: ch, value: ch });
      index += 1;
      continue;
    }
    if (ch === "'") {
      let cursor = index + 1;
      let literal = "";
      let closed = false;
      while (cursor < text.length) {
        const current = text[cursor];
        if (current === "\\") {
          const next = text[cursor + 1];
          if (typeof next === "string") {
            literal += next;
            cursor += 2;
            continue;
          }
          return null;
        }
        if (current === "'") {
          closed = true;
          cursor += 1;
          break;
        }
        literal += current;
        cursor += 1;
      }
      if (!closed) {
        return null;
      }
      tokens.push({ type: "string", value: literal });
      index = cursor;
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let cursor = index + 1;
      while (cursor < text.length && /[0-9]/.test(text[cursor])) {
        cursor += 1;
      }
      tokens.push({ type: "number", value: Number(text.slice(index, cursor)) });
      index = cursor;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let cursor = index + 1;
      while (cursor < text.length && /[A-Za-z0-9_]/.test(text[cursor])) {
        cursor += 1;
      }
      tokens.push({ type: "identifier", value: text.slice(index, cursor) });
      index = cursor;
      continue;
    }
    return null;
  }
  return tokens;
}

function parseBbtLiteTemplate(template) {
  const tokens = tokenizeBbtLiteTemplate(template);
  if (!tokens || tokens.length === 0) {
    return null;
  }
  let cursor = 0;
  const consume = (type) => {
    if (tokens[cursor]?.type === type) {
      const consumed = tokens[cursor];
      cursor += 1;
      return consumed;
    }
    return null;
  };
  const peek = () => tokens[cursor];
  const parseArg = () => {
    const token = peek();
    if (!token) {
      return null;
    }
    if (token.type === "number" || token.type === "string") {
      cursor += 1;
      return token.value;
    }
    return null;
  };
  const parseChain = () => {
    const objectToken = consume("identifier");
    if (!objectToken) {
      return null;
    }
    const chain = {
      type: "chain",
      object: String(objectToken.value || "").toLowerCase(),
      methods: [],
    };
    while (consume(".")) {
      const methodToken = consume("identifier");
      if (!methodToken) {
        return null;
      }
      const method = { name: String(methodToken.value || "").toLowerCase(), args: [] };
      if (consume("(")) {
        if (!consume(")")) {
          const firstArg = parseArg();
          if (firstArg === null) {
            return null;
          }
          method.args.push(firstArg);
          while (consume(",")) {
            const nextArg = parseArg();
            if (nextArg === null) {
              return null;
            }
            method.args.push(nextArg);
          }
          if (!consume(")")) {
            return null;
          }
        }
      }
      chain.methods.push(method);
    }
    return chain;
  };
  const parseTerm = () => {
    const literalToken = consume("string");
    if (literalToken) {
      return { type: "literal", value: String(literalToken.value || "") };
    }
    return parseChain();
  };

  const terms = [];
  const first = parseTerm();
  if (!first) {
    return null;
  }
  terms.push(first);
  while (consume("+")) {
    const next = parseTerm();
    if (!next) {
      return null;
    }
    terms.push(next);
  }
  if (cursor !== tokens.length) {
    return null;
  }
  return { terms };
}

export function isValidLegacyCitekeyTemplate(template) {
  const text = String(template || "");
  if (!text.trim() || !text.includes("{")) {
    return false;
  }
  const openBraces = (text.match(/\{/g) || []).length;
  const closeBraces = (text.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    return false;
  }
  for (const match of text.matchAll(/\{([^{}]+)\}/g)) {
    const token = String(match[1] || "").trim().toLowerCase();
    if (!SUPPORTED_LEGACY_CITEKEY_TEMPLATE_TOKENS.has(token)) {
      return false;
    }
  }
  const stripped = text.replace(/\{[^{}]+\}/g, "");
  return !/[{}]/.test(stripped);
}

export function isValidBbtLiteTemplate(template) {
  const text = String(template || "").trim();
  if (!text || /[{}]/.test(text)) {
    return false;
  }
  const ast = parseBbtLiteTemplate(text);
  if (!ast || !Array.isArray(ast.terms) || ast.terms.length === 0) {
    return false;
  }
  for (const term of ast.terms) {
    if (term.type === "literal") {
      continue;
    }
    if (term.type !== "chain" || !BBT_LITE_ALLOWED_OBJECTS.has(term.object)) {
      return false;
    }
    const methodSpecs = BBT_LITE_METHOD_SPECS[term.object] || {};
    for (const method of term.methods || []) {
      const spec = methodSpecs[method.name];
      if (!spec) {
        return false;
      }
      const count = method.args.length;
      if (count < spec.minArgs || count > spec.maxArgs) {
        return false;
      }
    }
  }
  return true;
}

export function isValidCitekeyTemplate(template) {
  return isValidLegacyCitekeyTemplate(template) || isValidBbtLiteTemplate(template);
}

export function resolveSchemaDefaultTemplate(manifest) {
  const fromSchema = String(manifest?.parameters?.[CITEKEY_TEMPLATE_KEY]?.default || "").trim();
  if (isValidCitekeyTemplate(fromSchema)) {
    return fromSchema;
  }
  return DEFAULT_CITEKEY_TEMPLATE;
}

export function resolveFallbackTemplate(args) {
  const previousCandidate = String(
    args?.previous?.workflowParams?.[CITEKEY_TEMPLATE_KEY] || "",
  ).trim();
  if (isValidCitekeyTemplate(previousCandidate)) {
    return previousCandidate;
  }
  return resolveSchemaDefaultTemplate(args.manifest);
}

export function normalizePersistedSettings(args) {
  const fallbackTemplate = resolveFallbackTemplate(args);
  const nextOptions = { ...(isObject(args.merged) ? args.merged : {}) };
  const nextWorkflowParams = {
    ...((isObject(nextOptions.workflowParams) ? nextOptions.workflowParams : {}) || {}),
  };
  const incomingHasTemplate = hasOwnWorkflowParam(args.incoming, CITEKEY_TEMPLATE_KEY);
  const candidate = String(nextWorkflowParams[CITEKEY_TEMPLATE_KEY] || "").trim();
  if (incomingHasTemplate) {
    nextWorkflowParams[CITEKEY_TEMPLATE_KEY] = isValidCitekeyTemplate(candidate)
      ? candidate
      : fallbackTemplate;
  } else if (!isValidCitekeyTemplate(candidate)) {
    nextWorkflowParams[CITEKEY_TEMPLATE_KEY] = fallbackTemplate;
  }
  return { ...nextOptions, workflowParams: nextWorkflowParams };
}

export function normalizeExecutionWorkflowParams(args) {
  const fallbackTemplate = resolveSchemaDefaultTemplate(args.manifest);
  const normalized = {
    ...((isObject(args.normalizedWorkflowParams) ? args.normalizedWorkflowParams : {}) || {}),
  };
  const candidate = String(normalized[CITEKEY_TEMPLATE_KEY] || "").trim();
  normalized[CITEKEY_TEMPLATE_KEY] = isValidCitekeyTemplate(candidate)
    ? candidate
    : fallbackTemplate;
  return normalized;
}

export function normalizeSettings(args) {
  if (!args || typeof args !== "object") {
    return undefined;
  }
  if (args.phase === "persisted") {
    return normalizePersistedSettings(args);
  }
  if (args.phase === "execution") {
    return normalizeExecutionWorkflowParams(args);
  }
  return undefined;
}

function normalizeBbtLitePunctuation(value) {
  return String(value || "").replace(/[^\p{L}\p{N}\s]/gu, " ");
}

function normalizeBbtLiteWords(value) {
  return normalizeBbtLitePunctuation(value)
    .toLowerCase()
    .split(/\s+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function skipBbtLiteWords(value) {
  return normalizeBbtLiteWords(value)
    .filter((entry) => !BBT_LITE_SKIP_WORDS.has(entry))
    .join(" ");
}

function readPositiveInteger(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  const integer = Math.trunc(parsed);
  return integer > 0 ? integer : null;
}

function selectBbtLiteWords(value, args) {
  const words = normalizeBbtLiteWords(value);
  const start = readPositiveInteger(args?.[0]);
  if (!start) {
    return "";
  }
  const count = readPositiveInteger(args?.[1]) || words.length;
  return words.slice(start - 1, start - 1 + count).join(" ");
}

function prefixBbtLiteChars(value, args) {
  const text = String(value || "").trim();
  const count = readPositiveInteger(args?.[0]);
  if (!count) {
    return "";
  }
  return text.slice(0, count);
}

function postfixBbtLiteChars(value, args) {
  const text = String(value || "").trim();
  const count = readPositiveInteger(args?.[0]);
  if (!count) {
    return "";
  }
  return text.slice(Math.max(0, text.length - count));
}

function initialsBbtLiteWords(value) {
  return normalizeBbtLiteWords(value)
    .map((entry) => entry[0] || "")
    .join("");
}

function replaceBbtLiteText(value, args) {
  const [fromValue, toValue] = Array.isArray(args) ? args : [];
  return String(value || "").split(String(fromValue || "")).join(String(toValue || ""));
}

function getBbtLiteTemplateAst(template) {
  const key = String(template || "").trim();
  if (!key) {
    return null;
  }
  if (!BBT_LITE_TEMPLATE_AST_CACHE.has(key)) {
    BBT_LITE_TEMPLATE_AST_CACHE.set(key, parseBbtLiteTemplate(key));
  }
  return BBT_LITE_TEMPLATE_AST_CACHE.get(key) || null;
}

function getBbtLiteMethodSpec(objectName, methodName) {
  return BBT_LITE_METHOD_SPECS[String(objectName || "").toLowerCase()]?.[
    String(methodName || "").toLowerCase()
  ];
}

function normalizeCitekeyToken(text) {
  return String(text || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function extractFirstReferenceAuthor(reference) {
  const authors = Array.isArray(reference?.author)
    ? reference.author
    : Array.isArray(reference?.authors)
      ? reference.authors
      : typeof reference?.author === "string"
        ? [reference.author]
        : [];
  return String(authors[0] || "").trim();
}

function extractAuthorToken(reference) {
  const firstAuthor = extractFirstReferenceAuthor(reference);
  const normalized = String(firstAuthor || "")
    .replace(/[,，].*$/, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const candidate = normalized.length > 0 ? normalized[normalized.length - 1] : "";
  return normalizeCitekeyToken(candidate);
}

function extractTitleToken(reference) {
  const title = String(reference?.title || "").trim();
  const words = normalizeBbtLiteWords(title).filter(
    (entry) => !BBT_LITE_SKIP_WORDS.has(entry),
  );
  return words.slice(0, 2).join("-");
}

function normalizePredictedCitekey(rendered) {
  return String(rendered || "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/__+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function buildPredictedLegacyCitekey(reference, template) {
  return normalizePredictedCitekey(
    String(template || DEFAULT_CITEKEY_TEMPLATE)
      .replace(/\{author\}/gi, extractAuthorToken(reference))
      .replace(/\{title\}/gi, extractTitleToken(reference))
      .replace(/\{year\}/gi, extractReferenceYear(reference)),
  );
}

function extractReferenceYear(reference) {
  const direct = String(
    reference?.year || reference?.date || reference?.issued || "",
  ).trim();
  const match = direct.match(/\b(1[6-9]\d{2}|20\d{2}|21\d{2})\b/);
  if (match) {
    return match[1];
  }
  const dateParts = reference?.issued?.["date-parts"];
  if (Array.isArray(dateParts) && Array.isArray(dateParts[0])) {
    const year = String(dateParts[0][0] || "").trim();
    const yearMatch = year.match(/\b(1[6-9]\d{2}|20\d{2}|21\d{2})\b/);
    return yearMatch ? yearMatch[1] : "";
  }
  return "";
}

function resolveBbtLiteObjectValue(reference, objectName) {
  const normalizedObject = String(objectName || "").toLowerCase();
  if (normalizedObject === "auth") {
    return extractAuthorToken(reference);
  }
  if (normalizedObject === "year") {
    return extractReferenceYear(reference);
  }
  if (normalizedObject === "title") {
    return String(reference?.title || "").trim();
  }
  return "";
}

function applyBbtLiteMethod(objectName, value, method) {
  const spec = getBbtLiteMethodSpec(objectName, method?.name);
  if (!spec) {
    return "";
  }
  return spec.fn(value, Array.isArray(method?.args) ? method.args : []);
}

function evaluateBbtLiteTemplate(reference, template) {
  const ast = getBbtLiteTemplateAst(template);
  if (!ast) {
    return "";
  }
  let output = "";
  for (const term of ast.terms) {
    if (term.type === "literal") {
      output += term.value;
      continue;
    }
    let current = resolveBbtLiteObjectValue(reference, term.object);
    for (const method of term.methods || []) {
      current = applyBbtLiteMethod(term.object, current, method);
    }
    output += current;
  }
  return normalizePredictedCitekey(output);
}

export function resolveCitekeyTemplate(parameter) {
  const configured = String(parameter?.citekey_template || "").trim();
  return isValidCitekeyTemplate(configured) ? configured : DEFAULT_CITEKEY_TEMPLATE;
}

export function buildPredictedCitekey(reference, template) {
  const normalizedTemplate = String(template || "").trim();
  if (isValidLegacyCitekeyTemplate(normalizedTemplate)) {
    return buildPredictedLegacyCitekey(reference, normalizedTemplate);
  }
  if (isValidBbtLiteTemplate(normalizedTemplate)) {
    return evaluateBbtLiteTemplate(reference, normalizedTemplate);
  }
  return buildPredictedLegacyCitekey(reference, DEFAULT_CITEKEY_TEMPLATE);
}
