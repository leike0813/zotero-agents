/**
 * Executed structural coverage for the synthesis sidecar protocol registry.
 *
 * Enumerates the structural obligations reachable from registry roots and
 * decides coverage by executing the production validator: a positive corpus
 * case has to actually validate, and a derived constraint case has to actually
 * be rejected at the mutated location. Fixture names and static declarations
 * never count, and an obligation without a usable positive seed stays
 * uncovered.
 *
 * Each obligation is one location and one direction, so an accepted bound and
 * a rejected out-of-bound value are separate obligations. A schema location
 * shared by many roots keeps a single verification with a list of contexts, so
 * the registry size never multiplies the work.
 *
 * Pure functions only: the filesystem and Ajv live in the caller, which passes a
 * schema resolver and the production validating callback.
 */

export type CoverageSchemaObject = Record<string, unknown>;

export type CoverageSchemaResolution = {
  canonicalRef: string;
  relativePath: string;
  node: unknown;
  schema: CoverageSchemaObject;
};

export type CoverageResolver = (
  ref: string,
  fromFile?: string,
) => CoverageSchemaResolution | undefined;

export type CoverageValidationError = {
  instancePath?: string;
  keyword?: string;
  params?: Record<string, unknown>;
};

export type CoverageValidation = {
  valid: boolean;
  errors?: readonly CoverageValidationError[];
};

export type CoverageValidator = (
  schemaRef: string,
  value: unknown,
) => CoverageValidation;

export type StructureCoverageRoot = { id: string; ref: string };

export type StructureCoverageCase = {
  id: string;
  schemaRef: string;
  valid: boolean;
  value: unknown;
};

export type StructureObligation = {
  id: string;
  kind: string;
  canonicalRef: string;
  rootIds: string[];
};

export type StructureNegativeOutcome =
  | "covered"
  | "violated"
  | "unattributed"
  | "skipped";

export type StructureNegative = {
  id: string;
  obligationId: string;
  caseId: string;
  schemaRef: string;
  expectValid: boolean;
  instancePath: string;
  keyword?: string;
  outcome: StructureNegativeOutcome;
  value?: unknown;
};

export type StructureCoverageAxis = {
  total: number;
  covered: number;
  uncovered: string[];
};

/** Per-plan verification budget: what it allowed, what it used, what it cut short. */
export type StructureVerificationBudget = {
  limit: number;
  attempts: number;
  exhausted: string[];
};

export type StructureCoverageResult = {
  complete: boolean;
  truncated: boolean;
  verificationBudget: StructureVerificationBudget;
  structure: StructureCoverageAxis;
  obligations: StructureObligation[];
  negatives: StructureNegative[];
  covered: string[];
  violations: string[];
  seededRoots: string[];
};

export type StructureCoverageInput = {
  roots: readonly StructureCoverageRoot[];
  resolveSchema: CoverageResolver;
  validate: CoverageValidator;
  corpus: readonly StructureCoverageCase[];
  /** Retain derived case values for caller re-validation. Off by default. */
  captureValues?: boolean;
  /** Stream rooted witnesses separately from local branch verdicts. */
  onWitness?: (
    witness: StructureNegative & {
      root: {
        schemaRef: string;
        value: unknown;
        seedValue: unknown;
        valid: boolean;
        errors?: readonly CoverageValidationError[];
      };
    },
  ) => void;
  /** Traversal budget; exceeding it surfaces as an uncovered obligation. */
  maxVisits?: number;
  /**
   * Per-plan verification attempts; an exhausted plan keeps its obligation
   * uncovered and is reported in verificationBudget.exhausted.
   */
  maxVerificationAttempts?: number;
  /** Resource limit only; skipped array-bound obligations remain uncovered. */
  maxProbeRows?: number;
  maxProbeBytes?: number;
};

type WalkState = {
  documentRef: string;
  canonicalRef: string;
  relativePath: string;
  node: unknown;
  pointer: string;
  instancePath: InstanceSegment[];
  /** True inside a union branch or an if guard, where the local verdict moves control flow. */
  guarded: boolean;
  predicate?: boolean;
  composedRequired?: readonly string[];
  scalarConstraints?: { minLength: number; patterns: string[] };
};

/**
 * A map member key is unknown while walking the schema, so it stays a
 * placeholder until a seed value supplies real member names: a declared
 * pattern selects matching keys, or `null` selects keys that are neither
 * declared properties nor pattern matches.
 */
type MapKeySpec = {
  pattern: string | null;
  declared: readonly string[];
  patterns: readonly string[];
};

type InstanceSegment = string | MapKeySpec | { items: true };

type PlanContext = {
  rootId: string;
  location: string;
  instancePath: InstanceSegment[];
  guarded: boolean;
  predicate?: boolean;
  branchRef?: string;
  ifRef?: string;
  thenRef?: string;
  elseRef?: string;
};

type MutationPlan = {
  kind: "mutation";
  obligationId: string;
  expectValid: boolean;
  keyword?: string;
  paramMatch?: Record<string, unknown>;
  typeProbes?: unknown[];
  apply: (
    value: unknown,
    path: readonly string[],
  ) => { value: unknown; applied: boolean };
  contexts: PlanContext[];
  contextKeys: Set<string>;
};

type BranchPlan = {
  kind: "branch";
  obligationId: string;
  expectValid: boolean;
  contexts: PlanContext[];
  contextKeys: Set<string>;
};

type ConditionalPlan = {
  kind: "conditional";
  thenObligationId: string;
  elseObligationId: string;
  contexts: PlanContext[];
  contextKeys: Set<string>;
};

type Plan = MutationPlan | BranchPlan | ConditionalPlan;

type Budget = { remaining: number; truncated: boolean };

/**
 * Replay log for one subtree walk: an already walked (schema ref, pointer,
 * instance path) is reused for every later root context instead of being
 * traversed again, while still attaching the new root to its obligations.
 */
type WalkTrace = {
  log: (
    | { kind: "obligation"; id: string }
    | { kind: "context"; planKey: string; context: PlanContext }
  )[];
  memo: Map<string, { from: number; to: number }>;
};

const DEFAULT_MAX_VISITS = 20_000;
/** Exhausted attempts remain uncovered and appear in the report. */
const DEFAULT_MAX_VERIFICATION_ATTEMPTS = 8;
const MAX_CHAIN = 64;
const TYPE_PROBES: unknown[] = ["__probe__", 987_654_321, true, [], {}];
const PATTERN_PROBES = [
  "\u0000",
  " ",
  "!!!",
  "-1",
  "/absolute",
  "../relative",
  "C:/path",
  "__probe__",
  "",
];
const UNICODE_PAIR = "\u{1F600}";

function asObject(value: unknown): CoverageSchemaObject | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as CoverageSchemaObject)
    : undefined;
}

function documentOf(canonicalRef: string) {
  return canonicalRef.split("#", 2)[0] || canonicalRef;
}

function fragmentOf(canonicalRef: string) {
  const [, fragment = ""] = canonicalRef.split("#", 2);
  return fragment;
}

function escapePointer(segment: string) {
  return segment.replaceAll("~", "~0").replaceAll("/", "~1");
}

function instancePointer(path: readonly string[]) {
  return path.length === 0 ? "" : `/${path.map(escapePointer).join("/")}`;
}

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function schemaTypes(type: unknown): string[] {
  if (typeof type === "string") return [type];
  return Array.isArray(type)
    ? type.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function jsonTypeOf(value: unknown) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number")
    return Number.isInteger(value) ? "integer" : "number";
  return typeof value;
}

function acceptsType(types: readonly string[], value: unknown) {
  const actual = jsonTypeOf(value);
  return (
    types.includes(actual) || (actual === "integer" && types.includes("number"))
  );
}

function wrongTypeProbe(types: readonly string[]) {
  return TYPE_PROBES.find((probe) => !acceptsType(types, probe));
}

function valueProbe(value: unknown): unknown {
  if (typeof value === "string") return `${value}~probe`;
  if (typeof value === "number") return value + 1;
  if (typeof value === "boolean") return !value;
  if (value === null) return "__probe__";
  if (Array.isArray(value)) return ["__probe__"];
  return { __probe__: true };
}

function readPath(value: unknown, path: readonly string[]) {
  let current = value;
  for (const segment of path) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index) || index < 0 || index >= current.length)
        return { found: false as const, value: undefined };
      current = current[index];
      continue;
    }
    const record = asObject(current);
    if (!record || !Object.prototype.hasOwnProperty.call(record, segment))
      return { found: false as const, value: undefined };
    current = record[segment];
  }
  return { found: true as const, value: current };
}

function replaceAtPath(
  value: unknown,
  path: readonly string[],
  next: unknown,
): { value: unknown; applied: boolean } {
  if (path.length === 0) return { value: next, applied: true };
  const clone = structuredClone(value);
  const parent = readPath(clone, path.slice(0, -1));
  const key = path[path.length - 1] as string;
  if (Array.isArray(parent.value)) {
    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index >= parent.value.length)
      return { value, applied: false };
    parent.value[index] = next;
    return { value: clone, applied: true };
  }
  const record = asObject(parent.value);
  if (!record) return { value, applied: false };
  record[key] = next;
  return { value: clone, applied: true };
}

function setMemberAtPath(
  value: unknown,
  path: readonly string[],
  member: string,
  next: unknown,
) {
  const clone = structuredClone(value);
  const target = asObject(readPath(clone, path).value);
  if (!target) return { value, applied: false };
  target[member] = next;
  return { value: clone, applied: true };
}

function removeMemberAtPath(
  value: unknown,
  path: readonly string[],
  member: string,
  absentCounts = false,
) {
  const clone = structuredClone(value);
  const target = asObject(readPath(clone, path).value);
  if (!target) return { value, applied: false };
  if (!Object.prototype.hasOwnProperty.call(target, member))
    return absentCounts ? { value, applied: true } : { value, applied: false };
  delete target[member];
  return { value: clone, applied: true };
}

function memberPresent(
  value: unknown,
  path: readonly string[],
  member: string,
) {
  const target = asObject(readPath(value, path).value);
  return Boolean(
    target && Object.prototype.hasOwnProperty.call(target, member),
  );
}

function buildArray(
  value: unknown,
  path: readonly string[],
  length: number,
  allowRepeat: boolean,
  maxProbeRows: number,
  maxProbeBytes: number,
  enumValues?: readonly unknown[],
) {
  const seed = readPath(value, path);
  if (!seed.found || !Array.isArray(seed.value))
    return { value, applied: false };
  const source = seed.value as unknown[];
  if (length > maxProbeRows) return { value, applied: false };
  if (length > 0 && source.length === 0 && !enumValues)
    return { value, applied: false };
  const expandable =
    !allowRepeat && source.every((item) => typeof item === "string");
  const numeric =
    !allowRepeat && source.every((item) => Number.isSafeInteger(item));
  if (!allowRepeat && enumValues && length > enumValues.length)
    return { value, applied: false };
  if (
    !allowRepeat &&
    !expandable &&
    !numeric &&
    !enumValues &&
    length > source.length
  )
    return { value, applied: false };
  const next: unknown[] = [];
  const templates = structuredClone(source);
  const templateBytes = templates.map((item) => JSON.stringify(item).length);
  const seen = new Set<unknown>(source);
  for (let index = 0; index < length; index += 1) {
    if (!allowRepeat && enumValues) {
      next.push(structuredClone(enumValues[index]));
    } else if (numeric && index >= source.length) {
      let candidate = index + 1;
      while (seen.has(candidate)) candidate += 1;
      seen.add(candidate);
      next.push(candidate);
    } else if (expandable && index >= source.length) {
      let candidate = `${source[index % source.length]}:${index}`;
      while (seen.has(candidate)) candidate += ":probe";
      seen.add(candidate);
      next.push(candidate);
    } else {
      const template = allowRepeat ? index % source.length : index;
      if (templateBytes[template]! * length > maxProbeBytes)
        return { value, applied: false };
      next.push(templates[template]);
    }
  }
  return replaceAtPath(value, path, next);
}

function safeMatches(pattern: string, subject: string) {
  try {
    return new RegExp(pattern).test(subject);
  } catch {
    return false;
  }
}

function patternProbe(pattern: string) {
  return PATTERN_PROBES.find((probe) => !safeMatches(pattern, probe));
}

function instancePathKey(segments: readonly InstanceSegment[]) {
  return JSON.stringify(segments);
}

/**
 * Replaces map key placeholders with the member names a seed actually carries,
 * so a map sub-obligation is verified against real instances instead of a
 * placeholder no value can match. A map with no matching key yields no path
 * and stays uncovered.
 */
function resolveInstancePaths(
  value: unknown,
  segments: readonly InstanceSegment[],
): string[][] {
  let paths: string[][] = [[]];
  for (const segment of segments) {
    const next: string[][] = [];
    for (const base of paths) {
      if (typeof segment === "string") {
        next.push([...base, segment]);
        continue;
      }
      if ("items" in segment) {
        const array = readPath(value, base).value;
        if (!Array.isArray(array)) continue;
        const seen = new Set<string>();
        array.forEach((item, index) => {
          const identity = JSON.stringify(item);
          if (seen.has(identity)) return;
          seen.add(identity);
          next.push([...base, String(index)]);
        });
        continue;
      }
      const members = asObject(readPath(value, base).value);
      if (!members) continue;
      for (const key of Object.keys(members)) {
        if (segment.pattern !== null) {
          if (!safeMatches(segment.pattern, key)) continue;
        } else if (
          segment.declared.includes(key) ||
          segment.patterns.some((pattern) => safeMatches(pattern, key))
        ) {
          continue;
        }
        next.push([...base, key]);
      }
    }
    paths = next;
    if (paths.length === 0) break;
  }
  return paths;
}

function unknownMemberName(
  properties: CoverageSchemaObject,
  patterns: readonly string[],
) {
  const candidates = [
    ...Array.from({ length: 100 }, (_, index) => `__unexpected_${index}`),
    "__unexpected__",
    ...PATTERN_PROBES,
  ];
  for (const candidate of candidates) {
    if (Object.prototype.hasOwnProperty.call(properties, candidate)) continue;
    if (patterns.some((pattern) => safeMatches(pattern, candidate))) continue;
    return candidate;
  }
  return undefined;
}

function childStates(row: CoverageSchemaObject, state: WalkState): WalkState[] {
  const children: WalkState[] = [];
  const descend = (
    node: unknown,
    pointerSuffix: string,
    instanceSegment?: InstanceSegment,
    guarded = state.guarded,
  ) => {
    children.push({
      ...state,
      node,
      guarded,
      predicate: state.predicate,
      pointer: `${state.pointer}${pointerSuffix}`,
      instancePath:
        instanceSegment === undefined
          ? state.instancePath
          : [...state.instancePath, instanceSegment],
      composedRequired:
        instanceSegment === undefined ? state.composedRequired : undefined,
      scalarConstraints:
        instanceSegment === undefined ? state.scalarConstraints : undefined,
    });
  };
  const properties = asObject(row.properties) || {};
  const patternMap = asObject(row.patternProperties) || {};
  const declared = Object.keys(properties);
  const patterns = Object.keys(patternMap);
  for (const [name, child] of Object.entries(properties))
    descend(child, `/properties/${escapePointer(name)}`, name);
  for (const [pattern, child] of Object.entries(patternMap))
    descend(child, `/patternProperties/${escapePointer(pattern)}`, {
      pattern,
      declared,
      patterns,
    });
  if (typeof row.items === "object")
    descend(row.items, "/items", { items: true });
  if (Array.isArray(row.prefixItems))
    row.prefixItems.forEach((child, index) => {
      if (typeof child === "object")
        descend(child, `/prefixItems/${index}`, String(index));
    });
  for (const keyword of ["oneOf", "anyOf", "allOf"] as const) {
    const branches = row[keyword];
    if (!Array.isArray(branches)) continue;
    branches.forEach((child, index) => {
      if (typeof child === "object")
        descend(
          child,
          `/${keyword}/${index}`,
          undefined,
          state.guarded || keyword !== "allOf",
        );
    });
  }
  for (const keyword of ["if", "then", "else", "not"] as const) {
    if (typeof row[keyword] === "object") {
      descend(row[keyword], `/${keyword}`, undefined, true);
      if (keyword === "if" || keyword === "not")
        children.at(-1)!.predicate = true;
    }
  }
  if (typeof row.additionalProperties === "object")
    descend(row.additionalProperties, "/additionalProperties", {
      pattern: null,
      declared,
      patterns,
    });
  return children;
}

function collectNode(
  state: WalkState,
  rootId: string,
  obligations: Map<string, StructureObligation>,
  plans: Map<string, Plan>,
  trace: WalkTrace,
  maxProbeRows: number,
  maxProbeBytes: number,
  resolveSchema: CoverageResolver,
) {
  const row = asObject(state.node);
  if (!row) return;
  const { documentRef, pointer, instancePath } = state;
  const location = `${documentRef}#${pointer}`;
  const define = (suffix: string, kind: string) => {
    const id = `${location}${suffix}::${kind}`;
    const existing = obligations.get(id);
    if (existing) {
      if (!existing.rootIds.includes(rootId)) existing.rootIds.push(rootId);
    } else {
      obligations.set(id, {
        id,
        kind,
        canonicalRef: `${location}${suffix}`,
        rootIds: [rootId],
      });
    }
    trace.log.push({ kind: "obligation", id });
    return id;
  };
  const context = (extra: Partial<PlanContext> = {}): PlanContext => ({
    rootId,
    location,
    instancePath,
    guarded: state.guarded,
    predicate: state.predicate,
    ...extra,
  });
  const register = <T extends Plan>(
    key: string,
    create: () => T,
    ctx: PlanContext,
  ) => {
    const existing = plans.get(key);
    if (!existing) {
      const plan = create();
      plan.contexts.push(ctx);
      plan.contextKeys.add(
        `${ctx.rootId}|${ctx.location}|${instancePathKey(ctx.instancePath)}`,
      );
      plans.set(key, plan);
      trace.log.push({ kind: "context", planKey: key, context: ctx });
      return;
    }
    const dedupe = `${ctx.rootId}|${ctx.location}|${instancePathKey(ctx.instancePath)}`;
    if (existing.contextKeys.has(dedupe)) return;
    existing.contextKeys.add(dedupe);
    existing.contexts.push(ctx);
    trace.log.push({ kind: "context", planKey: key, context: ctx });
  };
  const plan = (
    kind: string,
    expectValid: boolean,
    keyword: string | undefined,
    apply: MutationPlan["apply"],
    paramMatch?: Record<string, unknown>,
    typeProbes?: unknown[],
  ) => {
    const id = define("", kind);
    register(
      id,
      () => ({
        kind: "mutation",
        obligationId: id,
        expectValid,
        keyword,
        paramMatch,
        typeProbes,
        apply,
        contexts: [],
        contextKeys: new Set<string>(),
      }),
      context(),
    );
  };
  const planBound = (
    kind: string,
    expectValid: boolean,
    keyword: string | undefined,
    apply: MutationPlan["apply"],
  ) =>
    plan(
      `${kind}:${expectValid ? "accept" : "reject"}`,
      expectValid,
      keyword,
      apply,
    );
  const planBranch = (
    obligationSuffix: string,
    kind: string,
    refSuffix: string,
    expectValid: boolean,
  ) => {
    const id = define(obligationSuffix, kind);
    register(
      id,
      () => ({
        kind: "branch",
        obligationId: id,
        expectValid,
        contexts: [],
        contextKeys: new Set<string>(),
      }),
      context({ branchRef: `${documentRef}#${pointer}${refSuffix}` }),
    );
  };

  const types = schemaTypes(row.type);
  const minLength = finiteNumber(row.minLength);
  const maxLength = finiteNumber(row.maxLength);
  const minItems = finiteNumber(row.minItems);
  const maxItems = finiteNumber(row.maxItems);
  const minimum = finiteNumber(row.minimum);
  const maximum = finiteNumber(row.maximum);
  const exclusiveMinimum = finiteNumber(row.exclusiveMinimum);
  const exclusiveMaximum = finiteNumber(row.exclusiveMaximum);
  const multipleOf = finiteNumber(row.multipleOf);
  const minProperties = finiteNumber(row.minProperties);
  const maxProperties = finiteNumber(row.maxProperties);
  const properties = asObject(row.properties) || {};
  const patterns = Object.keys(asObject(row.patternProperties) || {});
  const requiredNames = new Set(
    Array.isArray(row.required)
      ? row.required.filter((name): name is string => typeof name === "string")
      : [],
  );
  const closedKeyword =
    row.additionalProperties === false
      ? "additionalProperties"
      : row.unevaluatedProperties === false
        ? "unevaluatedProperties"
        : undefined;

  if (types.length > 0) {
    const probe = wrongTypeProbe(types);
    if (probe !== undefined)
      plan(
        `type:${types.join("|")}:reject`,
        false,
        "type",
        (value, path) => replaceAtPath(value, path, probe),
        undefined,
        TYPE_PROBES.filter((candidate) => !acceptsType(types, candidate)),
      );
  }

  if ("const" in row) {
    plan("const:accept", true, undefined, (value, path) =>
      replaceAtPath(value, path, structuredClone(row.const)),
    );
    const probe = valueProbe(row.const);
    if (JSON.stringify(probe) !== JSON.stringify(row.const))
      plan("const:reject", false, "const", (value, path) =>
        replaceAtPath(value, path, probe),
      );
  }

  if (Array.isArray(row.enum) && row.enum.length > 0) {
    row.enum.forEach((member) =>
      plan(
        `enum:${JSON.stringify(member)}:accept`,
        true,
        undefined,
        (value, path) => replaceAtPath(value, path, structuredClone(member)),
      ),
    );
    const probe = valueProbe(row.enum[0]);
    if (
      !row.enum.some(
        (member) => JSON.stringify(member) === JSON.stringify(probe),
      )
    )
      plan("enum:reject", false, "enum", (value, path) =>
        replaceAtPath(value, path, probe),
      );
  }

  if (types.includes("null"))
    plan("null:accept", true, undefined, (value, path) =>
      replaceAtPath(value, path, null),
    );

  if (typeof row.pattern === "string") {
    const probe = patternProbe(row.pattern);
    if (probe !== undefined)
      plan(`pattern:${row.pattern}:reject`, false, "pattern", (value, path) =>
        replaceAtPath(value, path, probe),
      );
  }

  if (types.includes("string")) {
    const lengthAllowsEmpty =
      (state.scalarConstraints?.minLength ?? minLength ?? 0) === 0;
    const patternAllowsEmpty = (
      state.scalarConstraints?.patterns ??
      (typeof row.pattern === "string" ? [row.pattern] : [])
    ).every((pattern) => safeMatches(pattern, ""));
    const allowed = lengthAllowsEmpty && patternAllowsEmpty;
    plan(
      allowed ? "empty:accept" : "empty:reject",
      allowed,
      allowed ? undefined : lengthAllowsEmpty ? "pattern" : "minLength",
      (value, path) => replaceAtPath(value, path, ""),
    );
  }

  if (minLength !== undefined) {
    planBound("minLength", true, undefined, (value, path) =>
      replaceAtPath(value, path, "a".repeat(minLength)),
    );
    if (minLength > 0)
      planBound("minLength", false, "minLength", (value, path) =>
        replaceAtPath(value, path, "a".repeat(minLength - 1)),
      );
    if (minLength >= 2)
      planBound("length-unicode:min", false, "minLength", (value, path) =>
        replaceAtPath(value, path, UNICODE_PAIR.repeat(minLength - 1)),
      );
  }

  if (maxLength !== undefined) {
    planBound("maxLength", true, undefined, (value, path) =>
      replaceAtPath(value, path, "a".repeat(maxLength)),
    );
    planBound("maxLength", false, "maxLength", (value, path) =>
      replaceAtPath(value, path, "a".repeat(maxLength + 1)),
    );
    if (maxLength >= 1) {
      const unicode = UNICODE_PAIR.repeat(maxLength);
      const allowed =
        typeof row.pattern !== "string" || safeMatches(row.pattern, unicode);
      planBound(
        "length-unicode:max",
        allowed,
        allowed ? undefined : "pattern",
        (value, path) => replaceAtPath(value, path, unicode),
      );
    }
  }

  if (types.includes("array")) {
    const allowed = minItems === undefined || minItems === 0;
    plan(
      allowed ? "empty:accept" : "empty:reject",
      allowed,
      allowed ? undefined : "minItems",
      (value, path) => replaceAtPath(value, path, []),
    );
  }

  const repeatable = row.uniqueItems !== true;
  let itemSchema = asObject(row.items);
  const seenItemRefs = new Set<string>();
  while (
    typeof itemSchema?.$ref === "string" &&
    !seenItemRefs.has(itemSchema.$ref)
  ) {
    seenItemRefs.add(itemSchema.$ref);
    itemSchema = asObject(
      resolveSchema(itemSchema.$ref, state.relativePath)?.node,
    );
  }
  const enumValues = Array.isArray(itemSchema?.enum)
    ? itemSchema.enum
    : undefined;
  if (minItems !== undefined) {
    planBound("minItems", true, undefined, (value, path) =>
      buildArray(
        value,
        path,
        minItems,
        repeatable,
        maxProbeRows,
        maxProbeBytes,
        enumValues,
      ),
    );
    if (minItems > 0)
      planBound("minItems", false, "minItems", (value, path) =>
        buildArray(
          value,
          path,
          minItems - 1,
          true,
          maxProbeRows,
          maxProbeBytes,
        ),
      );
  }

  if (maxItems !== undefined) {
    planBound("maxItems", true, undefined, (value, path) =>
      buildArray(
        value,
        path,
        maxItems,
        repeatable,
        maxProbeRows,
        maxProbeBytes,
        enumValues,
      ),
    );
    planBound("maxItems", false, "maxItems", (value, path) =>
      maxItems === 0
        ? replaceAtPath(value, path, [null])
        : buildArray(
            value,
            path,
            maxItems + 1,
            true,
            maxProbeRows,
            maxProbeBytes,
          ),
    );
  }

  if (row.uniqueItems === true)
    plan("uniqueItems:reject", false, "uniqueItems", (value, path) => {
      const seed = readPath(value, path);
      if (!seed.found || !Array.isArray(seed.value) || seed.value.length === 0)
        return { value, applied: false };
      const duplicate = structuredClone(seed.value);
      if (duplicate.length === 1) duplicate.push(structuredClone(duplicate[0]));
      else duplicate[1] = structuredClone(duplicate[0]);
      return replaceAtPath(value, path, duplicate);
    });

  if (minimum !== undefined) {
    planBound("minimum", true, undefined, (value, path) =>
      replaceAtPath(value, path, minimum),
    );
    planBound("minimum", false, "minimum", (value, path) =>
      replaceAtPath(value, path, minimum - 1),
    );
  }

  if (maximum !== undefined) {
    planBound("maximum", true, undefined, (value, path) =>
      replaceAtPath(value, path, maximum),
    );
    planBound("maximum", false, "maximum", (value, path) =>
      replaceAtPath(value, path, maximum + 1),
    );
  }

  if (exclusiveMinimum !== undefined) {
    planBound("exclusiveMinimum", true, undefined, (value, path) =>
      replaceAtPath(value, path, exclusiveMinimum + 1),
    );
    planBound("exclusiveMinimum", false, "exclusiveMinimum", (value, path) =>
      replaceAtPath(value, path, exclusiveMinimum),
    );
  }

  if (exclusiveMaximum !== undefined) {
    planBound("exclusiveMaximum", true, undefined, (value, path) =>
      replaceAtPath(value, path, exclusiveMaximum - 1),
    );
    planBound("exclusiveMaximum", false, "exclusiveMaximum", (value, path) =>
      replaceAtPath(value, path, exclusiveMaximum),
    );
  }

  if (multipleOf !== undefined && multipleOf > 0) {
    planBound("multipleOf", true, undefined, (value, path) =>
      replaceAtPath(value, path, multipleOf),
    );
    planBound("multipleOf", false, "multipleOf", (value, path) =>
      replaceAtPath(value, path, multipleOf * 1.5),
    );
  }

  if (maxProperties !== undefined)
    plan("maxProperties:reject", false, "maxProperties", (value, path) => {
      const seed = asObject(readPath(value, path).value);
      if (!seed) return { value, applied: false };
      const target = structuredClone(seed);
      for (
        let index = Object.keys(target).length;
        index <= maxProperties;
        index += 1
      )
        target[`__pad${index}`] = true;
      return replaceAtPath(value, path, target);
    });

  if (minProperties !== undefined)
    plan("minProperties:reject", false, "minProperties", (value, path) => {
      const seed = asObject(readPath(value, path).value);
      if (!seed) return { value, applied: false };
      const target = structuredClone(seed);
      const removable = Object.keys(target).filter(
        (key) => !requiredNames.has(key),
      );
      let cursor = 0;
      while (
        Object.keys(target).length > minProperties - 1 &&
        cursor < removable.length
      ) {
        delete target[removable[cursor]];
        cursor += 1;
      }
      return Object.keys(target).length < minProperties
        ? replaceAtPath(value, path, target)
        : { value, applied: false };
    });

  if (closedKeyword) {
    const member = unknownMemberName(properties, patterns);
    if (member === undefined) {
      const allNamesCovered = patterns.some(
        (pattern) =>
          ["", "^", ".*", "^.*$"].includes(pattern) ||
          Object.keys(properties).some(
            (name) =>
              /^[A-Za-z0-9_]+$/.test(name) && pattern === `^(?!${name}$)`,
          ),
      );
      if (!allNamesCovered) define("", "unknown-key:reject");
    } else
      plan(
        "unknown-key:reject",
        false,
        closedKeyword,
        (value, path) => setMemberAtPath(value, path, member, "__unexpected__"),
        closedKeyword === "additionalProperties"
          ? { additionalProperty: member }
          : { unevaluatedProperty: member },
      );
  }

  for (const name of Object.keys(properties)) {
    if (properties[name] === false) {
      plan(`forbidden:${name}:reject`, false, "false schema", (value, path) =>
        setMemberAtPath(value, path, name, null),
      );
      continue;
    }
    if (requiredNames.has(name)) {
      plan(
        `required:${name}:reject`,
        false,
        "required",
        (value, path) => removeMemberAtPath(value, path, name),
        { missingProperty: name },
      );
      continue;
    }
    if (state.composedRequired?.includes(name)) continue;
    plan(`optional-present:${name}:accept`, true, undefined, (value, path) =>
      memberPresent(value, path, name)
        ? { value, applied: true }
        : { value, applied: false },
    );
    plan(`optional-absent:${name}:accept`, true, undefined, (value, path) =>
      removeMemberAtPath(value, path, name, true),
    );
  }

  for (const keyword of ["oneOf", "anyOf", "allOf"] as const) {
    const branches = row[keyword];
    if (!Array.isArray(branches)) continue;
    branches.forEach((_, index) =>
      planBranch(
        `/${keyword}/${index}`,
        `branch:${keyword}:${index}`,
        `/${keyword}/${index}`,
        true,
      ),
    );
  }

  if (typeof row.not === "object") planBranch("", "not:reject", "/not", false);

  if (typeof row.if === "object") {
    const isBranch = (value: unknown) =>
      typeof value === "object" && value !== null;
    const thenObligationId = define("", "conditional:then");
    const elseObligationId = define("", "conditional:else");
    register(
      thenObligationId,
      () => ({
        kind: "conditional",
        thenObligationId,
        elseObligationId,
        contexts: [],
        contextKeys: new Set<string>(),
      }),
      context({
        ifRef: `${documentRef}#${pointer}/if`,
        thenRef: isBranch(row.then)
          ? `${documentRef}#${pointer}/then`
          : undefined,
        elseRef: isBranch(row.else)
          ? `${documentRef}#${pointer}/else`
          : undefined,
      }),
    );
  }
}

/** Re-attaches a new root to obligations and plan contexts a walk already produced. */
function replayWalk(
  trace: WalkTrace,
  range: { from: number; to: number },
  rootId: string,
  obligations: Map<string, StructureObligation>,
  plans: Map<string, Plan>,
) {
  for (let index = range.from; index < range.to; index += 1) {
    const entry = trace.log[index];
    if (entry.kind === "obligation") {
      const obligation = obligations.get(entry.id);
      if (obligation && !obligation.rootIds.includes(rootId))
        obligation.rootIds.push(rootId);
      continue;
    }
    const plan = plans.get(entry.planKey);
    if (!plan) continue;
    const ctx = { ...entry.context, rootId };
    const dedupe = `${rootId}|${ctx.location}|${instancePathKey(ctx.instancePath)}`;
    if (plan.contextKeys.has(dedupe)) continue;
    plan.contextKeys.add(dedupe);
    plan.contexts.push(ctx);
  }
}

function walkRoot(
  rootId: string,
  resolved: CoverageSchemaResolution,
  resolveSchema: CoverageResolver,
  obligations: Map<string, StructureObligation>,
  plans: Map<string, Plan>,
  budget: Budget,
  trace: WalkTrace,
  maxProbeRows: number,
  maxProbeBytes: number,
) {
  const composedStringConstraints = (
    node: unknown,
    file: string,
    seen = new Set<string>(),
  ): { minLength: number; patterns: string[] } => {
    const row = asObject(node);
    const result = {
      minLength: finiteNumber(row?.minLength) ?? 0,
      patterns: typeof row?.pattern === "string" ? [row.pattern] : [],
    };
    if (!row) return result;
    const merge = (child: { minLength: number; patterns: string[] }) => {
      result.minLength = Math.max(result.minLength, child.minLength);
      result.patterns.push(...child.patterns);
    };
    if (typeof row.$ref === "string") {
      const target = resolveSchema(row.$ref, file);
      if (target && !seen.has(target.canonicalRef)) {
        seen.add(target.canonicalRef);
        merge(
          composedStringConstraints(target.node, target.relativePath, seen),
        );
      }
    }
    if (Array.isArray(row.allOf))
      for (const child of row.allOf)
        merge(composedStringConstraints(child, file, seen));
    return result;
  };
  const composedRequired = (
    node: unknown,
    file: string,
    seen = new Set<string>(),
  ): string[] => {
    const row = asObject(node);
    if (!row) return [];
    const names = Array.isArray(row.required)
      ? row.required.filter((name): name is string => typeof name === "string")
      : [];
    if (typeof row.$ref === "string") {
      const target = resolveSchema(row.$ref, file);
      if (target && !seen.has(target.canonicalRef)) {
        seen.add(target.canonicalRef);
        names.push(...composedRequired(target.node, target.relativePath, seen));
      }
    }
    if (Array.isArray(row.allOf))
      for (const branch of row.allOf)
        names.push(...composedRequired(branch, file, seen));
    return names;
  };
  const visit = (state: WalkState, chain: readonly string[]) => {
    if (budget.remaining <= 0 || chain.length > MAX_CHAIN) {
      budget.truncated = true;
      return;
    }
    budget.remaining -= 1;
    state = {
      ...state,
      scalarConstraints: composedStringConstraints(
        state.node,
        state.relativePath,
      ),
      composedRequired: [
        ...new Set([
          ...(state.composedRequired || []),
          ...composedRequired(state.node, state.relativePath),
        ]),
      ].sort(),
    };
    const key = `${state.canonicalRef}|${state.pointer}|${instancePathKey(state.instancePath)}|${state.guarded}|${state.predicate}|${JSON.stringify(state.composedRequired)}`;
    const remembered = trace.memo.get(key);
    if (remembered) {
      replayWalk(trace, remembered, rootId, obligations, plans);
      return;
    }
    const from = trace.log.length;
    const row = asObject(state.node);
    if (!row) return;
    collectNode(
      state,
      rootId,
      obligations,
      plans,
      trace,
      maxProbeRows,
      maxProbeBytes,
      resolveSchema,
    );
    if (typeof row.$ref === "string") {
      const target = resolveSchema(row.$ref, state.relativePath);
      if (target && !chain.includes(target.canonicalRef))
        visit(
          {
            documentRef: documentOf(target.canonicalRef),
            canonicalRef: target.canonicalRef,
            relativePath: target.relativePath,
            node: target.node,
            pointer: fragmentOf(target.canonicalRef),
            instancePath: state.instancePath,
            guarded: state.guarded,
            predicate: state.predicate,
            composedRequired: state.composedRequired,
          },
          [...chain, target.canonicalRef],
        );
    }
    for (const child of childStates(row, state)) visit(child, chain);
    trace.memo.set(key, { from, to: trace.log.length });
  };
  visit(
    {
      documentRef: documentOf(resolved.canonicalRef),
      canonicalRef: resolved.canonicalRef,
      relativePath: resolved.relativePath,
      node: resolved.node,
      pointer: fragmentOf(resolved.canonicalRef),
      instancePath: [],
      guarded: false,
    },
    [resolved.canonicalRef],
  );
}

function attributed(
  errors: readonly CoverageValidationError[] | undefined,
  plan: MutationPlan,
  path: readonly string[],
) {
  const expected = instancePointer(path);
  return (errors || []).some((error) => {
    if (plan.keyword === "false schema")
      return (
        error.keyword === "false schema" &&
        (error.instancePath || "").startsWith(`${expected}/`)
      );
    if ((error.instancePath || "") !== expected) return false;
    if (
      plan.keyword === "unevaluatedProperties" &&
      error.keyword === "additionalProperties"
    )
      return (
        error.params?.additionalProperty ===
        plan.paramMatch?.unevaluatedProperty
      );
    if (plan.keyword && error.keyword !== plan.keyword) return false;
    for (const [key, value] of Object.entries(plan.paramMatch || {}))
      if ((error.params || {})[key] !== value) return false;
    return true;
  });
}

export function inspectSynthesisProtocolStructureCoverage(
  input: StructureCoverageInput,
): StructureCoverageResult {
  const { roots, resolveSchema, validate, corpus } = input;
  const captureValues = input.captureValues === true;
  const maxProbeRows = input.maxProbeRows ?? 4096;
  const maxProbeBytes = input.maxProbeBytes ?? 8 * 1024 * 1024;
  const budget: Budget = {
    remaining: input.maxVisits ?? DEFAULT_MAX_VISITS,
    truncated: false,
  };
  const obligations = new Map<string, StructureObligation>();
  const plans = new Map<string, Plan>();
  const trace: WalkTrace = { log: [], memo: new Map() };

  for (const root of roots) {
    const resolved = resolveSchema(root.ref);
    if (resolved)
      walkRoot(
        root.id,
        resolved,
        resolveSchema,
        obligations,
        plans,
        budget,
        trace,
        maxProbeRows,
        maxProbeBytes,
      );
  }

  // Shared definition fixtures exercise the same reachable obligations once.
  // They never introduce new definitions into the production denominator.
  const reachable = new Set(
    [...obligations.values()].map((entry) =>
      entry.canonicalRef.replace(/#$/, ""),
    ),
  );
  const productionObligations = new Set(obligations.keys());
  const executionRoots = [...roots];
  const rootRefs = new Set(
    roots.map((root) => resolveSchema(root.ref)?.canonicalRef),
  );
  for (const entry of corpus) {
    if (!entry.valid) continue;
    const resolved = resolveSchema(entry.schemaRef);
    if (!resolved || rootRefs.has(resolved.canonicalRef)) continue;
    const canonical = resolved.canonicalRef.replace(/#$/, "");
    if (
      !reachable.has(canonical) &&
      ![...reachable].some((ref) => ref.startsWith(`${canonical}/`))
    )
      continue;
    const rootId = `shared:${resolved.canonicalRef}`;
    rootRefs.add(resolved.canonicalRef);
    executionRoots.push({ id: rootId, ref: entry.schemaRef });
    walkRoot(
      rootId,
      resolved,
      resolveSchema,
      obligations,
      plans,
      budget,
      trace,
      maxProbeRows,
      maxProbeBytes,
    );
  }
  for (const id of obligations.keys())
    if (!productionObligations.has(id)) obligations.delete(id);
  for (const [key, plan] of plans) {
    const ids =
      plan.kind === "conditional"
        ? [plan.thenObligationId, plan.elseObligationId]
        : [plan.obligationId];
    if (ids.every((id) => !productionObligations.has(id))) plans.delete(key);
  }

  const verifiedSeeds = new Map<StructureCoverageCase, boolean>();
  const positivePass = (entry: StructureCoverageCase) => {
    const cached = verifiedSeeds.get(entry);
    if (cached !== undefined) return cached;
    const passed = validate(entry.schemaRef, entry.value).valid === true;
    verifiedSeeds.set(entry, passed);
    return passed;
  };

  const seedsByRef = new Map<string, StructureCoverageCase[]>();
  const predicateSeedsByRef = new Map<string, StructureCoverageCase[]>();
  for (const entry of corpus) {
    if (
      (entry.valid && positivePass(entry)) ||
      (!entry.valid && validate(entry.schemaRef, entry.value).valid === false)
    ) {
      const resolved = resolveSchema(entry.schemaRef);
      if (resolved) {
        const entries = predicateSeedsByRef.get(resolved.canonicalRef) || [];
        entries.push(entry);
        predicateSeedsByRef.set(resolved.canonicalRef, entries);
      }
    }
    if (!entry.valid || !positivePass(entry)) continue;
    const resolved = resolveSchema(entry.schemaRef);
    if (!resolved) continue;
    const list = seedsByRef.get(resolved.canonicalRef);
    if (list) list.push(entry);
    else seedsByRef.set(resolved.canonicalRef, [entry]);
  }

  const seedsByRoot = new Map<string, StructureCoverageCase[]>();
  const predicateSeedsByRoot = new Map<string, StructureCoverageCase[]>();
  const seededRoots: string[] = [];
  for (const root of executionRoots) {
    const resolved = resolveSchema(root.ref);
    if (!resolved) continue;
    const seeds = seedsByRef.get(resolved.canonicalRef) || [];
    seedsByRoot.set(root.id, seeds);
    predicateSeedsByRoot.set(
      root.id,
      predicateSeedsByRef.get(resolved.canonicalRef) || [],
    );
    if (seeds.length > 0) seededRoots.push(root.id);
  }

  const covered = new Set<string>();
  const violations = new Set<string>();
  const negatives: StructureNegative[] = [];
  const recorded = new Set<string>();
  const record = (
    obligationId: string,
    instancePath: readonly string[],
    entry: StructureCoverageCase,
    outcome: StructureNegativeOutcome,
    expectValid: boolean,
    keyword: string | undefined,
    value: unknown,
    schemaRef = entry.schemaRef,
    rootValue = value,
  ) => {
    if (recorded.has(obligationId)) {
      if (outcome !== "covered") return;
      const previous = negatives.findIndex(
        (entry) => entry.obligationId === obligationId,
      );
      if (previous >= 0) negatives.splice(previous, 1);
    }
    recorded.add(obligationId);
    negatives.push({
      id: `${obligationId}@${entry.id}`,
      obligationId,
      caseId: entry.id,
      schemaRef,
      expectValid,
      instancePath: instancePointer(instancePath),
      keyword,
      outcome,
      ...(captureValues ? { value } : {}),
    });
    if (outcome === "covered" && input.onWitness) {
      const rootValidation = validate(entry.schemaRef, rootValue);
      input.onWitness({
        ...negatives[negatives.length - 1],
        root: {
          schemaRef: entry.schemaRef,
          value: rootValue,
          seedValue: entry.value,
          valid: rootValidation.valid,
          errors: rootValidation.errors,
        },
      });
    }
  };

  const verificationLimit =
    input.maxVerificationAttempts ?? DEFAULT_MAX_VERIFICATION_ATTEMPTS;
  const budgetExhausted = new Set<string>();
  let verificationAttempts = 0;

  for (const plan of plans.values()) {
    const satisfied = () =>
      plan.kind === "conditional"
        ? covered.has(plan.thenObligationId) &&
          covered.has(plan.elseObligationId)
        : covered.has(plan.obligationId);
    if (satisfied()) continue;

    let attempts = 0;
    let capped = false;
    // Only a validator-backed decision costs budget, so a plan never burns its
    // allowance on lookups that cannot decide anything.
    const consumeAttempt = () => {
      if (attempts >= verificationLimit) {
        capped = true;
        return false;
      }
      attempts += 1;
      return true;
    };
    for (const ctx of [...plan.contexts].sort(
      (left, right) => left.instancePath.length - right.instancePath.length,
    )) {
      let done = false;
      for (const entry of (ctx.predicate
        ? predicateSeedsByRoot
        : seedsByRoot
      ).get(ctx.rootId) || []) {
        let pending:
          | {
              path: string[];
              outcome: StructureNegativeOutcome;
              expectValid: boolean;
              keyword: string | undefined;
              value: unknown;
            }
          | undefined;
        for (const path of resolveInstancePaths(
          entry.value,
          ctx.instancePath,
        )) {
          if (plan.kind === "conditional") {
            const seed = readPath(entry.value, path);
            if (!seed.found) continue;
            if (!consumeAttempt()) break;
            const matches =
              validate(ctx.ifRef as string, seed.value).valid === true;
            const obligationId = matches
              ? plan.thenObligationId
              : plan.elseObligationId;
            const ref = matches ? ctx.thenRef : ctx.elseRef;
            if (!ref) {
              covered.add(obligationId);
            } else if (!consumeAttempt()) {
              break;
            } else if (validate(ref, seed.value).valid === true) {
              covered.add(obligationId);
              record(
                obligationId,
                path,
                entry,
                "covered",
                true,
                undefined,
                seed.value,
                ref,
                entry.value,
              );
            } else {
              violations.add(obligationId);
              record(
                obligationId,
                path,
                entry,
                "violated",
                true,
                undefined,
                seed.value,
                ref,
              );
            }
            if (
              covered.has(plan.thenObligationId) &&
              covered.has(plan.elseObligationId)
            ) {
              done = true;
              break;
            }
            continue;
          }

          if (plan.kind === "branch") {
            const seed = readPath(entry.value, path);
            if (!seed.found) continue;
            if (!consumeAttempt()) break;
            const held =
              validate(ctx.branchRef as string, seed.value).valid === true;
            if (held === plan.expectValid) {
              covered.add(plan.obligationId);
              record(
                plan.obligationId,
                path,
                entry,
                "covered",
                plan.expectValid,
                undefined,
                seed.value,
                ctx.branchRef,
                entry.value,
              );
              done = true;
              break;
            }
            // A partial node judged without its root context is not evidence of a
            // production violation.
            pending = {
              path,
              outcome: "skipped",
              expectValid: plan.expectValid,
              keyword: undefined,
              value: seed.value,
            };
            continue;
          }

          let applied = plan.apply(entry.value, path);
          if (!applied.applied) continue;
          if (!consumeAttempt()) break;
          const localEvaluation =
            ctx.predicate ||
            (!plan.expectValid &&
              validate(ctx.location, readPath(entry.value, path).value).valid);
          const evaluate = (value: unknown) => {
            if (!localEvaluation) return validate(entry.schemaRef, value);
            const local = validate(ctx.location, readPath(value, path).value);
            return {
              valid: local.valid,
              errors: local.errors?.map((error) => ({
                ...error,
                instancePath: `${instancePointer(path)}${error.instancePath || ""}`,
              })),
            };
          };
          let result = evaluate(applied.value);
          if (result.valid && !plan.expectValid && plan.typeProbes) {
            for (const probe of plan.typeProbes.slice(1)) {
              if (!consumeAttempt()) break;
              applied = replaceAtPath(
                entry.value,
                path,
                structuredClone(probe),
              );
              result = evaluate(applied.value);
              if (!result.valid) break;
            }
          }
          if (plan.expectValid) {
            if (result.valid) {
              covered.add(plan.obligationId);
              record(
                plan.obligationId,
                path,
                entry,
                "covered",
                true,
                undefined,
                localEvaluation
                  ? readPath(applied.value, path).value
                  : applied.value,
                localEvaluation ? ctx.location : entry.schemaRef,
                applied.value,
              );
              done = true;
              break;
            }
            // The candidate lost to a sibling constraint at the same node, so its
            // rejection says nothing about the bound under test.
            pending = {
              path,
              outcome: "unattributed",
              expectValid: true,
              keyword: plan.keyword,
              value: applied.value,
            };
            continue;
          }
          if (result.valid) {
            if (ctx.guarded) {
              // Inside a union branch or an if guard the value is still legal
              // elsewhere, so this is a generator miss, not a violation.
              pending = {
                path,
                outcome: "unattributed",
                expectValid: false,
                keyword: plan.keyword,
                value: applied.value,
              };
              continue;
            }
            violations.add(plan.obligationId);
            record(
              plan.obligationId,
              path,
              entry,
              "violated",
              false,
              plan.keyword,
              localEvaluation
                ? readPath(applied.value, path).value
                : applied.value,
              localEvaluation ? ctx.location : entry.schemaRef,
              applied.value,
            );
            done = true;
            break;
          }
          if (attributed(result.errors, plan, path)) {
            covered.add(plan.obligationId);
            record(
              plan.obligationId,
              path,
              entry,
              "covered",
              false,
              plan.keyword,
              localEvaluation
                ? readPath(applied.value, path).value
                : applied.value,
              localEvaluation ? ctx.location : entry.schemaRef,
              applied.value,
            );
            done = true;
            break;
          }
          pending = {
            path,
            outcome: "unattributed",
            expectValid: false,
            keyword: plan.keyword,
            value: applied.value,
          };
        }
        if (done) break;
        if (capped) break;
        if (pending)
          record(
            plan.obligationId,
            pending.path,
            entry,
            pending.outcome,
            pending.expectValid,
            pending.keyword,
            pending.value,
          );
      }
      if (done || capped) break;
    }
    if (capped)
      for (const id of plan.kind === "conditional"
        ? [plan.thenObligationId, plan.elseObligationId]
        : [plan.obligationId])
        budgetExhausted.add(id);
    verificationAttempts += attempts;
  }

  if (budget.truncated) {
    const id = "traversal:truncated";
    obligations.set(id, {
      id,
      kind: "traversal:truncated",
      canonicalRef: id,
      rootIds: roots.map((root) => root.id),
    });
  }

  const obligationList = [...obligations.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
  const uncovered = obligationList
    .filter((obligation) => !covered.has(obligation.id))
    .map((obligation) => obligation.id);
  return {
    complete: obligationList.length > 0 && uncovered.length === 0,
    truncated: budget.truncated,
    verificationBudget: {
      limit: verificationLimit,
      attempts: verificationAttempts,
      exhausted: [...budgetExhausted].sort(),
    },
    structure: {
      total: obligationList.length,
      covered: obligationList.length - uncovered.length,
      uncovered,
    },
    obligations: obligationList,
    negatives,
    covered: [...covered].sort(),
    violations: [...violations].sort(),
    seededRoots,
  };
}
