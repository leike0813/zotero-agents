import { assert } from "chai";
import Ajv from "ajv";
import fs from "fs/promises";
import path from "path";
import { handlers } from "../../src/handlers";
import { validateAcpSkillRunRequestAgainstSchemas } from "../../src/modules/acpSkillSchemaAssets";
import { adaptSkillRunnerJobToAcpSkillRun } from "../../src/modules/acpSkillRunRequestAdapter";
import { buildSelectionContext } from "../../src/modules/selectionContext";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { executeBuildRequests } from "../../src/workflows/runtime";
import { resetWorkflowHostApiForTests } from "../../src/workflows/hostApi";
import { evaluateWorkflowSelection } from "../../src/workflows/workflowSelectionValidation";
import {
  joinPath,
  mkTempDir,
  workflowsPath,
  writeUtf8,
} from "../zotero/workflow-test-utils";
import { preflight } from "../../workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/preflight.mjs";
import { buildRequest } from "../../workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/buildRequest.mjs";
import { applyResult } from "../../workflows_builtin/literature-workbench-package/literature-metadata-curator/hooks/applyResult.mjs";
import { selectIdentifier } from "../../workflows_builtin/literature-workbench-package/lib/metadataCurator.mjs";

type TranslateCandidate = Record<string, unknown>;

async function createParent(args: {
  title: string;
  doi?: string;
  isbn?: string;
  url?: string;
  itemType?: string;
}) {
  const parent = await handlers.item.create({
    itemType: args.itemType || "journalArticle",
    fields: {
      title: args.title,
      ...(args.doi ? { DOI: args.doi } : {}),
      ...(args.isbn ? { ISBN: args.isbn } : {}),
      ...(args.url ? { url: args.url } : {}),
    },
  });
  return parent;
}

function makeRuntimeWithTranslate(args: {
  items?: TranslateCandidate[];
  throwMessage?: string;
}) {
  class Search {
    setIdentifierInput: unknown;
    setSearchInput: unknown;

    setIdentifier(input: unknown) {
      this.setIdentifierInput = input;
    }

    setSearch(input: unknown) {
      this.setSearchInput = input;
    }

    async getTranslators() {
      return [
        {
          translatorID: "translator-1",
          label: "Mock Translator",
          priority: 100,
          translatorType: 8,
        },
      ];
    }

    setTranslator() {
      // no-op
    }

    async translate() {
      if (args.throwMessage) {
        throw new Error(args.throwMessage);
      }
      return args.items || [];
    }
  }

  return {
    zotero: {
      ...Zotero,
      Translate: {
        Search,
      },
    },
    handlers,
  };
}

function makeHostApiOnlyRuntime(
  parent: Zotero.Item,
  metadataTranslate?: (args: unknown) => Promise<unknown> | unknown,
) {
  const resolveParent = (ref: unknown) => {
    if (ref && typeof ref === "object") {
      return ref;
    }
    if (typeof ref === "number" && ref === parent.id) {
      return parent;
    }
    if (typeof ref === "string" && ref === parent.key) {
      return parent;
    }
    throw new Error(`Item not found: ${String(ref)}`);
  };
  return {
    hostApi: {
      items: {
        get(ref: unknown) {
          try {
            return resolveParent(ref);
          } catch {
            return null;
          }
        },
        resolve: resolveParent,
        getByLibraryAndKey(libraryID: number, key: string) {
          return libraryID === parent.libraryID && key === parent.key
            ? parent
            : null;
        },
      },
      ...(metadataTranslate
        ? {
            metadata: {
              translateIdentifier: metadataTranslate,
            },
          }
        : {}),
    },
  };
}

async function withMockGlobalTranslate<T>(
  args: { items?: TranslateCandidate[]; translators?: unknown[] },
  callback: () => Promise<T>,
): Promise<T> {
  class Search {
    setIdentifierInput: unknown;
    setSearchInput: unknown;

    setIdentifier(input: unknown) {
      this.setIdentifierInput = input;
    }

    setSearch(input: unknown) {
      this.setSearchInput = input;
    }

    async getTranslators() {
      return (
        args.translators || [
          {
            translatorID: "global-translator-1",
            label: "Global Mock Translator",
            priority: 100,
            translatorType: 8,
          },
        ]
      );
    }

    setTranslator() {
      // no-op
    }

    async translate() {
      return args.items || [];
    }
  }

  const previousTranslate = (Zotero as any).Translate;
  (Zotero as any).Translate = { Search };
  resetWorkflowHostApiForTests();
  try {
    return await callback();
  } finally {
    if (previousTranslate === undefined) {
      delete (Zotero as any).Translate;
    } else {
      (Zotero as any).Translate = previousTranslate;
    }
    resetWorkflowHostApiForTests();
  }
}

async function selectionFor(parent: Zotero.Item) {
  return buildSelectionContext([parent]);
}

async function createPdfAttachment(args: {
  parent: Zotero.Item;
  dirPath: string;
  name: string;
}) {
  const pdfPath = joinPath(args.dirPath, args.name);
  await writeUtf8(pdfPath, "pdf");
  return handlers.attachment.createFromPath({
    parent: args.parent,
    path: pdfPath,
    title: args.name,
    mimeType: "application/pdf",
  });
}

async function getWorkflow() {
  const loaded = await loadWorkflowManifests(workflowsPath());
  const workflow = loaded.workflows.find(
    (entry) => entry.manifest.id === "literature-metadata-curator",
  );
  assert.isOk(
    workflow,
    `workflow literature-metadata-curator not found; errors=${JSON.stringify(
      loaded.errors,
    )}`,
  );
  return workflow!;
}

async function readSkillAsset(fileName: string) {
  return JSON.parse(
    await fs.readFile(
      path.join(
        process.cwd(),
        "skills_builtin",
        "literature-metadata-search",
        "assets",
        fileName,
      ),
      "utf8",
    ),
  );
}

function assertSchemaValid(
  schema: Record<string, unknown>,
  payload: Record<string, unknown>,
) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  assert.isTrue(validate(payload), ajv.errorsText(validate.errors));
}

describe("workflow: literature-metadata-curator", function () {
  afterEach(function () {
    resetWorkflowHostApiForTests();
  });

  it("declares automation-facing skill assets for generic metadata search", async function () {
    const skill = await fs.readFile(
      path.join(
        process.cwd(),
        "skills_builtin",
        "literature-metadata-search",
        "SKILL.md",
      ),
      "utf8",
    );
    const runner = await readSkillAsset("runner.json");
    const inputSchema = await readSkillAsset("input.schema.json");
    const outputSchema = await readSkillAsset("output.schema.json");

    assert.equal(runner.id, "literature-metadata-search");
    assert.equal(runner.execution_modes[0], "auto");
    assert.equal(runner.schemas.input, "assets/input.schema.json");
    assert.equal(runner.schemas.output, "assets/output.schema.json");
    assert.include(
      runner.entrypoint.prompts.common,
      "assets/output.schema.json",
    );
    assert.include(skill, "Candidate Acceptance Rules");
    assert.include(skill, "Do not call Zotero Host Bridge");
    assert.include(skill, "DOI.org");
    assert.include(skill, "Crossref");
    assert.include(skill, "OpenAlex");
    assert.include(skill, "Sci-Hub");
    for (const key of ["parent", "identifier", "diagnostics"]) {
      assert.equal(
        inputSchema.properties?.[key]?.["x-input-source"],
        "inline",
        `${key} must not be validated as an uploaded file input`,
      );
    }

    assertSchemaValid(inputSchema, {
      parent: {
        id: 42,
        itemType: "journalArticle",
        title: "A Partial Metadata Record",
        DOI: "10.1000/example",
        fields: {
          title: "A Partial Metadata Record",
          DOI: "10.1000/example",
        },
        creators: [{ firstName: "Ada", lastName: "Lovelace" }],
      },
      identifier: {
        type: "DOI",
        value: "10.1000/example",
        normalized: "10.1000/example",
      },
      diagnostics: [{ code: "no_items", message: "No items" }],
    });

    const succeeded = {
      kind: "literature_metadata_curation",
      status: "succeeded",
      source: "literature-metadata-search",
      metadata: {
        fields: {
          title: "A Partial Metadata Record",
          DOI: "10.1000/example",
          publicationTitle: "Example Journal",
        },
        creators: [
          {
            creatorType: "author",
            firstName: "Ada",
            lastName: "Lovelace",
          },
        ],
      },
      evidence: [
        {
          source: "Crossref",
          url: "https://doi.org/10.1000/example",
          identifier: "10.1000/example",
          reason: "Normalized DOI matches the source record.",
        },
      ],
      warnings: [],
      error: {},
    };
    assertSchemaValid(outputSchema, succeeded);
    assertSchemaValid(outputSchema, {
      ...succeeded,
      status: "skipped",
      metadata: { fields: {}, creators: [] },
      evidence: [],
      warnings: [
        {
          code: "metadata_not_found",
          message: "No trustworthy metadata candidate was found.",
        },
      ],
    });
    assertSchemaValid(outputSchema, {
      ...succeeded,
      status: "failed",
      metadata: { fields: {}, creators: [] },
      evidence: [],
      warnings: [],
      error: {
        code: "invalid_input",
        message: "input.parent is required.",
      },
    });
  });

  it("loads workflow manifest with preflight, buildRequest, and applyResult hooks", async function () {
    const workflow = await getWorkflow();
    assert.equal(workflow.manifest.provider, "skillrunner");
    assert.equal(workflow.manifest.inputs?.unit, "parent");
    assert.equal(
      workflow.manifest.validateSelection?.select?.policy,
      "literature-parent",
    );
    assert.equal(workflow.manifest.request?.kind, "skillrunner.job.v1");
    assert.equal(
      workflow.manifest.request?.create?.skill_id,
      "literature-metadata-search",
    );
    assert.isFunction(workflow.hooks.preflight);
    assert.isFunction(workflow.hooks.buildRequest);
    assert.isFunction(workflow.hooks.applyResult);
  });

  it("normalizes parent and attachment selections into one unit per parent", async function () {
    const workflow = await getWorkflow();
    const dirPath = await mkTempDir("metadata-curator-selection");
    const parentA = await createParent({ title: "Parent A" });
    const parentB = await createParent({ title: "Parent B" });
    const attachmentA1 = await createPdfAttachment({
      parent: parentA,
      dirPath,
      name: "a-1.pdf",
    });
    const attachmentA2 = await createPdfAttachment({
      parent: parentA,
      dirPath,
      name: "a-2.pdf",
    });
    const attachmentB = await createPdfAttachment({
      parent: parentB,
      dirPath,
      name: "b.pdf",
    });

    const validation = await evaluateWorkflowSelection({
      workflow,
      selectionContext: await buildSelectionContext([
        parentA,
        attachmentA1,
        attachmentA2,
        attachmentB,
      ]),
      mode: "execute",
    });

    assert.equal(validation.state, "enabled");
    assert.equal(validation.stats.totalUnits, 2);
    assert.sameMembers(
      validation.scopedSelectionContexts.map(
        (context: any) => context.items.parents[0].item.id,
      ),
      [parentA.id, parentB.id],
    );
    for (const context of validation.scopedSelectionContexts as any[]) {
      assert.equal(context.selectionType, "parent");
      assert.lengthOf(context.items.parents, 1);
      assert.lengthOf(context.items.attachments, 0);
      assert.lengthOf(context.items.children, 0);
      assert.lengthOf(context.items.notes, 0);
    }
  });

  it("builds one request for an attachment-only selection by resolving its parent", async function () {
    const workflow = await getWorkflow();
    const dirPath = await mkTempDir("metadata-curator-attachment");
    const parent = await createParent({
      title: "Attachment parent",
      doi: "10.1000/attachment-parent",
    });
    const attachment = await createPdfAttachment({
      parent,
      dirPath,
      name: "source.pdf",
    });

    const requests = (await executeBuildRequests({
      workflow,
      selectionContext: await buildSelectionContext([attachment]),
    })) as any[];

    assert.lengthOf(requests, 1);
    assert.equal(requests[0].targetParentID, parent.id);
    assert.equal(requests[0].input.parent.id, parent.id);
    assert.equal(requests[0].input.parent.title, "Attachment parent");
  });

  it("short-circuits apply when DOI Translate Search returns trustworthy metadata", async function () {
    const parent = await createParent({
      title: "Draft title",
      doi: "10.1016/j.engappai.2025.113628",
    });
    const outcome = await preflight({
      selectionContext: await selectionFor(parent),
      runtime: makeRuntimeWithTranslate({
        items: [
          {
            DOI: "10.1016/j.engappai.2025.113628",
            title: "A novel time series classification model",
            publicationTitle:
              "Engineering Applications of Artificial Intelligence",
            creators: [
              {
                firstName: "Ke",
                lastName: "Lei",
                creatorType: "author",
              },
            ],
          },
        ],
      }),
    } as any);

    assert.equal(outcome.kind, "short-circuit-apply");
    assert.equal((outcome as any).apply.parent, parent.id);
    assert.equal(
      (outcome as any).apply.resultJson.kind,
      "literature_metadata_curation",
    );
    assert.equal(
      (outcome as any).apply.resultJson.metadata.fields.title,
      "A novel time series classification model",
    );
    assert.deepEqual((outcome as any).apply.resultJson.metadata.creators, [
      {
        firstName: "Ke",
        lastName: "Lei",
        creatorType: "author",
      },
    ]);
  });

  it("derives stable identifiers from DOI, arXiv, and PubMed URLs", function () {
    assert.deepInclude(
      selectIdentifier({
        fields: {
          url: "https://doi.org/10.1016/j.engappai.2025.113628",
        },
      }),
      {
        type: "DOI",
        normalized: "10.1016/j.engappai.2025.113628",
        source: "url",
      },
    );
    assert.deepInclude(
      selectIdentifier({
        fields: {
          url: "https://arxiv.org/pdf/2301.12345v2.pdf",
        },
      }),
      {
        type: "arXiv",
        normalized: "2301.12345v2",
        source: "url",
      },
    );
    assert.deepInclude(
      selectIdentifier({
        fields: {
          url: "https://pubmed.ncbi.nlm.nih.gov/12345678/",
        },
      }),
      {
        type: "PMID",
        normalized: "12345678",
        source: "url",
      },
    );
    assert.isNull(
      selectIdentifier({
        fields: {
          url: "https://example.org/article-without-stable-id",
        },
      }),
    );
  });

  it("short-circuits apply from a DOI URL when DOI field is absent", async function () {
    const parent = await createParent({
      title: "URL DOI draft",
      url: "https://doi.org/10.1016/j.engappai.2025.113628",
    });
    const outcome = await preflight({
      selectionContext: await selectionFor(parent),
      runtime: makeRuntimeWithTranslate({
        items: [
          {
            DOI: "10.1016/j.engappai.2025.113628",
            title: "URL DOI metadata",
          },
        ],
      }),
    } as any);

    assert.equal(outcome.kind, "short-circuit-apply");
    assert.equal(
      (outcome as any).apply.resultJson.metadata.fields.title,
      "URL DOI metadata",
    );
    assert.equal((outcome as any).context.identifierType, "DOI");
  });

  it("short-circuits package precompiled host hook from a DOI URL through hostApi metadata", async function () {
    const workflow = await getWorkflow();
    const parent = await createParent({
      title: "URL DOI package draft",
      url: "https://doi.org/10.1109/elmar55880.2022.9899786",
    });

    const requests = await withMockGlobalTranslate(
      {
        items: [
          {
            itemType: "conferencePaper",
            DOI: "10.1109/elmar55880.2022.9899786",
            title: "URL DOI package metadata",
            publicationTitle: "ELMAR Proceedings",
          },
        ],
      },
      async () =>
        executeBuildRequests({
          workflow,
          selectionContext: await buildSelectionContext([parent]),
        }),
    );

    assert.lengthOf(requests as any[], 0);
    assert.lengthOf((requests as any).__preflight.shortCircuitApplies, 1);
    assert.equal(
      (requests as any).__preflight.shortCircuitApplies[0].runResult.resultJson
        .metadata.fields.title,
      "URL DOI package metadata",
    );
  });

  it("uses hostApi metadata fast path for DOI, ISBN, and supported URL identifiers", async function () {
    const cases = [
      {
        parent: await createParent({
          title: "DOI host draft",
          doi: "10.1000/doi-host",
        }),
        expectedType: "DOI",
        item: { DOI: "10.1000/doi-host", title: "DOI host metadata" },
      },
      {
        parent: await createParent({
          title: "ISBN host draft",
          isbn: "978-0-262-03384-8",
          itemType: "book",
        }),
        expectedType: "ISBN",
        item: { ISBN: "9780262033848", title: "ISBN host metadata" },
      },
      {
        parent: await createParent({
          title: "DOI URL host draft",
          url: "https://doi.org/10.1000/url-host",
        }),
        expectedType: "DOI",
        item: { DOI: "10.1000/url-host", title: "DOI URL host metadata" },
      },
      {
        parent: await createParent({
          title: "arXiv URL host draft",
          url: "https://arxiv.org/abs/2301.12345",
        }),
        expectedType: "arXiv",
        item: { archiveID: "arXiv:2301.12345", title: "arXiv host metadata" },
      },
      {
        parent: await createParent({
          title: "PubMed URL host draft",
          url: "https://pubmed.ncbi.nlm.nih.gov/12345678/",
        }),
        expectedType: "PMID",
        item: { PMID: "12345678", title: "PubMed host metadata" },
      },
    ];

    for (const entry of cases) {
      let requestedType = "";
      const runtime = makeHostApiOnlyRuntime(
        entry.parent,
        async (args: any) => {
          requestedType = args?.type || "";
          return {
            ok: true,
            item: {
              itemType: entry.parent.itemType,
              fields: { ...entry.item },
              creators: [],
              ...entry.item,
            },
            itemCount: 1,
            translators: [{ translatorID: "host-api", label: "Host API" }],
            diagnostics: [],
          };
        },
      );

      const outcome = await preflight({
        selectionContext: await selectionFor(entry.parent),
        runtime,
      } as any);

      assert.equal(outcome.kind, "short-circuit-apply");
      assert.equal(requestedType, entry.expectedType);
      assert.equal(
        (outcome as any).apply.resultJson.metadata.fields.title,
        entry.item.title,
      );
    }
  });

  it("short-circuits apply from arXiv and PubMed URLs", async function () {
    const arxivParent = await createParent({
      title: "arXiv draft",
      url: "https://arxiv.org/abs/2301.12345",
    });
    const arxivOutcome = await preflight({
      selectionContext: await selectionFor(arxivParent),
      runtime: makeRuntimeWithTranslate({
        items: [
          {
            archiveID: "arXiv:2301.12345",
            title: "arXiv metadata",
          },
        ],
      }),
    } as any);

    assert.equal(arxivOutcome.kind, "short-circuit-apply");
    assert.equal(
      (arxivOutcome as any).apply.resultJson.metadata.fields.title,
      "arXiv metadata",
    );
    assert.equal((arxivOutcome as any).context.identifierType, "arXiv");

    const pubmedParent = await createParent({
      title: "PubMed draft",
      url: "https://pubmed.ncbi.nlm.nih.gov/12345678/",
    });
    const pubmedOutcome = await preflight({
      selectionContext: await selectionFor(pubmedParent),
      runtime: makeRuntimeWithTranslate({
        items: [
          {
            PMID: "12345678",
            title: "PubMed metadata",
          },
        ],
      }),
    } as any);

    assert.equal(pubmedOutcome.kind, "short-circuit-apply");
    assert.equal(
      (pubmedOutcome as any).apply.resultJson.metadata.fields.title,
      "PubMed metadata",
    );
    assert.equal((pubmedOutcome as any).context.identifierType, "PMID");
  });

  it("continues to fallback when DOI Translate Search returns no items", async function () {
    const parent = await createParent({
      title: "CNKI thesis",
      doi: "10.26944/d.cnki.gbfju.2024.000021",
    });
    const outcome = await preflight({
      selectionContext: await selectionFor(parent),
      runtime: makeRuntimeWithTranslate({ items: [] }),
    } as any);

    assert.equal(outcome.kind, "continue");
    assert.equal((outcome as any).context.parent.id, parent.id);
    assert.equal((outcome as any).context.diagnostics[0].code, "no_items");
  });

  it("continues to fallback with hostApi metadata diagnostics when candidates are inconclusive", async function () {
    const parent = await createParent({
      title: "Host inconclusive",
      doi: "10.1000/host-inconclusive",
    });
    const runtime = makeHostApiOnlyRuntime(parent, async () => ({
      ok: false,
      item: null,
      itemCount: 0,
      translators: [{ translatorID: "host-api", label: "Host API" }],
      diagnostics: [
        {
          code: "no_items",
          message: "No items returned from any translator.",
          details: { itemCount: 0 },
        },
      ],
    }));
    const outcome = await preflight({
      selectionContext: await selectionFor(parent),
      runtime,
    } as any);

    assert.equal(outcome.kind, "continue");
    assert.equal((outcome as any).context.identifier.type, "DOI");
    assert.equal((outcome as any).context.diagnostics[0].code, "no_items");
  });

  it("continues to fallback when selected parent has no supported identifier", async function () {
    const parent = await createParent({
      title: "No DOI parent",
    });
    const outcome = await preflight({
      selectionContext: await selectionFor(parent),
      runtime: makeRuntimeWithTranslate({ items: [] }),
    } as any);

    assert.equal(outcome.kind, "continue");
    assert.equal(
      (outcome as any).context.diagnostics[0].code,
      "identifier_missing",
    );
  });

  it("resolves selected parent and fast-path metadata through hostApi when Zotero runtime is not exposed", async function () {
    const parent = await createParent({
      title: "Host API parent",
      doi: "10.1000/host-api-parent",
    });
    const selectionContext = await selectionFor(parent);
    const runtime = makeHostApiOnlyRuntime(parent, async () => ({
      ok: true,
      item: {
        itemType: "journalArticle",
        DOI: "10.1000/host-api-parent",
        title: "Host API metadata",
        fields: {
          DOI: "10.1000/host-api-parent",
          title: "Host API metadata",
        },
        creators: [],
      },
      itemCount: 1,
      translators: [
        {
          translatorID: "host-api-translator",
          label: "Host API Translator",
        },
      ],
      diagnostics: [],
    }));

    const outcome = await preflight({
      selectionContext,
      runtime,
    } as any);
    assert.equal(outcome.kind, "short-circuit-apply");
    assert.equal(
      (outcome as any).apply.resultJson.metadata.fields.title,
      "Host API metadata",
    );

    const request = (await buildRequest({
      selectionContext,
      runtime: makeHostApiOnlyRuntime(parent),
    } as any)) as any;
    assert.equal(request.targetParentID, parent.id);
    assert.equal(request.input.parent.id, parent.id);
    assert.equal(request.input.parent.title, "Host API parent");
    assert.equal(request.input.identifier.type, "DOI");
  });

  it("short-circuits apply when ISBN Translate Search returns trustworthy metadata", async function () {
    const parent = await createParent({
      title: "Book draft",
      isbn: "978-0-262-03384-8",
      itemType: "book",
    });
    const outcome = await preflight({
      selectionContext: await selectionFor(parent),
      runtime: makeRuntimeWithTranslate({
        items: [
          {
            ISBN: "9780262033848",
            title: "Introduction to Algorithms",
            publisher: "MIT Press",
          },
        ],
      }),
    } as any);

    assert.equal(outcome.kind, "short-circuit-apply");
    assert.equal(
      (outcome as any).apply.resultJson.metadata.fields.publisher,
      "MIT Press",
    );
  });

  it("builds one automatic SkillRunner fallback request with parent snapshot", async function () {
    const parent = await createParent({
      title: "Fallback parent",
      doi: "10.1000/fallback",
    });
    const request = (await buildRequest({
      selectionContext: await selectionFor(parent),
      preflight: {
        planId: "unit-1",
        unitId: "main",
        context: {
          parent: {
            id: parent.id,
            key: parent.key,
            libraryID: parent.libraryID,
            itemType: parent.itemType,
            title: "Fallback parent",
            DOI: "10.1000/fallback",
            fields: {
              title: "Fallback parent",
              DOI: "10.1000/fallback",
            },
          },
          diagnostics: [{ code: "no_items", message: "No items" }],
        },
      },
      runtime: { zotero: Zotero, handlers },
    } as any)) as any;

    assert.equal(request.kind, "skillrunner.job.v1");
    assert.equal(request.skill_id, "literature-metadata-search");
    assert.equal(request.runtime_options.execution_mode, "auto");
    assert.equal(request.fetch_type, "result");
    assert.equal(request.targetParentID, parent.id);
    assert.equal(request.input.parent.id, parent.id);
    assert.equal(request.input.diagnostics[0].code, "no_items");
    assertSchemaValid(await readSkillAsset("input.schema.json"), request.input);

    const validation = await validateAcpSkillRunRequestAgainstSchemas({
      request: adaptSkillRunnerJobToAcpSkillRun(request),
      runnerJson: await readSkillAsset("runner.json"),
      skillDir: path.join(
        process.cwd(),
        "skills_builtin",
        "literature-metadata-search",
      ),
      workspaceDir: process.cwd(),
    });
    assert.isTrue(validation.ok, validation.errors.join("\n"));
  });

  it("applies canonical metadata fields and creators without changing item type", async function () {
    const parent = await createParent({
      title: "Before metadata",
      doi: "10.1000/before",
    });
    const result = (await applyResult({
      parent,
      runResult: {
        resultJson: {
          kind: "literature_metadata_curation",
          status: "succeeded",
          source: "test",
          metadata: {
            fields: {
              title: "After metadata",
              DOI: "10.1000/after",
              itemType: "book",
              numPages: 300,
            },
            creators: [
              {
                name: "Metadata Group",
                creatorType: "author",
              },
            ],
          },
        },
      },
      runtime: { zotero: Zotero, handlers },
    } as any)) as any;

    assert.isTrue(result.applied);
    assert.equal(parent.itemType, "journalArticle");
    assert.equal(parent.getField("title"), "After metadata");
    assert.equal(parent.getField("DOI"), "10.1000/after");
    assert.equal(String(parent.getField("numPages") || ""), "");
    assert.deepEqual((parent as any).getCreators(), [
      {
        name: "Metadata Group",
        creatorType: "author",
      },
    ]);
  });
});
