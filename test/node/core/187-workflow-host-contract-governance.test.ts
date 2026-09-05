import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { assert } from "chai";
import ts from "typescript";
import {
  defineWorkflowHostCandidateManifest,
  inspectWorkflowHostCandidate,
  inspectWorkflowHostContractVariants,
  WORKFLOW_HOST_API_MANIFEST,
  WORKFLOW_HOST_API_VERSION,
} from "../../../src/workflows/workflowHostContract";
import {
  readHostPages,
  requireHostApi,
} from "../../../workflows_builtin/literature-workbench-package/lib/runtime.mjs";
import {
  createWorkflowAddonOwner,
  createWorkflowEnvironmentOwner,
  createWorkflowHostApi,
  createWorkflowHostLeafScope,
} from "../../../src/workflows/hostApi";
import {
  installRuntimeBridgeOverrideForTests,
  resetRuntimeBridgeOverrideForTests,
} from "../../../src/utils/runtimeBridge";
import { detectRuntimePlatform } from "../../../src/platform/runtimePlatform";

const V12_CALLABLE_PATHS = [
  "addon.getConfig",
  "environment.getInfo",
  "context.getCurrentView",
  "context.getSelectedItems",
  "navigation.openItem",
  "navigation.openNote",
  "navigation.openCollection",
  "navigation.openSelection",
  "library.listItems",
  "library.traverseItems",
  "library.withItemSnapshot",
  "library.listCollections",
  "library.listSavedSearches",
  "library.getItemDetail",
  "library.getItemNotes",
  "library.getNoteDetail",
  "library.listNotePayloads",
  "library.getNotePayload",
  "library.getItemAttachments",
  "library.listAnnotations",
  "library.exportPortableItems",
  "metadata.translateIdentifier",
  "mutations.preview",
  "mutations.execute",
  "notes.create",
  "notes.updateContent",
  "notes.remove",
  "notes.upsertPayload",
  "images.prepareForNoteEmbedding",
  "attachments.create",
  "attachments.updateMetadata",
  "attachments.replaceFile",
  "attachments.move",
  "attachments.remove",
  "bibliography.listFormats",
  "bibliography.render",
  "researchBundles.materializePapers",
  "researchBundles.importPapers",
  "statusTags.getPolicy",
  "statusTags.transition",
  "file.readText",
  "file.writeText",
  "file.readBytes",
  "file.writeBytes",
  "file.copy",
  "file.exists",
  "file.makeDirectory",
  "file.materializeWorkflowInputFile",
  "file.getTempDirectoryPath",
  "file.pickDirectory",
  "file.pickFile",
  "file.pickSaveFile",
  "file.pickFiles",
  "file.stat",
  "file.list",
  "file.move",
  "file.remove",
  "archive.measureEntries",
  "archive.writeZipAtomic",
  "archive.withExtractedZip",
  "resources.getInput",
  "resources.getInputs",
  "resources.get",
  "resources.materializeFile",
  "resources.allocateOutput",
  "resources.publishOutput",
  "resources.listOutputs",
  "clipboard.readText",
  "clipboard.writeText",
  "clipboard.hasText",
  "clipboard.clear",
  "editor.openSession",
  "notifications.toast",
  "logging.appendRuntimeLog",
  "synthesis.workflowApply.applyLiteratureDigest",
  "synthesis.workflowApply.applyTopicPlan",
  "synthesis.workflowApply.applyTopicSynthesisResult",
  "synthesis.topics.getReport",
  "synthesis.artifacts.readPaperArtifacts",
  "synthesis.tags.loadVocabulary",
  "synthesis.tags.saveVocabulary",
  "synthesis.tags.exportVocabularyForRegulator",
  "synthesis.tags.listStagedSuggestions",
  "synthesis.tags.stageSuggestions",
  "synthesis.tags.promoteStagedSuggestions",
  "synthesis.tags.discardStagedSuggestions",
  "synthesis.tags.withAuditRun",
  "synthesis.tags.acknowledgeRegulation",
] as const;

function collectCallablePaths(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).flatMap(([member, entry]) => {
    const path = prefix ? `${prefix}.${member}` : member;
    return entry === "function" ? [path] : collectCallablePaths(entry, path);
  });
}

describe("Workflow Host contract governance", function () {
  this.timeout(10_000);

  it("publishes the exact v12 manifest and metadata identity", function () {
    assert.strictEqual(WORKFLOW_HOST_API_VERSION, 12);
    assert.strictEqual(WORKFLOW_HOST_API_MANIFEST.version[1], 12);
    assert.deepEqual(WORKFLOW_HOST_API_MANIFEST.interactionMode.slice(1), [
      "interactive",
      "non_interactive",
    ]);
    assert.lengthOf(Object.keys(WORKFLOW_HOST_API_MANIFEST), 23);
    assert.lengthOf(
      Object.keys(WORKFLOW_HOST_API_MANIFEST).filter(
        (key) => key !== "version" && key !== "interactionMode",
      ),
      21,
    );
    const callablePaths = collectCallablePaths(WORKFLOW_HOST_API_MANIFEST);
    assert.lengthOf(callablePaths, 88);
    assert.sameMembers(callablePaths, V12_CALLABLE_PATHS);
  });

  it("keeps one code-native Workflow Host manifest", async function () {
    const path = "src/workflows/workflowHostContract.ts";
    const source = ts.createSourceFile(
      path,
      await readFile(resolve(path), "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
    );
    const manifests = source.statements.filter(
      (statement) =>
        ts.isVariableStatement(statement) &&
        statement.declarationList.declarations.some(
          (declaration) =>
            ts.isIdentifier(declaration.name) &&
            declaration.name.text === "WORKFLOW_HOST_API_MANIFEST",
        ),
    );
    assert.lengthOf(manifests, 1);
  });

  it("keeps interactive and non-interactive v12 projections shape-identical", async function () {
    const interactive = createWorkflowHostApi({
      interactionMode: "interactive",
    });
    const nonInteractive = createWorkflowHostApi({
      interactionMode: "non_interactive",
    });
    const result = inspectWorkflowHostContractVariants(
      WORKFLOW_HOST_API_MANIFEST,
      { interactive, "non-interactive": nonInteractive },
    );
    assert.isTrue(result.ok);
    assert.deepEqual(result.variantShapeMismatchPaths, []);
    assert.strictEqual(interactive.interactionMode, "interactive");
    assert.strictEqual(nonInteractive.interactionMode, "non_interactive");
    try {
      await nonInteractive.file.pickFile();
      assert.fail("expected non-interactive picker denial");
    } catch (error) {
      assert.strictEqual(
        (error as { code?: string }).code,
        "interaction_required",
      );
      assert.strictEqual(
        (error as { details?: { member?: string } }).details?.member,
        "file.pickFile",
      );
    }
  });

  it("keeps official built-ins on exact v12 without native escape hatches", async function () {
    const root = resolve("workflows_builtin");
    const files = (
      await readdir(root, { recursive: true, withFileTypes: true })
    )
      .filter((entry) => entry.isFile() && /\.(?:mjs|js)$/.test(entry.name))
      .map((entry) => resolve(entry.parentPath, entry.name));
    const forbidden = [
      /(?:hostApi|host)\??\.(?:items|prefs|parents|tags|collections|command|literature)\b/,
      /runtime\??\.(?:zotero|handlers|helpers)\b/,
      /\bIOUtils\b/,
      /navigator\??\.clipboard/,
      /globalThis\??\.Zotero/,
      /\bComponents\b/,
      /from\s+["'](?:node:)?fs(?:\/promises)?["']/,
      /zoteroHostCapabilityBroker/,
      /runtimePersistence/,
      /\bZotero\??\.File\b/,
      /\bresources\??\.mode\b/,
      /\brecord(?:PerformanceSpan|LeakProbeTempArtifact)ForTests\b/,
      // v12 签名是 withExtractedZip({ sourcePath }, control, callback)；
      // 禁止第一个参数不是对象字面量的 v11 形态 withExtractedZip(path, callback)。
      /withExtractedZip\((?!\s*\{)/,
      /\.synthesis\??\.(?:applyLiteratureDigestSidecar|applyTopicSynthesisResult|getTopicReport|getTopicPlanningContext|applyTopicPlan|readPaperArtifacts|loadTagVocabulary|saveTagVocabulary|exportTagVocabularyForRegulator|listStagedTagSuggestions|stageTagSuggestions|discardStagedTagSuggestions|replaceTagAuditRecords|clearTagAuditRecord)\b/,
    ];
    const findings: string[] = [];
    for (const file of files) {
      const source = await readFile(file, "utf8");
      if (forbidden.some((pattern) => pattern.test(source))) {
        findings.push(file.slice(root.length + 1));
      }
    }
    assert.deepEqual(findings.sort(), []);

    const packageRuntime = await readFile(
      resolve("workflows_builtin/literature-workbench-package/lib/runtime.mjs"),
      "utf8",
    );
    assert.match(packageRuntime, /hostApiVersion\s*!==\s*12/);
    assert.notMatch(packageRuntime, /hostApiVersion\s*[<>]=?/);
  });

  it("keeps the built-in package compatibility policy aligned with the current identity", function () {
    const cases = [
      { version: 1, accepted: false },
      { version: 2, accepted: false },
      { version: WORKFLOW_HOST_API_VERSION, accepted: true },
      { version: WORKFLOW_HOST_API_VERSION + 1, accepted: false },
    ];

    for (const testCase of cases) {
      const hostApi = {};
      const runtime = {
        hostApi,
        hostApiVersion: testCase.version,
      };
      if (testCase.accepted) {
        assert.strictEqual(requireHostApi(runtime), hostApi);
        continue;
      }
      try {
        requireHostApi(runtime);
        assert.fail(`expected version ${testCase.version} to be rejected`);
      } catch (error) {
        assert.strictEqual(
          (error as { hostApiVersion?: number }).hostApiVersion,
          testCase.version,
        );
      }
    }
  });

  it("follows empty nonterminal source pages until completion", async function () {
    const calls: Array<{ limit: number; cursor?: string }> = [];
    const notes = await readHostPages({
      operation: "workflow note read",
      readPage: async (request: { limit: number; cursor?: string }) => {
        calls.push(request);
        if (!request.cursor) {
          return {
            notes: [],
            limit: request.limit,
            nextCursor: "opaque-next",
            hasMore: true,
            returned: 0,
            total: 1,
          };
        }
        return {
          notes: [{ ref: { libraryId: 1, key: "NOTE0001" } }],
          limit: request.limit,
          nextCursor: null,
          hasMore: false,
          returned: 1,
          total: 1,
        };
      },
      getItems: (page: {
        notes: Array<{ ref: { libraryId: number; key: string } }>;
      }) => page.notes,
    });

    assert.deepEqual(calls, [
      { limit: 100 },
      { limit: 100, cursor: "opaque-next" },
    ]);
    assert.deepEqual(notes, [{ ref: { libraryId: 1, key: "NOTE0001" } }]);
  });

  it("does not fabricate a complete result after a later page fails", async function () {
    let calls = 0;
    let failure: unknown;
    try {
      await readHostPages({
        operation: "workflow attachment read",
        readPage: async (request: { limit: number; cursor?: string }) => {
          calls += 1;
          if (!request.cursor) {
            return {
              attachments: [{ ref: { libraryId: 1, key: "ATT0001" } }],
              limit: request.limit,
              nextCursor: "opaque-next",
              hasMore: true,
              returned: 1,
              total: 2,
            };
          }
          throw new Error("source page failed");
        },
        getItems: (page: { attachments: unknown[] }) => page.attachments,
      });
    } catch (error) {
      failure = error;
    }

    assert.strictEqual(calls, 2);
    assert.instanceOf(failure, Error);
    assert.strictEqual((failure as Error).message, "source page failed");
  });

  it("keeps explicit versions in current contract documents aligned", async function () {
    const paths = [
      "doc/components/zotero-host-capability-broker-ssot.md",
      "openspec/specs/zotero-host-capability-broker/spec.md",
    ];

    for (const path of paths) {
      const text = await readFile(resolve(path), "utf8");
      const declarations = [...text.matchAll(/Workflow Host API v(\d+)/g)].map(
        (match) => Number(match[1]),
      );
      assert.isNotEmpty(declarations, path);
      assert.deepEqual(
        [...new Set(declarations)],
        [WORKFLOW_HOST_API_VERSION],
        path,
      );
    }
  });

  it("inspects candidate contracts recursively and bidirectionally", function () {
    const manifest = defineWorkflowHostCandidateManifest({
      version: "value",
      interactionMode: "value",
      library: {
        getItemDetail: "function",
        notes: {
          getNoteDetail: "function",
        },
      },
    });
    const exactCandidate = {
      version: 12,
      interactionMode: "interactive",
      library: {
        getItemDetail() {},
        notes: {
          getNoteDetail() {},
        },
      },
    };

    assert.deepEqual(inspectWorkflowHostCandidate(exactCandidate, manifest), {
      ok: true,
      missingPaths: [],
      unexpectedPaths: [],
      nonFunctionPaths: [],
      nonObjectPaths: [],
      invalidValuePaths: [],
    });

    const drifted = {
      ...exactCandidate,
      library: {
        getItemDetail: null,
        notes: {},
        internalSearch() {},
      },
    };
    assert.deepEqual(inspectWorkflowHostCandidate(drifted, manifest), {
      ok: false,
      missingPaths: ["library.notes.getNoteDetail"],
      unexpectedPaths: ["library.internalSearch"],
      nonFunctionPaths: ["library.getItemDetail"],
      nonObjectPaths: [],
      invalidValuePaths: [],
    });
  });

  it("rejects drifted Workflow Host metadata values", function () {
    const result = inspectWorkflowHostCandidate(
      {
        ...Object.fromEntries(
          Object.keys(WORKFLOW_HOST_API_MANIFEST).map((key) => [key, null]),
        ),
        version: 11,
        interactionMode: "batch",
      },
      defineWorkflowHostCandidateManifest({
        version: ["value", 12],
        interactionMode: ["oneOf", "interactive", "non_interactive"],
      }),
    );
    assert.sameMembers(result.invalidValuePaths, [
      "interactionMode",
      "version",
    ]);
  });

  it("requires interactive and non-interactive candidates to have one exact shape", function () {
    const manifest = defineWorkflowHostCandidateManifest({
      version: "value",
      file: {
        readText: "function",
        pickFile: "function",
      },
    });
    const result = inspectWorkflowHostContractVariants(manifest, {
      interactive: {
        version: 12,
        file: { readText() {}, pickFile() {} },
      },
      "non-interactive": {
        version: 12,
        file: { readText() {}, availability: false },
      },
    });

    assert.isFalse(result.ok);
    assert.deepEqual(result.variants.interactive.missingPaths, []);
    assert.deepEqual(result.variants["non-interactive"].missingPaths, [
      "file.pickFile",
    ]);
    assert.deepEqual(result.variants["non-interactive"].unexpectedPaths, [
      "file.availability",
    ]);
    assert.deepEqual(result.variantShapeMismatchPaths, [
      "file.availability",
      "file.pickFile",
    ]);
  });

  it("rejects implicit Broker widening in a candidate projection", function () {
    const manifest = defineWorkflowHostCandidateManifest({
      library: {
        getItemDetail: "function",
      },
    });
    const widenedBroker = {
      library: {
        getItemDetail() {},
        internalMaintenance() {},
      },
    };
    const intentionallyWidenedProjection = {
      library: { ...widenedBroker.library },
    };

    assert.deepEqual(
      inspectWorkflowHostCandidate(intentionallyWidenedProjection, manifest)
        .unexpectedPaths,
      ["library.internalMaintenance"],
    );
  });

  it("keeps shared public aliases uniquely declared and resolvable", async function () {
    this.timeout(30_000);
    const paths = [
      "src/workflows/types.ts",
      "src/workflows/workflowHostErrorContract.ts",
      "src/modules/zoteroHostCapabilityBroker.ts",
    ];
    const canonicalNames = new Set([
      "JsonPrimitive",
      "JsonValue",
      "JsonObject",
      "PortableItemRef",
      "PortableCollectionRef",
      "WorkflowCallControl",
      "WorkflowHostErrorCode",
      "WorkflowHostErrorData",
      "AddonIdentityDto",
      "WorkflowEnvironmentInfo",
      "PreparedNoteImageRef",
      "PrepareNoteImageRequestDto",
      "PreparedNoteImageDto",
      "BibliographyFormatRef",
      "BibliographyFormatDto",
      "BibliographyRenderRequestDto",
      "BibliographyRenderResultDto",
      "WorkflowToastRequestDto",
      "WorkflowRuntimeLogRequestDto",
    ]);
    const exactProperties = new Map<string, string[]>([
      ["AddonIdentityDto", ["addonName", "addonRef", "addonVersion"]],
      ["WorkflowEnvironmentInfo", ["locale", "platform", "zoteroVersion"]],
      ["PreparedNoteImageRef", ["id", "kind"]],
      ["PrepareNoteImageRequestDto", ["options", "source"]],
      [
        "PreparedNoteImageDto",
        ["bytes", "height", "mimeType", "ref", "sha256", "width"],
      ],
      ["BibliographyFormatRef", ["id"]],
      [
        "BibliographyFormatDto",
        [
          "availability",
          "contentType",
          "fileExtension",
          "label",
          "optionsSchema",
          "ref",
        ],
      ],
      [
        "BibliographyRenderRequestDto",
        ["formatOptions", "formatPreference", "itemRefs"],
      ],
      [
        "BibliographyRenderResultDto",
        ["content", "fallbackUsed", "issues", "requestedFormats", "usedFormat"],
      ],
      ["WorkflowToastRequestDto", ["text", "type"]],
      [
        "WorkflowRuntimeLogRequestDto",
        ["details", "level", "message", "operation", "phase", "stage"],
      ],
    ]);
    const declarations = new Map<string, string[]>();
    const declarationProperties = new Map<string, string[]>();
    for (const path of paths) {
      const text = await readFile(resolve(path), "utf8");
      const source = ts.createSourceFile(
        path,
        text,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      );
      for (const statement of source.statements) {
        if (
          (ts.isTypeAliasDeclaration(statement) ||
            ts.isInterfaceDeclaration(statement)) &&
          canonicalNames.has(statement.name.text)
        ) {
          const entries = declarations.get(statement.name.text) || [];
          entries.push(path);
          declarations.set(statement.name.text, entries);
          const members = ts.isInterfaceDeclaration(statement)
            ? statement.members
            : ts.isTypeLiteralNode(statement.type)
              ? statement.type.members
              : [];
          const properties = members
            .filter(ts.isPropertySignature)
            .map((member) =>
              member.name && ts.isIdentifier(member.name)
                ? member.name.text
                : member.name.getText(source),
            )
            .sort();
          declarationProperties.set(statement.name.text, properties);
        }
      }
    }

    for (const name of canonicalNames) {
      assert.lengthOf(declarations.get(name) || [], 1, name);
    }
    for (const [name, properties] of exactProperties) {
      assert.deepEqual(declarationProperties.get(name), properties, name);
    }

    const configPath = resolve("tsconfig.json");
    const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      resolve("."),
    );
    const program = ts.createProgram(parsed.fileNames, parsed.options);
    const relevant = new Set(paths.map((path) => resolve(path)));
    const unresolved = ts
      .getPreEmitDiagnostics(program)
      .filter(
        (diagnostic) =>
          diagnostic.file &&
          relevant.has(resolve(diagnostic.file.fileName)) &&
          [2300, 2304, 2307, 2456].includes(diagnostic.code),
      );
    assert.deepEqual(
      unresolved.map((diagnostic) => diagnostic.code),
      [],
    );
  });

  it("keeps Workflow Host composition member-level and explicit", async function () {
    const source = await readFile(resolve("src/workflows/hostApi.ts"), "utf8");
    const forbidden = [
      /\.\.\.\s*zoteroBroker\b/,
      /\b(?:context|library|metadata|mutations)\s*:\s*zoteroBroker\.(?:context|library|metadata|mutations)\b/,
      /new\s+Proxy\s*\(/,
      /capabilityCatalog/,
    ];

    for (const pattern of forbidden) {
      assert.notMatch(source, pattern);
    }
  });

  it("keeps addon identity closed and reads environment facts per invocation", function () {
    const addon = createWorkflowAddonOwner();
    const environment = createWorkflowEnvironmentOwner();
    try {
      installRuntimeBridgeOverrideForTests({
        addon: {
          data: {
            config: {
              addonName: "Test Addon",
              addonRef: "test-addon",
              addonVersion: "1.2.3",
              prefsPrefix: "extensions.test",
            },
          },
        },
        zotero: {
          ...Zotero,
          version: "7.0.0",
          isWin: true,
          locale: "zh-cn",
        } as typeof Zotero,
      });
      assert.deepEqual(addon.getConfig(), {
        addonName: "Test Addon",
        addonRef: "test-addon",
        addonVersion: "1.2.3",
      });
      assert.deepEqual(environment.getInfo(), {
        zoteroVersion: "7.0.0",
        platform: "win32",
        locale: "zh-CN",
      });

      const secondZotero = {
        ...Zotero,
        version: "9.1.0",
        isWin: false,
        isMac: true,
        locale: "en-gb",
      } as typeof Zotero;
      installRuntimeBridgeOverrideForTests({ zotero: secondZotero });
      const expectedSecondPlatform = secondZotero.isWin
        ? detectRuntimePlatform("win32")
        : secondZotero.isMac
          ? detectRuntimePlatform("darwin")
          : secondZotero.isLinux
            ? detectRuntimePlatform("linux")
            : detectRuntimePlatform("unknown");
      assert.deepEqual(environment.getInfo(), {
        zoteroVersion: "9.1.0",
        platform: expectedSecondPlatform,
        locale: "en-GB",
      });
      assert.deepEqual(Object.keys(environment.getInfo()).sort(), [
        "locale",
        "platform",
        "zoteroVersion",
      ]);
      assert.strictEqual(WORKFLOW_HOST_API_VERSION, 12);
    } finally {
      resetRuntimeBridgeOverrideForTests();
    }
  });

  it("composes the eight v12 leaf owners explicitly", function () {
    const interactive = createWorkflowHostLeafScope({
      interactionMode: "interactive",
      runScopeId: "leaf-interactive",
      logBinding: { workflowId: "workflow-a", packageId: "package-a" },
    });
    const nonInteractive = createWorkflowHostLeafScope({
      interactionMode: "non_interactive",
      runScopeId: "leaf-non-interactive",
      logBinding: { workflowId: "workflow-a", packageId: "package-a" },
    });
    try {
      const expected = [
        "addon",
        "bibliography",
        "clipboard",
        "editor",
        "environment",
        "images",
        "logging",
        "notifications",
      ];
      assert.deepEqual(Object.keys(interactive.owners).sort(), expected);
      assert.deepEqual(Object.keys(nonInteractive.owners).sort(), expected);
      for (const key of expected) {
        assert.deepEqual(
          Object.keys(
            nonInteractive.owners[key as keyof typeof nonInteractive.owners],
          ).sort(),
          Object.keys(
            interactive.owners[key as keyof typeof interactive.owners],
          ).sort(),
          key,
        );
      }
      assert.strictEqual(WORKFLOW_HOST_API_VERSION, 12);
    } finally {
      interactive.dispose();
      nonInteractive.dispose();
    }
  });
});
