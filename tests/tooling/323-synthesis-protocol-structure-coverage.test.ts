import { assert } from "chai";
import Ajv2020 from "ajv/dist/2020.js";
import { inspectSynthesisProtocolStructureCoverage } from "../../scripts/synthesis/synthesisProtocolStructureCoverage";
import type {
  CoverageResolver,
  CoverageSchemaObject,
  CoverageValidator,
  StructureCoverageInput,
} from "../../scripts/synthesis/synthesisProtocolStructureCoverage";

const SCHEMA_ID = "https://zotero-agents.local/test/closed.schema.json";

function closedSchema(): CoverageSchemaObject {
  return {
    $id: SCHEMA_ID,
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    additionalProperties: false,
    required: ["kind"],
    properties: {
      kind: { const: "probe" },
      mode: { enum: ["alpha", "beta"] },
      count: { type: "integer", minimum: 1, maximum: 5 },
      label: { type: "string", maxLength: 3 },
      choice: {
        oneOf: [
          {
            type: "object",
            required: ["left"],
            properties: { left: { type: "string" } },
            additionalProperties: false,
          },
          {
            type: "object",
            required: ["right"],
            properties: { right: { type: "string" } },
            additionalProperties: false,
          },
        ],
      },
    },
  };
}

const seed = { kind: "probe", mode: "alpha", count: 2, choice: { left: "x" } };
const roots = [{ id: "test.read:request", ref: SCHEMA_ID }];
const leftBranch = `${SCHEMA_ID}#/properties/choice/oneOf/0::branch:oneOf:0`;
const rightBranch = `${SCHEMA_ID}#/properties/choice/oneOf/1::branch:oneOf:1`;

function mapSchema(): CoverageSchemaObject {
  return {
    $id: SCHEMA_ID,
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    required: ["kind"],
    properties: { kind: { const: "map" } },
    patternProperties: { "^x-": { type: "string" } },
    additionalProperties: { type: "integer", maximum: 9 },
  };
}

const patternMapObligation = `${SCHEMA_ID}#/patternProperties/^x-::type:string:reject`;
const additionalMapObligation = `${SCHEMA_ID}#/additionalProperties::type:integer:reject`;

function resolvePointer(document: CoverageSchemaObject, pointer: string) {
  let node: unknown = document;
  for (const raw of pointer.replace(/^\//, "").split("/").filter(Boolean)) {
    if (!node || typeof node !== "object" || Array.isArray(node))
      return undefined;
    node = (node as CoverageSchemaObject)[
      raw.replaceAll("~1", "/").replaceAll("~0", "~")
    ];
  }
  return node;
}

function harness(document: CoverageSchemaObject) {
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  ajv.addSchema(document, SCHEMA_ID);
  const resolveSchema: CoverageResolver = (ref) => {
    const [file, fragment = ""] = ref.split("#", 2);
    if ((file || SCHEMA_ID) !== SCHEMA_ID) return undefined;
    const node = fragment ? resolvePointer(document, fragment) : document;
    return node === undefined
      ? undefined
      : {
          canonicalRef: `${SCHEMA_ID}#${fragment}`,
          relativePath: SCHEMA_ID,
          node,
          schema: document,
        };
  };
  const validate: CoverageValidator = (schemaRef, value) => {
    const validator = ajv.getSchema(schemaRef);
    if (!validator) return { valid: false };
    return {
      valid: validator(value) as boolean,
      errors: (validator.errors || []) as {
        instancePath?: string;
        keyword?: string;
        params?: Record<string, unknown>;
      }[],
    };
  };
  return { resolveSchema, validate };
}

type Case = { id: string; schemaRef: string; valid: boolean; value: unknown };

function inspectCorpus(
  document: CoverageSchemaObject,
  corpus: Case[],
  overrides: Partial<StructureCoverageInput> = {},
) {
  const built = harness(document);
  return inspectSynthesisProtocolStructureCoverage({
    roots,
    resolveSchema: built.resolveSchema,
    validate: built.validate,
    corpus,
    ...overrides,
  });
}

describe("Synthesis protocol structural coverage", function () {
  it("keeps a local predicate rejection separate from its accepted replay root", function () {
    const schema: CoverageSchemaObject = {
      $id: SCHEMA_ID,
      type: "object",
      required: ["choice"],
      additionalProperties: false,
      properties: { choice: { type: "integer", not: { const: 2 } } },
    };
    const witnesses: Parameters<
      NonNullable<StructureCoverageInput["onWitness"]>
    >[0][] = [];
    inspectCorpus(
      schema,
      [{ id: "seed", schemaRef: SCHEMA_ID, valid: true, value: { choice: 1 } }],
      { onWitness: (witness) => witnesses.push(witness) },
    );
    const rejection = witnesses.find((entry) =>
      entry.obligationId.endsWith("/properties/choice::not:reject"),
    );
    assert.exists(rejection);
    assert.isFalse(rejection!.expectValid);
    assert.equal(rejection!.root.schemaRef, SCHEMA_ID);
    assert.deepEqual(rejection!.root.value, { choice: 1 });
    assert.isTrue(rejection!.root.valid);
    const missing = witnesses.find((entry) =>
      entry.obligationId.endsWith("::required:choice:reject"),
    );
    assert.exists(missing);
    assert.deepEqual(missing!.root.value, {});
    assert.deepEqual(missing!.root.seedValue, { choice: 1 });
    assert.isFalse(missing!.root.valid);
  });

  it("builds distinct integer and finite-enum array bounds without changing uniqueness semantics", function () {
    for (const [items, value] of [
      [{ type: "integer", minimum: 1 }, [1]],
      [{ enum: ["a", "b", "c"] }, ["a"]],
    ] as const) {
      const schema = {
        $id: SCHEMA_ID,
        type: "array",
        minItems: 1,
        maxItems: 3,
        uniqueItems: true,
        items,
      };
      const coverage = inspectCorpus(schema, [
        { id: "seed", schemaRef: SCHEMA_ID, valid: true, value },
      ]);
      assert.include(coverage.covered, `${SCHEMA_ID}#::maxItems:accept`);
    }
    const schema = {
      $id: SCHEMA_ID,
      type: "array",
      minItems: 3,
      maxItems: 3,
      uniqueItems: true,
      items: { type: "integer" },
    };
    const coverage = inspectCorpus(schema, [
      { id: "seed", schemaRef: SCHEMA_ID, valid: true, value: [1, 2, 3] },
    ]);
    assert.include(coverage.covered, `${SCHEMA_ID}#::uniqueItems:reject`);
  });
  it("inherits scalar constraints beside a reference and omits impossible unknown keys", function () {
    const schema = {
      $id: SCHEMA_ID,
      $defs: { text: { type: "string", minLength: 1, maxLength: 3 } },
      type: "object",
      additionalProperties: false,
      properties: { reason: { type: "string", $ref: "#/$defs/text" } },
      patternProperties: { "^(?!reason$)": true },
    };
    const coverage = inspectCorpus(schema, [
      {
        id: "seed",
        schemaRef: SCHEMA_ID,
        valid: true,
        value: { reason: "ok", other: 1 },
      },
    ]);
    assert.notInclude(
      coverage.structure.uncovered,
      `${SCHEMA_ID}#::unknown-key:reject`,
    );
    assert.notInclude(
      coverage.structure.uncovered,
      `${SCHEMA_ID}#/properties/reason::empty:accept`,
    );
    assert.include(
      coverage.covered,
      `${SCHEMA_ID}#/properties/reason::empty:reject`,
    );
  });
  it("checks tuple branch bounds even when another union branch accepts the shorter tuple", function () {
    const schema = {
      $id: SCHEMA_ID,
      oneOf: [
        { type: "array", minItems: 1, maxItems: 1, items: { type: "string" } },
        {
          type: "array",
          minItems: 2,
          maxItems: 2,
          prefixItems: [{ type: "string" }, { type: "integer" }],
          items: false,
        },
      ],
    };
    const coverage = inspectCorpus(
      schema,
      [
        { id: "single", schemaRef: SCHEMA_ID, valid: true, value: ["x"] },
        { id: "tuple", schemaRef: SCHEMA_ID, valid: true, value: ["x", 2] },
      ],
      { captureValues: true },
    );
    assert.include(coverage.covered, `${SCHEMA_ID}#/oneOf/1::minItems:reject`);
    const bound = coverage.negatives.find(
      (entry) =>
        entry.obligationId === `${SCHEMA_ID}#/oneOf/1::minItems:reject`,
    )!;
    assert.equal(bound.schemaRef, `${SCHEMA_ID}#/oneOf/1`);
    assert.deepEqual(bound.value, ["x"]);
    assert.isTrue(harness(schema).validate(SCHEMA_ID, bound.value).valid);
  });
  it("requires rejection for a forbidden property instead of inventing its presence acceptance", function () {
    const coverage = inspectCorpus(
      {
        $id: SCHEMA_ID,
        type: "object",
        properties: { forbidden: false },
      },
      [{ id: "empty", schemaRef: SCHEMA_ID, valid: true, value: {} }],
    );
    assert.include(
      coverage.covered,
      `${SCHEMA_ID}#::forbidden:forbidden:reject`,
    );
    assert.notInclude(
      coverage.obligations.map((entry) => entry.id),
      `${SCHEMA_ID}#::optional-present:forbidden:accept`,
    );
  });

  it("executes guard predicates locally while the production request follows another branch", function () {
    const schema: CoverageSchemaObject = {
      $id: SCHEMA_ID,
      type: "object",
      properties: { a: { type: "string" }, b: { type: "string" } },
      not: {
        type: "object",
        required: ["a", "b"],
        properties: { a: {}, b: {} },
      },
    };
    const coverage = inspectCorpus(
      schema,
      [
        { id: "guard", schemaRef: SCHEMA_ID, valid: true, value: { a: "x" } },
        {
          id: "forbidden",
          schemaRef: SCHEMA_ID,
          valid: false,
          value: { a: "x", b: "y" },
        },
      ],
      { captureValues: true },
    );
    assert.include(coverage.covered, `${SCHEMA_ID}#/not::required:a:reject`);
    assert.isEmpty(coverage.violations);
    assert.isTrue(
      coverage.negatives.some((entry) => entry.schemaRef.includes("/not")),
    );
    for (const entry of coverage.negatives.filter(
      (entry) => entry.outcome === "covered",
    ))
      assert.equal(
        harness(schema).validate(entry.schemaRef, entry.value).valid,
        entry.expectValid,
        entry.obligationId,
      );
  });

  it("executes bounded stress probes above the ordinary 4096-row page size", function () {
    const coverage = inspectCorpus(
      {
        $id: SCHEMA_ID,
        type: "array",
        maxItems: 10_000,
        items: { type: "string" },
      },
      [{ id: "rows", schemaRef: SCHEMA_ID, valid: true, value: ["row"] }],
      { maxProbeRows: 10_001 },
    );
    assert.include(coverage.covered, `${SCHEMA_ID}#::maxItems:accept`);
    assert.include(coverage.covered, `${SCHEMA_ID}#::maxItems:reject`);
  });

  it("attributes unknown members when a composed closed schema reports additionalProperties", function () {
    const schema: CoverageSchemaObject = {
      $id: SCHEMA_ID,
      type: "object",
      unevaluatedProperties: false,
      allOf: [
        {
          type: "object",
          additionalProperties: false,
          properties: { kind: { type: "string" } },
        },
      ],
    };
    const coverage = inspectCorpus(schema, [
      {
        id: "closed",
        schemaRef: SCHEMA_ID,
        valid: true,
        value: { kind: "probe" },
      },
    ]);
    assert.include(coverage.covered, `${SCHEMA_ID}#::unknown-key:reject`);
  });

  it("reuses a reachable shared union even when only its branches declare obligations", function () {
    const schema: CoverageSchemaObject = {
      $id: SCHEMA_ID,
      type: "array",
      items: { $ref: "#/$defs/Choice" },
      $defs: { Choice: { oneOf: [{ const: "left" }, { const: "right" }] } },
    };
    const coverage = inspectCorpus(schema, [
      { id: "empty", schemaRef: SCHEMA_ID, valid: true, value: [] },
      {
        id: "choice",
        schemaRef: `${SCHEMA_ID}#/$defs/Choice`,
        valid: true,
        value: "right",
      },
    ]);
    assert.include(
      coverage.covered,
      `${SCHEMA_ID}#/$defs/Choice/oneOf/1::branch:oneOf:1`,
    );
  });

  it("keeps the production denominator fixed when a shared sample has fewer inherited constraints", function () {
    const schema: CoverageSchemaObject = {
      $id: SCHEMA_ID,
      type: "object",
      allOf: [
        {
          type: "object",
          required: ["kind"],
          properties: { kind: { type: "string" } },
        },
        { $ref: "#/$defs/Body" },
      ],
      $defs: {
        Body: { type: "object", properties: { kind: { const: "probe" } } },
      },
    };
    const corpus = [
      {
        id: "root",
        schemaRef: SCHEMA_ID,
        valid: true,
        value: { kind: "probe" },
      },
    ];
    const baseline = inspectCorpus(schema, corpus);
    const shared = inspectCorpus(schema, [
      ...corpus,
      {
        id: "shared",
        schemaRef: `${SCHEMA_ID}#/$defs/Body`,
        valid: true,
        value: { kind: "probe" },
      },
    ]);
    assert.deepEqual(
      shared.obligations.map((entry) => entry.id),
      baseline.obligations.map((entry) => entry.id),
    );
  });

  it("does not invent optional absence for a field required by another allOf member", function () {
    const schema: CoverageSchemaObject = {
      $id: SCHEMA_ID,
      type: "object",
      allOf: [
        {
          type: "object",
          required: ["kind"],
          properties: { kind: { type: "string" } },
        },
        { type: "object", properties: { kind: { const: "probe" } } },
      ],
    };
    const coverage = inspectCorpus(schema, [
      {
        id: "composed",
        schemaRef: SCHEMA_ID,
        valid: true,
        value: { kind: "probe" },
      },
    ]);
    assert.notInclude(
      coverage.obligations.map((entry) => entry.id),
      `${SCHEMA_ID}#/allOf/1::optional-absent:kind:accept`,
    );
    assert.include(
      coverage.covered,
      `${SCHEMA_ID}#/allOf/0::required:kind:reject`,
    );
  });

  it("reuses document-root samples whose resolver omits an empty fragment", function () {
    const schema: CoverageSchemaObject = {
      $id: SCHEMA_ID,
      type: "string",
      maxLength: 3,
      $defs: { Envelope: { type: "array", items: { $ref: "#" } } },
    };
    const built = harness(schema);
    const coverage = inspectCorpus(
      schema,
      [
        {
          id: "envelope",
          schemaRef: `${SCHEMA_ID}#/$defs/Envelope`,
          valid: true,
          value: [],
        },
        { id: "row", schemaRef: SCHEMA_ID, valid: true, value: "abc" },
      ],
      {
        roots: [{ id: "envelope", ref: `${SCHEMA_ID}#/$defs/Envelope` }],
        resolveSchema(ref, fromFile) {
          const resolved = built.resolveSchema(ref, fromFile);
          return (
            resolved && {
              ...resolved,
              canonicalRef: resolved.canonicalRef.replace(/#$/, ""),
            }
          );
        },
      },
    );
    assert.include(coverage.covered, `${SCHEMA_ID}#::maxLength:reject`);
  });

  it("rejects a member added to a schema that only admits an empty array", function () {
    const coverage = inspectCorpus(
      { $id: SCHEMA_ID, type: "array", maxItems: 0 },
      [{ id: "empty", schemaRef: SCHEMA_ID, valid: true, value: [] }],
    );
    assert.include(coverage.covered, `${SCHEMA_ID}#::maxItems:reject`);
  });

  it("executes unique string-array boundaries from a nonempty seed", function () {
    const schema: CoverageSchemaObject = {
      $id: SCHEMA_ID,
      type: "array",
      uniqueItems: true,
      maxItems: 3,
      items: { type: "string", minLength: 1 },
    };
    const coverage = inspectCorpus(schema, [
      { id: "refs", schemaRef: SCHEMA_ID, valid: true, value: ["ref:1"] },
    ]);
    assert.include(coverage.covered, `${SCHEMA_ID}#::maxItems:accept`);
    assert.include(coverage.covered, `${SCHEMA_ID}#::maxItems:reject`);
    assert.isEmpty(coverage.violations);
  });

  it("does not mistake a negated guard's successful root mutation for a contract violation", function () {
    const schema: CoverageSchemaObject = {
      $id: SCHEMA_ID,
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: { a: { type: "string" }, b: { type: "string" } },
      allOf: [
        {
          not: {
            type: "object",
            required: ["a", "b"],
            properties: { a: {}, b: {} },
          },
        },
      ],
    };
    const coverage = inspectCorpus(schema, [
      { id: "guard", schemaRef: SCHEMA_ID, valid: true, value: { a: "x" } },
    ]);
    assert.isEmpty(coverage.violations);
  });

  it("reuses direct samples of reachable shared definitions without counting unreachable schemas", function () {
    const schema: CoverageSchemaObject = {
      $id: SCHEMA_ID,
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "array",
      items: { $ref: "#/$defs/Row" },
      $defs: {
        Row: { type: "string", maxLength: 3 },
        Unused: { type: "integer", minimum: 0 },
      },
    };
    const coverage = inspectCorpus(schema, [
      { id: "array", schemaRef: SCHEMA_ID, valid: true, value: [] },
      {
        id: "row",
        schemaRef: `${SCHEMA_ID}#/$defs/Row`,
        valid: true,
        value: "abc",
      },
      {
        id: "unused",
        schemaRef: `${SCHEMA_ID}#/$defs/Unused`,
        valid: true,
        value: 1,
      },
    ]);
    assert.include(
      coverage.covered,
      `${SCHEMA_ID}#/$defs/Row::maxLength:reject`,
    );
    assert.isFalse(
      coverage.obligations.some((entry) => entry.id.includes("Unused")),
    );
  });

  it("executes union branches carried by later array members", function () {
    const schema: CoverageSchemaObject = {
      $id: SCHEMA_ID,
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "array",
      items: { oneOf: [{ const: "left" }, { const: "right" }] },
    };
    const coverage = inspectCorpus(schema, [
      {
        id: "rows",
        schemaRef: SCHEMA_ID,
        valid: true,
        value: ["left", "right"],
      },
    ]);
    assert.include(
      coverage.covered,
      `${SCHEMA_ID}#/items/oneOf/1::branch:oneOf:1`,
    );
  });

  it("enumerates obligations and leaves an unexercised optional and union branch uncovered", function () {
    const coverage = inspectCorpus(closedSchema(), [
      { id: "seed", schemaRef: SCHEMA_ID, valid: true, value: seed },
    ]);
    const ids = coverage.obligations.map((obligation) => obligation.id);
    assert.include(ids, leftBranch);
    assert.include(ids, rightBranch);
    assert.include(coverage.structure.uncovered, rightBranch);
    assert.include(
      coverage.structure.uncovered,
      `${SCHEMA_ID}#::optional-present:label:accept`,
    );
    assert.isAbove(coverage.structure.covered, 0);
    assert.isFalse(coverage.complete);
    assert.isFalse(coverage.truncated);
    assert.isEmpty(coverage.violations, JSON.stringify(coverage.violations));
  });

  it("keeps accepted and rejected bounds as separate obligations, both executed", function () {
    const coverage = inspectCorpus(closedSchema(), [
      {
        id: "seed",
        schemaRef: SCHEMA_ID,
        valid: true,
        value: { ...seed, label: "\u{1F600}\u{1F600}" },
      },
    ]);
    for (const id of [
      `${SCHEMA_ID}#/properties/count::minimum:accept`,
      `${SCHEMA_ID}#/properties/count::minimum:reject`,
      `${SCHEMA_ID}#/properties/count::maximum:accept`,
      `${SCHEMA_ID}#/properties/count::maximum:reject`,
      `${SCHEMA_ID}#/properties/label::maxLength:accept`,
      `${SCHEMA_ID}#/properties/label::maxLength:reject`,
      `${SCHEMA_ID}#/properties/label::length-unicode:max:accept`,
      `${SCHEMA_ID}#/properties/mode::enum:"alpha":accept`,
      `${SCHEMA_ID}#/properties/mode::enum:"beta":accept`,
      `${SCHEMA_ID}#/properties/mode::enum:reject`,
      `${SCHEMA_ID}#::optional-present:label:accept`,
      `${SCHEMA_ID}#::optional-absent:label:accept`,
    ])
      assert.include(coverage.covered, id, id);
    assert.isEmpty(coverage.violations, JSON.stringify(coverage.violations));
  });

  it("keeps every union branch as its own obligation so a removed sample turns it red", function () {
    const both = inspectCorpus(closedSchema(), [
      { id: "left", schemaRef: SCHEMA_ID, valid: true, value: seed },
      {
        id: "right",
        schemaRef: SCHEMA_ID,
        valid: true,
        value: { ...seed, choice: { right: "y" } },
      },
    ]);
    assert.include(both.covered, leftBranch);
    assert.include(both.covered, rightBranch);

    const dropped = inspectCorpus(closedSchema(), [
      { id: "left", schemaRef: SCHEMA_ID, valid: true, value: seed },
    ]);
    assert.notInclude(dropped.covered, rightBranch);
    assert.include(dropped.structure.uncovered, rightBranch);
    assert.notInclude(dropped.violations, rightBranch);
  });

  it("turns the gate red when a new required member is not exercised by the corpus", function () {
    const strict = closedSchema();
    strict.required = ["kind", "later"];
    (strict.properties as CoverageSchemaObject).later = { type: "string" };
    const coverage = inspectCorpus(strict, [
      { id: "seed", schemaRef: SCHEMA_ID, valid: true, value: seed },
    ]);
    assert.include(
      coverage.structure.uncovered,
      `${SCHEMA_ID}#::required:later:reject`,
    );
    assert.isFalse(coverage.complete);
  });

  it("does not treat a declared but failing positive case as an executed seed", function () {
    const coverage = inspectCorpus(closedSchema(), [
      { id: "declared", schemaRef: SCHEMA_ID, valid: true, value: {} },
    ]);
    assert.equal(coverage.structure.covered, 0);
    assert.isEmpty(coverage.seededRoots);
    assert.include(
      coverage.structure.uncovered,
      `${SCHEMA_ID}#::required:kind:reject`,
    );
  });

  it("reports derived negatives that the production validator admits as violations", function () {
    const permissive: CoverageValidator = () => ({ valid: true });
    const built = harness(closedSchema());
    const coverage = inspectSynthesisProtocolStructureCoverage({
      roots,
      resolveSchema: built.resolveSchema,
      validate: permissive,
      corpus: [{ id: "seed", schemaRef: SCHEMA_ID, valid: true, value: seed }],
    });
    const unknownKey = `${SCHEMA_ID}#::unknown-key:reject`;
    assert.notInclude(coverage.covered, unknownKey);
    assert.include(coverage.violations, unknownKey);
    assert.isFalse(coverage.complete);
    assert.isTrue(
      coverage.negatives.some((entry) => entry.outcome === "violated"),
    );
  });

  it("keeps one structural denominator and one evidence set for shared refs", function () {
    const corpus = [
      { id: "seed", schemaRef: SCHEMA_ID, valid: true, value: seed },
    ];
    const single = inspectCorpus(closedSchema(), corpus);
    const doubled = inspectCorpus(closedSchema(), corpus, {
      roots: [...roots, { id: "test.read:result", ref: SCHEMA_ID }],
    });
    assert.equal(doubled.structure.total, single.structure.total);
    assert.deepEqual(doubled.covered, single.covered);
    assert.deepEqual(doubled.structure.uncovered, single.structure.uncovered);
    const shared = doubled.obligations.find(
      (obligation) => obligation.id === `${SCHEMA_ID}#::unknown-key:reject`,
    );
    assert.deepEqual(shared?.rootIds, [
      "test.read:request",
      "test.read:result",
    ]);
  });

  it("omits derived case values unless the caller asks for them", function () {
    const corpus = [
      { id: "seed", schemaRef: SCHEMA_ID, valid: true, value: seed },
    ];
    const metadataOnly = inspectCorpus(closedSchema(), corpus);
    assert.isAbove(metadataOnly.negatives.length, 0);
    assert.isTrue(metadataOnly.negatives.every((entry) => !("value" in entry)));

    const captured = inspectCorpus(closedSchema(), corpus, {
      captureValues: true,
    });
    assert.isTrue(
      captured.negatives.some((entry) => entry.value !== undefined),
    );
  });

  it("surfaces an exhausted traversal budget as an uncovered obligation", function () {
    const coverage = inspectCorpus(
      closedSchema(),
      [{ id: "seed", schemaRef: SCHEMA_ID, valid: true, value: seed }],
      { maxVisits: 2 },
    );
    assert.isTrue(coverage.truncated);
    assert.include(coverage.structure.uncovered, "traversal:truncated");
    assert.isFalse(coverage.complete);
  });

  it("instantiates map sub-obligations from a seed's real member names and leaves an unsampled map uncovered", function () {
    const cases = [
      {
        name: "patternProperties",
        obligationId: patternMapObligation,
        instancePath: "/x-a",
      },
      {
        name: "additionalProperties",
        obligationId: additionalMapObligation,
        instancePath: "/extra",
      },
    ];
    for (const entry of cases) {
      const coverage = inspectCorpus(mapSchema(), [
        {
          id: "map",
          schemaRef: SCHEMA_ID,
          valid: true,
          value: { kind: "map", "x-a": "v", extra: 4 },
        },
      ]);
      assert.include(coverage.covered, entry.obligationId, entry.name);
      assert.isEmpty(coverage.violations, JSON.stringify(coverage.violations));
      assert.isTrue(coverage.complete, entry.name);
      const negative = coverage.negatives.find(
        (item) => item.obligationId === entry.obligationId,
      );
      assert.equal(negative?.instancePath, entry.instancePath, entry.name);
      assert.equal(negative?.keyword, "type", entry.name);
    }

    const unsampled = inspectCorpus(mapSchema(), [
      { id: "map", schemaRef: SCHEMA_ID, valid: true, value: { kind: "map" } },
    ]);
    assert.include(unsampled.structure.uncovered, patternMapObligation);
    assert.include(unsampled.structure.uncovered, additionalMapObligation);
    assert.notInclude(unsampled.covered, patternMapObligation);
    assert.notInclude(unsampled.covered, additionalMapObligation);
    assert.isEmpty(unsampled.violations, JSON.stringify(unsampled.violations));
    assert.isFalse(unsampled.complete);
  });

  it("tests empty strings against their pattern instead of requiring an impossible acceptance", function () {
    const schema: CoverageSchemaObject = {
      $id: SCHEMA_ID,
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      required: ["hash"],
      properties: {
        hash: { type: "string", pattern: "^sha256:[a-f0-9]{64}$" },
      },
    };
    const coverage = inspectCorpus(schema, [
      {
        id: "seed",
        schemaRef: SCHEMA_ID,
        valid: true,
        value: { hash: "sha256:" + "a".repeat(64) },
      },
    ]);
    const emptyAccept = `${SCHEMA_ID}#/properties/hash::empty:accept`;
    assert.notInclude(coverage.violations, emptyAccept);
    assert.notInclude(coverage.structure.uncovered, emptyAccept);
    assert.include(
      coverage.covered,
      `${SCHEMA_ID}#/properties/hash::empty:reject`,
    );
  });

  it("keeps length boundaries but does not invent Unicode acceptance forbidden by an ASCII pattern", function () {
    const schema: CoverageSchemaObject = {
      $id: SCHEMA_ID,
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "string",
      maxLength: 3,
      pattern: "^[a-z]*$",
    };
    const coverage = inspectCorpus(schema, [
      { id: "ascii", schemaRef: SCHEMA_ID, valid: true, value: "abc" },
    ]);
    assert.include(coverage.covered, `${SCHEMA_ID}#::maxLength:accept`);
    assert.include(coverage.covered, `${SCHEMA_ID}#::maxLength:reject`);
    assert.notInclude(
      coverage.structure.uncovered,
      `${SCHEMA_ID}#::length-unicode:max:accept`,
    );
    assert.include(
      coverage.covered,
      `${SCHEMA_ID}#::length-unicode:max:reject`,
    );
  });

  it("tries another wrong type when a sibling union branch accepts the first probe", function () {
    const schema: CoverageSchemaObject = {
      $id: SCHEMA_ID,
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      additionalProperties: false,
      required: ["choice"],
      properties: { choice: { oneOf: [{ type: "string" }, { type: "null" }] } },
    };
    const coverage = inspectCorpus(schema, [
      { id: "seed", schemaRef: SCHEMA_ID, valid: true, value: { choice: "x" } },
    ]);
    const nullReject = `${SCHEMA_ID}#/properties/choice/oneOf/1::type:null:reject`;
    assert.notInclude(coverage.violations, nullReject);
    assert.include(coverage.covered, nullReject);
  });

  it("keeps an over-budget plan uncovered and reports the verification budget", function () {
    const corpus = [
      { id: "seed", schemaRef: SCHEMA_ID, valid: true, value: seed },
    ];
    const full = inspectCorpus(closedSchema(), corpus);
    assert.isEmpty(full.verificationBudget.exhausted);
    assert.isAbove(full.structure.covered, 0);

    const capped = inspectCorpus(closedSchema(), corpus, {
      maxVerificationAttempts: 0,
    });
    assert.equal(capped.verificationBudget.limit, 0);
    assert.equal(capped.verificationBudget.attempts, 0);
    assert.isAbove(capped.verificationBudget.exhausted.length, 0);
    for (const obligationId of capped.verificationBudget.exhausted)
      assert.include(capped.structure.uncovered, obligationId);
    assert.equal(capped.structure.covered, 0);
    assert.deepEqual(
      capped.obligations.map((obligation) => obligation.id),
      full.obligations.map((obligation) => obligation.id),
    );
    assert.isFalse(capped.complete);
    assert.isFalse(capped.truncated);

    const roomy = inspectCorpus(closedSchema(), corpus, {
      maxVerificationAttempts: full.verificationBudget.attempts,
    });
    assert.deepEqual(roomy.covered, full.covered);
    assert.isEmpty(roomy.verificationBudget.exhausted);
  });

  it("keeps large array bounds in the denominator when an automatic probe cannot allocate them", function () {
    const schema: CoverageSchemaObject = {
      $id: SCHEMA_ID,
      type: "array",
      maxItems: 1_000_000,
      items: { type: "string" },
    };
    const coverage = inspectCorpus(schema, [
      { id: "seed", schemaRef: SCHEMA_ID, valid: true, value: ["row"] },
    ]);
    assert.include(
      coverage.structure.uncovered,
      `${SCHEMA_ID}#::maxItems:accept`,
    );
    assert.include(
      coverage.structure.uncovered,
      `${SCHEMA_ID}#::maxItems:reject`,
    );
    assert.isFalse(coverage.complete);
  });
});
