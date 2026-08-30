import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { assert } from "chai";
import ts from "typescript";
import {
  defineWorkflowHostCandidateManifest,
  inspectWorkflowHostCandidate,
  inspectWorkflowHostContractVariants,
  WORKFLOW_HOST_API_VERSION,
} from "../../../src/workflows/workflowHostContract";
import { requireHostApi } from "../../../workflows_builtin/literature-workbench-package/lib/runtime.mjs";
import {
  createWorkflowAddonOwner,
  createWorkflowEnvironmentOwner,
  createWorkflowHostLeafScope,
} from "../../../src/workflows/hostApi";
import {
  installRuntimeBridgeOverrideForTests,
  resetRuntimeBridgeOverrideForTests,
} from "../../../src/utils/runtimeBridge";

describe("Workflow Host contract governance", function () {
  this.timeout(10_000);

  it("keeps the built-in package compatibility policy aligned with the current identity", function () {
    const cases = [
      { version: 1, accepted: false },
      { version: 2, accepted: true },
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
    });
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

      installRuntimeBridgeOverrideForTests({
        zotero: {
          ...Zotero,
          version: "9.1.0",
          isMac: true,
          locale: "en-gb",
        } as typeof Zotero,
      });
      assert.deepEqual(environment.getInfo(), {
        zoteroVersion: "9.1.0",
        platform: "darwin",
        locale: "en-GB",
      });
      assert.deepEqual(Object.keys(environment.getInfo()).sort(), [
        "locale",
        "platform",
        "zoteroVersion",
      ]);
      assert.strictEqual(WORKFLOW_HOST_API_VERSION, 11);
    } finally {
      resetRuntimeBridgeOverrideForTests();
    }
  });

  it("composes the eight staged leaf owners explicitly without activating v12", function () {
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
      assert.strictEqual(WORKFLOW_HOST_API_VERSION, 11);
    } finally {
      interactive.dispose();
      nonInteractive.dispose();
    }
  });
});
