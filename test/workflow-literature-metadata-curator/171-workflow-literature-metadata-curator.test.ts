import { assert } from "chai";
import Ajv from "ajv";
import fs from "fs/promises";
import path from "path";
import { handlers } from "../../src/handlers";
import { validateAcpSkillRunRequestAgainstSchemas } from "../../src/modules/acpSkillSchemaAssets";
import { adaptSkillRunnerJobToAcpSkillRun } from "../../src/modules/acpSkillRunRequestAdapter";
import {
  buildSelectionContext,
  itemRef,
} from "../helpers/workflowSelectionContext";
import { loadWorkflowManifests } from "../../src/workflows/loader";
import { executeBuildRequests } from "../../src/workflows/runtime";
import {
  createWorkflowHostApi,
  resetWorkflowHostApiForTests,
} from "../../src/workflows/hostApi";
import { evaluateWorkflowSelection } from "../../src/workflows/workflowInputPlanning";
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
  const hostApi = createWorkflowHostApi();
  return {
    hostApiVersion: 12,
    hostApi: {
      ...hostApi,
      metadata: {
        async translateIdentifier() {
          if (args.throwMessage) throw new Error(args.throwMessage);
          const items = args.items || [];
          const evidence = {
            normalizedIdentifier: "test-identifier",
            candidateCount: items.length,
            matchingCandidateCount: items.length ? 1 : 0,
            translators: [{ id: "translator-1", label: "Mock Translator" }],
          };
          if (items.length === 0) {
            return {
              outcome: "not_found",
              reason: "no_candidate",
              evidence,
            };
          }
          const item = items[0];
          return {
            outcome: "matched",
            item: {
              schema: "zotero-agents.portable-regular-item.v1",
              itemType: String(item.itemType || "journalArticle"),
              fields: Object.fromEntries(
                Object.entries(item).filter(
                  ([key, value]) =>
                    key !== "itemType" &&
                    key !== "creators" &&
                    typeof value === "string",
                ),
              ),
              creators: (Array.isArray(item.creators) ? item.creators : []).map(
                (creator: any) =>
                  creator.name
                    ? {
                        representation: "single_field",
                        creatorType: creator.creatorType || "author",
                        name: creator.name,
                      }
                    : {
                        representation: "two_field",
                        creatorType: creator.creatorType || "author",
                        firstName: creator.firstName || "",
                        lastName: creator.lastName || "",
                      },
              ),
              tags: [],
            },
            evidence,
          };
        },
      },
    },
  };
}

function makeHostApiOnlyRuntime(
  _parent: Zotero.Item,
  metadataTranslate?: (args: unknown) => Promise<unknown> | unknown,
) {
  const hostApi = createWorkflowHostApi();
  return {
    hostApiVersion: 12,
    hostApi: {
      ...hostApi,
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

function makeApplyRuntime(
  overrides: Partial<ReturnType<typeof createWorkflowHostApi>> = {},
) {
  return {
    hostApiVersion: 12,
    hostApi: {
      ...createWorkflowHostApi(),
      ...overrides,
    },
  };
}

async function withMockGlobalTranslate<T>(
  args: {
    items?: TranslateCandidate[];
    translators?: unknown[];
    onTranslate?: () => void;
  },
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
      args.onTranslate?.();
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

function assertSchemaInvalid(
  schema: Record<string, unknown>,
  payload: Record<string, unknown>,
) {
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(schema);
  assert.isFalse(validate(payload));
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
    const normalizedSkill = skill.replace(/\s+/g, " ");
    assert.match(
      normalizedSkill,
      /direct work.*original publication language is Chinese.*Chinese-character form/i,
    );
    assert.match(
      normalizedSkill,
      /do not (guess|infer|back-transliterate).*Chinese characters/i,
    );
    assert.match(
      normalizedSkill,
      /direct work.*original publication language is Chinese.*single Zotero `name` field/i,
    );
    assert.include(normalizedSkill, '"name": "张三"');
    assert.match(
      normalizedSkill,
      /search snippet.*(?:not sufficient|must not)/i,
    );
    assert.match(
      normalizedSkill,
      /title.*creator.*journal.*conference.*university.*institution.*publisher/i,
    );
    assert.match(
      normalizedSkill,
      /creatorCompleteness.*(?:incomplete|unknown).*creators.*empty/i,
    );
    assert.match(normalizedSkill, /Safe Partial Updates.*edition/i);
    assert.include(normalizedSkill, "native_creator_names_unverified");
    assert.equal(runner.version, "1.2.0");
    for (const key of ["parent", "identifier", "diagnostics"]) {
      assert.equal(
        inputSchema.properties?.[key]?.["x-input-source"],
        "inline",
        `${key} must not be validated as an uploaded file input`,
      );
    }

    assertSchemaValid(inputSchema, {
      parent: {
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
        itemType: "thesis",
        originalTitle: {
          value: "示例文献",
          language: "zh-CN",
          script: "Hans",
        },
        alternateTitles: [
          {
            value: "Example Literature",
            role: "translated",
            language: "en",
            script: "Latn",
          },
        ],
        language: "zh-CN",
        script: "Hans",
        containers: [
          {
            role: "journal",
            title: "示例期刊",
            language: "zh-CN",
            script: "Hans",
          },
        ],
        creatorCompleteness: "complete",
        fields: {
          title: "A Partial Metadata Record",
          DOI: "10.1000/example",
          publicationTitle: "Example Journal",
        },
        creators: [
          {
            creatorType: "author",
            name: "张三",
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
      metadata: {
        ...succeeded.metadata,
        fields: {
          ...succeeded.metadata.fields,
          abstractNote: "A schema-supported abstract.",
        },
      },
    });
    assertSchemaInvalid(outputSchema, {
      ...succeeded,
      metadata: {
        ...succeeded.metadata,
        fields: {
          ...succeeded.metadata.fields,
          abstract: "An unsupported abstract field.",
        },
      },
    });
    assertSchemaValid(outputSchema, {
      ...succeeded,
      status: "verified_no_change",
      metadata: { fields: {}, creators: [] },
      evidence: [],
      warnings: [],
    });
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
    assert.equal(workflow.manifest.inputs.member.kind, "parent");
    assert.equal(workflow.manifest.inputs.grouping.mode, "each");
    assert.equal(
      workflow.manifest.parameters?.skip_identifier_fast_path?.type,
      "boolean",
    );
    assert.isFalse(
      workflow.manifest.parameters?.skip_identifier_fast_path?.default,
    );
    assert.equal(
      workflow.manifest.validateSelection.select.policy,
      "input-member",
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
        (context: any) =>
          context.items.find((item: any) => item.kind === "parent")?.ref.key,
      ),
      [parentA.key, parentB.key],
    );
    for (const context of validation.scopedSelectionContexts as any[]) {
      assert.lengthOf(
        context.items.filter((item: any) => item.kind === "parent"),
        1,
      );
      assert.lengthOf(
        context.items.filter((item: any) => item.kind === "attachment"),
        0,
      );
      assert.lengthOf(
        context.items.filter((item: any) => item.kind === "child"),
        0,
      );
      assert.lengthOf(
        context.items.filter((item: any) => item.kind === "note"),
        0,
      );
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
    assert.deepEqual(requests[0].targetParentRef, itemRef(parent));
    assert.notProperty(requests[0].input.parent, "id");
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
    assert.deepEqual((outcome as any).apply.parent, itemRef(parent));
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

  it("preserves authoritative Chinese title and creators on a romanized DOI fast path", async function () {
    const parent = await createParent({
      title: "面向学术知识发现的智能体方法研究",
      doi: "10.1016/example.chinese",
    });
    (parent as any).setCreators([{ name: "欧阳明", creatorType: "author" }]);
    await parent.saveTx();

    const outcome = await preflight({
      selectionContext: await selectionFor(parent),
      runtime: makeRuntimeWithTranslate({
        items: [
          {
            DOI: "10.1016/example.chinese",
            title: "Agentic Methods for Academic Knowledge Discovery",
            date: "2026",
            creators: [
              {
                firstName: "Ming",
                lastName: "Ouyang",
                creatorType: "author",
              },
            ],
          },
        ],
      }),
    } as any);

    assert.equal(outcome.kind, "short-circuit-apply");
    const result = (outcome as any).apply.resultJson;
    assert.notProperty(result.metadata.fields, "title");
    assert.notProperty(result.metadata, "creators");
    assert.equal(result.metadata.fields.date, "2026");
    assert.include(
      result.warnings.map((entry: any) => entry.code),
      "native_title_translation_only",
    );
    assert.include(
      result.warnings.map((entry: any) => entry.code),
      "native_creator_names_unverified",
    );
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

  it("extracts identifiers from multi-line Extra metadata", function () {
    assert.deepInclude(
      selectIdentifier({
        fields: {
          extra:
            "Original title: 示例文献\nPMID: 12345678\narXiv: 2301.12345v2",
        },
      }),
      {
        type: "arXiv",
        normalized: "2301.12345v2",
        source: "extra",
      },
    );
    assert.deepInclude(
      selectIdentifier({
        fields: {
          extra: "Citation Key: sample\nDOI: 10.1000/extra-doi\nPMID: 9",
        },
      }),
      {
        type: "DOI",
        normalized: "10.1000/extra-doi",
        source: "extra",
      },
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
    assert.equal(
      (requests as any).__preflight.shortCircuitApplies[0].runResult.resultJson
        .metadata.itemType,
      "conferencePaper",
    );
  });

  it("skips identifier lookup and submits the skill when explicitly requested", async function () {
    const workflow = await getWorkflow();
    const parent = await createParent({
      title: "Force agent search",
      doi: "10.1000/force-agent-search",
    });
    let translateCalls = 0;

    const requests = (await withMockGlobalTranslate(
      {
        items: [
          {
            DOI: "10.1000/force-agent-search",
            title: "Local shortcut result",
          },
        ],
        onTranslate: () => {
          translateCalls += 1;
        },
      },
      async () =>
        executeBuildRequests({
          workflow,
          selectionContext: await buildSelectionContext([parent]),
          executionOptions: {
            workflowParams: { skip_identifier_fast_path: true },
          },
        }),
    )) as any[];

    assert.equal(translateCalls, 0);
    assert.lengthOf(requests, 1);
    assert.equal(requests[0].skill_id, "literature-metadata-search");
    assert.deepInclude(requests[0].input.identifier, {
      type: "DOI",
      normalized: "10.1000/force-agent-search",
    });
    assert.lengthOf((requests as any).__preflight.shortCircuitApplies, 0);
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
            outcome: "matched",
            item: {
              schema: "zotero-agents.portable-regular-item.v1",
              itemType: entry.parent.itemType,
              fields: { ...entry.item },
              creators: [],
              tags: [],
            },
            evidence: {
              normalizedIdentifier: String((args as any)?.value || ""),
              candidateCount: 1,
              matchingCandidateCount: 1,
              translators: [{ id: "host-api", label: "Host API" }],
            },
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
    assert.deepEqual((outcome as any).context.parentRef, itemRef(parent));
    assert.equal((outcome as any).context.diagnostics[0].code, "no_candidate");
  });

  it("continues to fallback with hostApi metadata diagnostics when candidates are inconclusive", async function () {
    const parent = await createParent({
      title: "Host inconclusive",
      doi: "10.1000/host-inconclusive",
    });
    const runtime = makeHostApiOnlyRuntime(parent, async () => ({
      outcome: "not_found",
      reason: "no_candidate",
      evidence: {
        normalizedIdentifier: "10.1000/host-inconclusive",
        candidateCount: 0,
        matchingCandidateCount: 0,
        translators: [{ id: "host-api", label: "Host API" }],
      },
    }));
    const outcome = await preflight({
      selectionContext: await selectionFor(parent),
      runtime,
    } as any);

    assert.equal(outcome.kind, "continue");
    assert.equal((outcome as any).context.identifier.type, "DOI");
    assert.equal((outcome as any).context.diagnostics[0].code, "no_candidate");
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
      outcome: "matched",
      item: {
        schema: "zotero-agents.portable-regular-item.v1",
        itemType: "journalArticle",
        fields: {
          DOI: "10.1000/host-api-parent",
          title: "Host API metadata",
        },
        creators: [],
        tags: [],
      },
      evidence: {
        normalizedIdentifier: "10.1000/host-api-parent",
        candidateCount: 1,
        matchingCandidateCount: 1,
        translators: [
          { id: "host-api-translator", label: "Host API Translator" },
        ],
      },
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
    assert.deepEqual(request.targetParentRef, itemRef(parent));
    assert.notProperty(request.input.parent, "id");
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
      runtime: makeApplyRuntime(),
    } as any)) as any;

    assert.equal(request.kind, "skillrunner.job.v1");
    assert.equal(request.skill_id, "literature-metadata-search");
    assert.equal(request.runtime_options.execution_mode, "auto");
    assert.equal(request.fetch_type, "result");
    assert.deepEqual(request.targetParentRef, itemRef(parent));
    assert.notProperty(request.input.parent, "id");
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

  it("applies canonical metadata fields and a single-field Chinese creator without changing item type", async function () {
    const parent = await createParent({
      title: "Before metadata",
      doi: "10.1000/before",
    });
    const result = (await applyResult({
      parent: itemRef(parent),
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
                name: "张三",
                creatorType: "author",
              },
            ],
          },
        },
      },
      runtime: makeApplyRuntime(),
    } as any)) as any;

    assert.isTrue(result.applied);
    assert.equal(parent.itemType, "journalArticle");
    assert.equal(parent.getField("title"), "After metadata");
    assert.equal(parent.getField("DOI"), "10.1000/after");
    assert.equal(String(parent.getField("numPages") || ""), "");
    assert.deepEqual(parent.getCreatorsJSON(), [
      {
        name: "张三",
        creatorType: "author",
      },
    ]);
  });

  it("removes the metadata-curation tag after successful apply", async function () {
    const parent = await createParent({ title: "Before tagged metadata" });
    const removed: Array<{ itemRef: unknown; tags: string[] }> = [];
    const result = (await applyResult({
      parent: itemRef(parent),
      runResult: {
        resultJson: {
          kind: "literature_metadata_curation",
          status: "succeeded",
          source: "test",
          metadata: { fields: { title: "After tagged metadata" } },
        },
      },
      runtime: makeApplyRuntime({
        statusTags: {
          ...createWorkflowHostApi().statusTags,
          async transition({ itemRef, remove }: any) {
            removed.push({ itemRef, tags: remove });
            return {
              outcome: "committed",
              result: { added: [], removed: remove, unchanged: [] },
            };
          },
        },
      }),
    } as any)) as any;

    assert.isTrue(result.applied);
    assert.deepEqual(removed, [
      {
        itemRef: { libraryId: parent.libraryID, key: parent.key },
        tags: ["need-metadata-curation"],
      },
    ]);
    assert.isTrue(result.curationTagRemoved);
  });

  it("keeps the metadata-curation tag when curation is skipped", async function () {
    const removals = 0;
    const result = (await applyResult({
      parent: itemRef(await createParent({ title: "Unresolved metadata" })),
      runResult: {
        resultJson: {
          kind: "literature_metadata_curation",
          status: "skipped",
          source: "test",
          metadata: { fields: {} },
        },
      },
      runtime: makeApplyRuntime(),
    } as any)) as any;

    assert.isTrue(result.skipped);
    assert.equal(removals, 0);
  });

  it("removes the metadata-curation tag after verified no-change", async function () {
    const parent = await createParent({ title: "Already canonical" });
    const removals: unknown[] = [];
    const result = (await applyResult({
      parent: itemRef(parent),
      runResult: {
        resultJson: {
          kind: "literature_metadata_curation",
          status: "verified_no_change",
          source: "test",
          metadata: { fields: {}, creators: [] },
        },
      },
      runtime: makeApplyRuntime({
        statusTags: {
          ...createWorkflowHostApi().statusTags,
          async transition({ itemRef, remove }: any) {
            removals.push({ itemRef, tags: remove });
            return {
              outcome: "committed",
              result: { added: [], removed: remove, unchanged: [] },
            };
          },
        },
      }),
    } as any)) as any;

    assert.isFalse(result.applied);
    assert.isTrue(result.verifiedNoChange);
    assert.isTrue(result.curationTagRemoved);
    assert.deepEqual(removals, [
      {
        itemRef: { libraryId: parent.libraryID, key: parent.key },
        tags: ["need-metadata-curation"],
      },
    ]);
  });

  it("reports tag cleanup failure as a partial successful apply", async function () {
    const parent = await createParent({ title: "Cleanup failure" });
    const result = (await applyResult({
      parent: itemRef(parent),
      runResult: {
        resultJson: {
          kind: "literature_metadata_curation",
          status: "succeeded",
          source: "test",
          metadata: { fields: { date: "2026" }, creators: [] },
        },
      },
      runtime: makeApplyRuntime({
        statusTags: {
          ...createWorkflowHostApi().statusTags,
          async transition() {
            throw new Error("tag store unavailable");
          },
        },
      }),
    } as any)) as any;

    assert.isTrue(result.applied);
    assert.isTrue(result.partial);
    assert.isFalse(result.curationTagRemoved);
    assert.include(
      result.cleanupWarnings.map((entry: any) => entry.code),
      "metadata_curation_tag_cleanup_failed",
    );
  });

  it("preserves existing creators when canonical metadata has no replacement list", async function () {
    const parent = await createParent({ title: "Chinese paper" });
    (parent as any).setCreators([
      { firstName: "Existing", lastName: "Author", creatorType: "author" },
    ]);
    await parent.saveTx();

    const result = (await applyResult({
      parent: itemRef(parent),
      runResult: {
        resultJson: {
          kind: "literature_metadata_curation",
          status: "succeeded",
          source: "test",
          metadata: {
            fields: { title: "已核实的中文论文标题" },
            creators: [],
          },
          warnings: [
            {
              code: "native_creator_names_unverified",
              message: "Native creator names could not be verified.",
            },
          ],
        },
      },
      runtime: makeApplyRuntime(),
    } as any)) as any;

    assert.isTrue(result.applied);
    assert.equal(parent.getField("title"), "已核实的中文论文标题");
    assert.deepEqual(parent.getCreatorsJSON(), [
      { firstName: "Existing", lastName: "Author", creatorType: "author" },
    ]);
  });

  it("does not apply an explicitly incomplete creator replacement list", async function () {
    const parent = await createParent({ title: "Incomplete creator record" });
    (parent as any).setCreators([
      { firstName: "Existing", lastName: "Author", creatorType: "author" },
    ]);
    await parent.saveTx();

    const result = (await applyResult({
      parent: itemRef(parent),
      runResult: {
        resultJson: {
          kind: "literature_metadata_curation",
          status: "succeeded",
          source: "test",
          metadata: {
            fields: { date: "2026" },
            creators: [
              { firstName: "Only", lastName: "One", creatorType: "author" },
            ],
            creatorCompleteness: "incomplete",
          },
        },
      },
      runtime: makeApplyRuntime(),
    } as any)) as any;

    assert.isTrue(result.applied);
    assert.deepEqual(parent.getCreatorsJSON(), [
      { firstName: "Existing", lastName: "Author", creatorType: "author" },
    ]);
    assert.include(
      result.warnings.map((entry: any) => entry.code),
      "incomplete_creator_list_not_applied",
    );
  });

  it("changes item type before applying target-specific canonical metadata", async function () {
    const parent = await createParent({
      title: "Journal record to correct",
      itemType: "journalArticle",
    });
    const result = (await applyResult({
      parent: itemRef(parent),
      runResult: {
        resultJson: {
          kind: "literature_metadata_curation",
          status: "succeeded",
          source: "test",
          metadata: {
            itemType: "thesis",
            fields: {
              title: "Correct thesis title",
              university: "Example University",
              thesisType: "PhD dissertation",
              publicationTitle: "Not valid for a thesis",
            },
            creators: [],
          },
        },
      },
      runtime: makeApplyRuntime(),
    } as any)) as any;

    assert.isTrue(result.applied);
    assert.isTrue(result.itemTypeChanged);
    assert.equal(parent.itemType, "thesis");
    assert.equal(parent.getField("university"), "Example University");
    assert.equal(parent.getField("thesisType"), "PhD dissertation");
    assert.equal(String(parent.getField("publicationTitle") || ""), "");
  });

  it("skips unsupported item types without blocking applicable metadata", async function () {
    const parent = await createParent({
      title: "Existing journal record",
      itemType: "journalArticle",
    });
    const result = (await applyResult({
      parent: itemRef(parent),
      runResult: {
        resultJson: {
          kind: "literature_metadata_curation",
          status: "succeeded",
          source: "test",
          metadata: {
            itemType: "attachment",
            fields: { title: "Corrected journal title" },
            creators: [],
          },
        },
      },
      runtime: makeApplyRuntime(),
    } as any)) as any;

    assert.isTrue(result.applied);
    assert.isFalse(result.itemTypeChanged);
    assert.equal(parent.itemType, "journalArticle");
    assert.equal(parent.getField("title"), "Corrected journal title");
  });
});
