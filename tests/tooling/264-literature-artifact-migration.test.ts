import { assert } from "chai";
import {
  LITERATURE_ARTIFACT_MIGRATION_DEFINITION_VERSION,
  LITERATURE_ARTIFACT_MIGRATION_ID,
  createLiteratureArtifactMigrationHostFromZoteroBroker,
  createLiteratureArtifactMigrationService,
  resetLiteratureArtifactMigrationRuntimeForTests,
  type MigrationPortableItemRef,
} from "../../src/modules/literatureArtifactMigration";
import {
  convertLegacyArtifactSet,
  resolveLiteratureArtifactMigrationConversion,
  type LegacyArtifactSetInput,
} from "../../src/modules/literatureArtifactMigration/converter";
import { hashSynthesisContractCanonicalJson } from "../../packages/synthesis-contracts/src/index";
import type {
  LiteratureArtifactApplyAnalysisResultDto,
  MutationExecutionResult,
} from "../../src/workflows/types";
import { generateSourceReferenceId } from "../../packages/synthesis-contracts/src/sourceReferenceArtifact";
import {
  getLiteratureArtifactMigrationRun,
  listLiteratureArtifactMigrationRuns,
  listLiteratureArtifactMigrationSets,
  exportPluginStateStoreRowsForTests,
  resetPluginStateStoreForTests,
} from "../../src/modules/pluginStateStore";
import { createFailClosedZoteroHostCapabilityBroker } from "../helpers/zoteroHostCapabilityBrokerHarness";
import {
  buildDashboardSnapshot,
  createDefaultRuntimeLogFilters,
  type DashboardState,
} from "../../src/modules/dashboard/dashboardSnapshot";

describe("literature artifact migration", function () {
  beforeEach(function () {
    resetPluginStateStoreForTests();
    resetLiteratureArtifactMigrationRuntimeForTests();
  });

  afterEach(function () {
    resetPluginStateStoreForTests();
    resetLiteratureArtifactMigrationRuntimeForTests();
  });

  it("projects the current migration version and personal library", async function () {
    const state: DashboardState = {
      backends: [],
      selectedTabKey: "migrations",
      selectedLiteratureMigrationRunId: "",
      literatureMigrationCandidateQuery: {
        search: "",
        classification: "",
        reasonCode: "",
        disposition: "",
      },
      selectedBackendSubviewById: new Map(),
      selectedLogTaskByBackendId: new Map(),
      selectedLogEntryByBackendId: new Map(),
      selectedWorkflowOptionsWorkflowId: "",
      workflowSettingsDraftById: new Map(),
      workflowSettingsSaveStateById: new Map(),
      workflowSettingsSaveErrorById: new Map(),
      workflowSettingsSaveTimerById: new Map(),
      runtimeLogFilters: createDefaultRuntimeLogFilters(),
      runtimeLogSelectedIdSet: new Set(),
      homeWorkflowDocWorkflowId: "",
      selectedProductId: "",
      selectedProductAssetId: "",
      selectedProductSection: "products",
      selectedFeedbackProductId: "",
      feedbackSkillFilter: "",
      selectedFeedbackProductIds: new Set(),
      productExportInProgress: false,
      homeWorkflowDocCacheByWorkflowId: new Map(),
    };

    const snapshot = await buildDashboardSnapshot({
      state,
      backends: [],
      history: [],
      active: [],
    });

    assert.equal(
      snapshot.literatureArtifactMigrationView?.definitionVersion,
      LITERATURE_ARTIFACT_MIGRATION_DEFINITION_VERSION,
    );
    assert.equal(
      snapshot.literatureArtifactMigrationView?.libraryId,
      Zotero.Libraries.userLibraryID,
    );
  });

  it("uses deterministic content evidence and never treats ref_number as identity", function () {
    const input: LegacyArtifactSetInput = {
      libraryId: 1,
      parentRef: { libraryId: 1, key: "PARENT" },
      references: [
        {
          legacyId: "ref-1",
          refNumber: 1,
          title: "A Study",
          year: "2024",
          authors: ["Ada Lovelace"],
          rawCitation: "Lovelace (2024)",
        },
      ],
      citation: {
        items: [
          {
            title: "A Study",
            year: 2024,
            authors: ["Ada Lovelace"],
            mentions: [{ rawCitation: "Lovelace (2024)" }],
          },
        ],
      },
    };
    const plan = convertLegacyArtifactSet(input, {
      idFactory: generateSourceReferenceId,
    });
    assert.equal(plan.classification, "ready");
    assert.equal(plan.verifiedCount, 1);
    assert.equal(plan.droppedCount, 0);
    assert.notEqual(plan.references.references[0]?.sourceReferenceId, "ref-1");
    assert.match(
      plan.references.references[0]?.sourceReferenceId || "",
      /^[0-9a-f-]{36}$/,
    );
  });

  for (const field of ["url", "ISBN", "ISSN", "citekey"]) {
    it(`does not link different papers by shared ${field}`, function () {
      const plan = convertLegacyArtifactSet({
        libraryId: 1,
        parentRef: { libraryId: 1, key: "PARENT" },
        references: [
          {
            sourceReferenceId: "REF-A",
            title: "Alpha",
            year: 2020,
            authors: ["Alice"],
            [field]: "shared-value",
          },
        ],
        citation: {
          items: [
            {
              title: "Beta",
              year: 2021,
              authors: ["Bob"],
              [field]: "shared-value",
              mentions: [{ rawCitation: "Beta (2021)" }],
            },
          ],
        },
      });
      assert.equal(plan.classification, "review_required");
      assert.include(plan.reasonCodes, "unresolved_linkage");
      assert.isEmpty(plan.citation?.items);
    });
  }

  it("blocks explicit identity whose supplied bibliographic facts conflict", function () {
    const plan = convertLegacyArtifactSet({
      libraryId: 1,
      parentRef: { libraryId: 1, key: "PARENT" },
      references: [
        {
          sourceReferenceId: "REF-A",
          title: "Alpha",
          year: 2020,
          authors: ["Alice"],
          DOI: "10.1234/alpha",
        },
      ],
      citation: {
        items: [
          {
            sourceReferenceId: "REF-A",
            title: "Beta",
            year: 2021,
            authors: ["Bob"],
            DOI: "10.1234/beta",
            mentions: [{ rawCitation: "Beta" }],
          },
        ],
      },
    });
    assert.equal(plan.classification, "blocked");
    assert.include(plan.reasonCodes, "conflicting_evidence");
  });

  it("preserves an explicit identity when no contradicting facts are supplied", function () {
    const plan = convertLegacyArtifactSet({
      libraryId: 1,
      parentRef: { libraryId: 1, key: "PARENT" },
      references: [
        {
          sourceReferenceId: "REF-A",
          title: "Alpha",
          year: 2020,
          authors: ["Alice"],
        },
      ],
      citation: {
        items: [
          { sourceReferenceId: "REF-A", mentions: [{ rawCitation: "Alpha" }] },
        ],
      },
    });
    assert.equal(plan.classification, "ready");
    assert.equal(plan.citation?.items[0]?.sourceReferenceId, "REF-A");
  });

  for (const evidence of [
    { DOI: "https://doi.org/10.1234/ALPHA" },
    { raw: "Alpha (2020)" },
  ]) {
    it(`links citation-only ${Object.keys(evidence)[0]} evidence without requiring a full snapshot`, function () {
      const plan = convertLegacyArtifactSet({
        libraryId: 1,
        parentRef: { libraryId: 1, key: "PARENT" },
        references: [
          {
            sourceReferenceId: "REF-A",
            title: "Alpha",
            year: 2020,
            authors: ["Alice"],
            DOI: "10.1234/alpha",
            raw: "Alpha (2020)",
          },
        ],
        citation: {
          items: [{ ...evidence, mentions: [{ rawCitation: "Alpha" }] }],
        },
      });
      assert.equal(plan.classification, "ready");
      assert.equal(plan.citation?.items[0]?.sourceReferenceId, "REF-A");
    });
  }

  it("blocks a conflicting snapshot with the same raw reference instead of recovering a duplicate", function () {
    const plan = convertLegacyArtifactSet({
      libraryId: 1,
      parentRef: { libraryId: 1, key: "PARENT" },
      references: [
        {
          title: "Alpha",
          year: 2020,
          authors: ["Alice"],
          raw: "Shared citation",
        },
      ],
      citation: {
        snapshots: [
          {
            title: "Beta",
            year: 2021,
            authors: ["Bob"],
            raw: "Shared citation",
          },
        ],
      },
    });
    assert.equal(plan.classification, "blocked");
    assert.include(plan.reasonCodes, "conflicting_evidence");
    assert.equal(plan.recoveredCount, 0);
  });

  it("recovers a sufficient citation snapshot with a fresh id and review evidence", function () {
    const input: LegacyArtifactSetInput = {
      libraryId: 1,
      parentRef: { libraryId: 1, key: "PARENT" },
      legacyPayload: {
        items: [
          {
            id: "ref-1",
            raw: "Lovelace, A. (2024). A Study.",
            confidence: 0.8,
            title: "A Study",
            year: "2024",
            author: ["Ada Lovelace"],
          },
        ],
      },
      citation: {
        mentions: [{ rawCitation: "Lovelace (2024)" }],
        snapshots: [
          {
            rawCitation: "Hopper (2023)",
            title: "Another Study",
            year: 2024,
            authors: ["Grace Hopper"],
          },
        ],
      },
    };
    const plan = convertLegacyArtifactSet(input, {
      idFactory: generateSourceReferenceId,
    });
    assert.equal(plan.classification, "review_required");
    assert.equal(plan.recoveredCount, 1);
    assert.include(plan.reasonCodes, "citation_snapshot_recovery");
    assert.equal(plan.references.references[1]?.bibliography.year, 2024);
  });

  it("blocks citation-only library input and preserves no dropped conversion", function () {
    const input: LegacyArtifactSetInput = {
      libraryId: 1,
      parentRef: { libraryId: 1, key: "PARENT" },
      references: [],
      citation: { mentions: [{ rawCitation: "unknown" }] },
    };
    const plan = convertLegacyArtifactSet(input);
    assert.equal(plan.classification, "blocked");
    assert.include(plan.reasonCodes, "citation_only");
    assert.equal(convertLegacyArtifactSet(input).droppedCount, 0);
  });

  it("allows offline Citation recovery only when canonical References already exist", function () {
    const parentRef = { libraryId: 1, key: "PARENT" };
    const references = convertLegacyArtifactSet({
      libraryId: 1,
      parentRef,
      references: [{ title: "A Study", year: 2024, authors: ["Ada Lovelace"] }],
    }).references.references;
    const plan = convertLegacyArtifactSet(
      {
        libraryId: 1,
        parentRef,
        citation: {
          items: [
            {
              title: "A Study",
              year: 2024,
              authors: ["Ada Lovelace"],
              mentions: [{ rawCitation: "Lovelace (2024)" }],
            },
          ],
        },
        existingReferences: references,
      },
      { allowCitationOnlyWithExistingReferences: true },
    );
    assert.equal(plan.classification, "ready");
    assert.notInclude(plan.reasonCodes, "citation_only");
    assert.equal(
      plan.citation?.items[0]?.sourceReferenceId,
      references[0]?.sourceReferenceId,
    );
  });

  it("previews legacy file payloads without consuming the import files", function () {
    const referencesFile = {
      payloadType: "references-json",
      value: {
        items: [
          {
            id: "legacy-reference-id",
            title: "A Study",
            year: 2024,
            authors: ["Ada Lovelace"],
          },
        ],
      },
    };
    const citationFile = {
      payloadType: "citation-analysis-json",
      value: {
        items: [
          {
            title: "A Study",
            year: 2024,
            authors: ["Ada Lovelace"],
            mentions: [{ rawCitation: "Lovelace (2024)" }],
          },
        ],
      },
    };
    const originalFiles = structuredClone([referencesFile, citationFile]);
    const input: LegacyArtifactSetInput = {
      libraryId: 1,
      parentRef: { libraryId: 1, key: "PARENT" },
      filePayloads: [referencesFile, citationFile],
    };
    const preview = convertLegacyArtifactSet(input, {
      idFactory: generateSourceReferenceId,
    });
    assert.equal(preview.classification, "ready");
    assert.equal(preview.references.schema, "source_reference_artifact.v1");
    assert.equal(preview.citation?.schema, "citation_analysis_artifact.v1");
    assert.deepEqual([referencesFile, citationFile], originalFiles);
    assert.notEqual(
      preview.references.references[0]?.sourceReferenceId,
      "legacy-reference-id",
    );
  });

  it("keeps same-valued payloads from separate notes in the duplicate gate", function () {
    const references = {
      items: [
        {
          title: "A Study",
          year: 2024,
          authors: ["Ada Lovelace"],
        },
      ],
    };
    const firstNote = { libraryId: 1, key: "LEGACY-1" };
    const secondNote = { libraryId: 1, key: "LEGACY-2" };
    const crossNote = convertLegacyArtifactSet({
      libraryId: 1,
      parentRef: { libraryId: 1, key: "PARENT" },
      filePayloads: [
        {
          payloadType: "references-json",
          value: references,
          sourceRef: firstNote,
        },
        {
          payloadType: "references-json",
          value: references,
          sourceRef: secondNote,
        },
      ],
      legacyNotes: [
        {
          ref: firstNote,
          html: "",
          revision: "one",
          payloads: [{ payloadType: "references-json", value: references }],
        },
        {
          ref: secondNote,
          html: "",
          revision: "two",
          payloads: [{ payloadType: "references-json", value: references }],
        },
      ],
    });
    assert.equal(crossNote.originalReferenceCount, 2);
    assert.include(crossNote.reasonCodes, "duplicate_reference");
    assert.equal(crossNote.classification, "blocked");

    const sameNote = convertLegacyArtifactSet({
      libraryId: 1,
      parentRef: { libraryId: 1, key: "PARENT" },
      filePayloads: [
        {
          payloadType: "references-json",
          value: references,
          sourceRef: firstNote,
        },
        {
          payloadType: "references-json",
          value: references,
          sourceRef: firstNote,
        },
      ],
      legacyNotes: [
        {
          ref: firstNote,
          html: "",
          revision: "one",
          payloads: [{ payloadType: "references-json", value: references }],
        },
      ],
    });
    assert.equal(sameNote.originalReferenceCount, 1);
    assert.notInclude(sameNote.reasonCodes, "duplicate_reference");
  });

  it("merges transitive duplicate reference evidence into one retained source", function () {
    const conversion = convertLegacyArtifactSet({
      libraryId: 1,
      parentRef: { libraryId: 1, key: "PARENT" },
      references: [
        {
          title: "Alpha",
          year: 2020,
          authors: ["Ada"],
          doi: "10.1000/shared",
        },
        {
          title: "Bridge",
          year: 2021,
          authors: ["Bob"],
          doi: "10.1000/shared",
        },
        { title: "Bridge", year: 2021, authors: ["Bob"] },
      ],
    });

    const resolved = resolveLiteratureArtifactMigrationConversion(conversion, [
      { reasonCode: "duplicate_reference", kind: "merge_duplicates" },
    ]);

    assert.lengthOf(resolved.references.references, 1);
  });

  it("preserves known non-target managed payload kinds", function () {
    const references = {
      items: [
        {
          title: "A Study",
          year: 2024,
          authors: ["Ada Lovelace"],
        },
      ],
    };
    const plan = convertLegacyArtifactSet({
      libraryId: 1,
      parentRef: { libraryId: 1, key: "PARENT" },
      filePayloads: [
        { payloadType: "references-json", value: references },
        { payloadType: "digest-markdown", value: "digest" },
        {
          payloadType: "literature-matching-metadata-json",
          value: { matchedAt: "2026-09-11T00:00:00.000Z" },
        },
      ],
      legacyNotes: [
        {
          ref: { libraryId: 1, key: "LEGACY-NOTE" },
          html: '<span data-zs-payload="digest-markdown">digest</span>',
          revision: "one",
          payloads: [
            { payloadType: "references-json", value: references },
            { payloadType: "digest-markdown", value: "digest" },
            {
              payloadType: "literature-matching-metadata-json",
              value: { matchedAt: "2026-09-11T00:00:00.000Z" },
            },
          ],
        },
      ],
    });
    assert.equal(plan.classification, "ready");
    assert.notInclude(plan.reasonCodes, "unsupported_input");
    assert.notInclude(
      plan.diagnostics,
      "unsupported legacy payload type: digest-markdown",
    );
    assert.notInclude(
      plan.diagnostics,
      "unsupported legacy payload type: literature-matching-metadata-json",
    );
  });

  it("blocks an unknown managed payload kind", function () {
    const plan = convertLegacyArtifactSet({
      libraryId: 1,
      parentRef: { libraryId: 1, key: "PARENT" },
      filePayloads: [
        {
          payloadType: "references-json",
          value: {
            items: [
              { title: "A Study", year: 2024, authors: ["Ada Lovelace"] },
            ],
          },
        },
        { payloadType: "future-managed-json", value: { future: true } },
      ],
    });

    assert.equal(plan.classification, "blocked");
    assert.include(plan.reasonCodes, "unsupported_input");
    assert.include(
      plan.diagnostics,
      "unsupported legacy payload type: future-managed-json",
    );
  });

  it("persists only a basis hash and never stores raw legacy evidence", async function () {
    const secret = '<div data-zs-payload="references-json">private HTML</div>';
    const noteRef = { libraryId: 1, key: "LEGACY-NOTE" };
    const references = {
      items: [
        {
          title: "A Study",
          year: 2024,
          authors: ["Ada Lovelace"],
        },
      ],
    };
    const service = createLiteratureArtifactMigrationService({
      host: {
        scanLibrary: async () => [
          {
            libraryId: 1,
            parentRef: { libraryId: 1, key: "PARENT" },
            noteContents: [secret],
            filePayloads: [
              {
                payloadType: "references-json",
                value: references,
                sourceRef: noteRef,
              },
            ],
            legacyNotes: [
              {
                ref: noteRef,
                html: secret,
                revision: "revision-1",
                payloads: [
                  { payloadType: "references-json", value: references },
                ],
              },
            ],
          },
        ],
        applySet: async () => ({ outcome: "applied" as const }),
      },
      idFactory: () => "source-id",
    });
    const preview = await service.scan({ libraryId: 1 });
    assert.isTrue(preview.ok);
    const sets = listLiteratureArtifactMigrationSets({
      runId: preview.ok ? preview.runId : "",
      limit: 10,
    });
    assert.lengthOf(sets, 1);
    assert.match(sets[0]?.basisHash || "", /^[0-9a-f]+$/);
    assert.notProperty(sets[0], "basis");
    assert.notInclude(JSON.stringify(sets), secret);
    const durableRows = exportPluginStateStoreRowsForTests();
    assert.notInclude(
      JSON.stringify(durableRows.literatureMigrationSets),
      secret,
    );
    assert.notInclude(
      JSON.stringify(durableRows.literatureMigrationSets),
      "private HTML",
    );
  });

  it("retains canonical same-kind notes and blocks mixed legacy candidates", async function () {
    const parentRef = { libraryId: 1, key: "PARENT" };
    const canonicalReferences = convertLegacyArtifactSet(
      {
        libraryId: 1,
        parentRef,
        references: [
          { title: "Canonical Study", year: 2024, authors: ["Ada"] },
        ],
      },
      { idFactory: () => "canonical-id" },
    ).references;
    const noteRefs = [
      { libraryId: 1, key: "LEGACY-NOTE" },
      { libraryId: 1, key: "CANONICAL-NOTE" },
    ];
    const broker = createFailClosedZoteroHostCapabilityBroker({
      library: {
        listItems: async () => ({
          items: [{ kind: "regular", ref: parentRef }],
          hasMore: false,
          nextCursor: null,
        }),
        getItemNotes: async () => ({
          notes: noteRefs.map((ref) => ({ ref })),
          hasMore: false,
          nextCursor: null,
        }),
      },
    });
    const localControl = {
      readLegacyForMigration: async (ref: { key: string }) =>
        ref.key === "CANONICAL-NOTE"
          ? {
              kind: "canonical_managed" as const,
              html: '<div data-zs-note-kind="references"></div>',
              revision: "canonical-1",
              payloads: [
                {
                  payloadType: "references-json",
                  value: canonicalReferences,
                },
              ],
            }
          : {
              kind: "legacy" as const,
              html: '<span data-zs-payload="references-json"></span>',
              revision: "legacy-1",
              payloads: [
                {
                  payloadType: "references-json",
                  value: {
                    items: [
                      {
                        title: "Legacy Study",
                        year: 2024,
                        authors: ["Ada"],
                      },
                    ],
                  },
                },
              ],
            },
      applyParentSet: async () => {
        throw new Error("not used by scan");
      },
    } as unknown as NonNullable<
      Parameters<
        typeof createLiteratureArtifactMigrationHostFromZoteroBroker
      >[1]
    >["localControl"];
    const host = createLiteratureArtifactMigrationHostFromZoteroBroker(broker, {
      localControl,
    });

    const [input] = await host.scanLibrary({ libraryId: 1 });
    assert.isOk(input);
    assert.lengthOf(input?.legacyNotes || [], 1);
    assert.lengthOf(input?.canonicalNotes || [], 1);
    const conversion = convertLegacyArtifactSet(input!, {
      idFactory: () => "legacy-id",
    });
    assert.equal(conversion.classification, "blocked");
    assert.include(conversion.reasonCodes, "canonical_conflict");
  });

  it("redacts raw legacy payload read errors from migration diagnostics", async function () {
    const parentRef = { libraryId: 1, key: "PARENT" };
    const noteRef = { libraryId: 1, key: "LEGACY-NOTE" };
    const secret = "/private/library/payload.bin";
    const broker = createFailClosedZoteroHostCapabilityBroker({
      library: {
        listItems: async () => ({
          items: [{ kind: "regular", ref: parentRef }],
          hasMore: false,
          nextCursor: null,
        }),
        getItemNotes: async () => ({
          notes: [{ ref: noteRef }],
          hasMore: false,
          nextCursor: null,
        }),
      },
    });
    const localControl = {
      readLegacyForMigration: async () => ({
        kind: "legacy" as const,
        html: '<span data-zs-payload="references-json"></span>',
        revision: "legacy-1",
        payloads: [{ payloadType: "references-json", error: secret }],
      }),
      applyParentSet: async () => {
        throw new Error("not used by scan");
      },
    } as unknown as NonNullable<
      Parameters<
        typeof createLiteratureArtifactMigrationHostFromZoteroBroker
      >[1]
    >["localControl"];
    const host = createLiteratureArtifactMigrationHostFromZoteroBroker(broker, {
      localControl,
    });
    const [input] = await host.scanLibrary({ libraryId: 1 });
    assert.isOk(input);
    assert.deepEqual(input?.readErrors, [
      "references-json: payload_read_failed",
    ]);
    assert.notInclude(JSON.stringify(input), secret);
  });

  it("stops the production scan before reading the next parent", async function () {
    const parents = [
      { libraryId: 1, key: "PARENT-1" },
      { libraryId: 1, key: "PARENT-2" },
    ];
    let notePageReads = 0;
    const broker = createFailClosedZoteroHostCapabilityBroker({
      library: {
        listItems: async () => ({
          items: parents.map((ref) => ({ kind: "regular" as const, ref })),
          hasMore: false,
          nextCursor: null,
          totalScanned: 2,
        }),
        getItemNotes: async () => {
          notePageReads += 1;
          return { notes: [], hasMore: false, nextCursor: null };
        },
      },
    });
    const host = createLiteratureArtifactMigrationHostFromZoteroBroker(broker, {
      localControl: {
        readLegacyForMigration: async () => ({ kind: "unmanaged" as const }),
        applyParentSet: async () => {
          throw new Error("not used by scan");
        },
      } as unknown as NonNullable<
        Parameters<
          typeof createLiteratureArtifactMigrationHostFromZoteroBroker
        >[1]
      >["localControl"],
    });
    const progress: Array<{ completed: number; total: number | null }> = [];

    await host.scanLibrary({
      libraryId: 1,
      reportProgress: (entry) => {
        progress.push({ completed: entry.completed, total: entry.total });
        return entry.completed < 1;
      },
    });

    assert.equal(notePageReads, 1);
    assert.deepInclude(progress.at(-1), { completed: 1, total: 2 });
  });

  it("accepts only an exact verified canonical parent set before cleanup", async function () {
    const parentRef = { libraryId: 1, key: "PARENT" };
    const legacyNoteRef = { libraryId: 1, key: "LEGACY-NOTE" };
    const legacyReferences = {
      items: [
        {
          title: "A Study",
          year: 2024,
          authors: ["Ada Lovelace"],
        },
      ],
    };
    let wrongParent = false;
    let preservedVisibleHtml = "";
    const broker = createFailClosedZoteroHostCapabilityBroker({
      library: {
        listItems: async () => ({
          items: [{ kind: "regular", ref: parentRef }],
          hasMore: false,
          nextCursor: null,
        }),
        getItemNotes: async () => ({
          notes: [{ ref: legacyNoteRef }],
          hasMore: false,
          nextCursor: null,
        }),
      },
    });
    const idFactory = () => "source-id";
    const localControl = {
      readLegacyForMigration: async () => ({
        kind: "legacy" as const,
        html:
          '<span data-zs-payload="references-json">legacy references</span>' +
          '<span data-zs-payload="literature-matching-metadata-json">matching metadata</span>',
        revision: "legacy-1",
        payloads: [
          { payloadType: "references-json", value: legacyReferences },
          {
            payloadType: "literature-matching-metadata-json",
            value: { score: 1 },
          },
        ],
      }),
      applyParentSet: async (input) => {
        preservedVisibleHtml = input.entries[0]?.visibleHtml || "";
        const conversion = convertLegacyArtifactSet(
          {
            libraryId: 1,
            parentRef,
            filePayloads: [
              { payloadType: "references-json", value: legacyReferences },
            ],
            legacyNotes: [
              {
                ref: legacyNoteRef,
                html: '<span data-zs-payload="references-json"></span>',
                revision: "legacy-1",
                payloads: [
                  { payloadType: "references-json", value: legacyReferences },
                ],
              },
            ],
          },
          { idFactory },
        );
        const referencesBasis = hashSynthesisContractCanonicalJson(
          conversion.references,
        );
        const notes = [
          {
            kind: "managed" as const,
            noteKind: "references" as const,
            ref: legacyNoteRef,
            parentRef,
            title: "References",
            payload: conversion.references,
            payloadBytes: 1,
            detailBytes: 1,
            revision: "canonical-1",
          },
        ];
        const result = {
          outcome: "committed" as const,
          result: {
            notes: notes.map((note) => ({
              ...note,
              ...(wrongParent
                ? { parentRef: { libraryId: 1, key: "OTHER" } }
                : {}),
            })),
            referencesBasis,
          },
        } as unknown as MutationExecutionResult<LiteratureArtifactApplyAnalysisResultDto>;
        return result;
      },
    } as unknown as NonNullable<
      Parameters<
        typeof createLiteratureArtifactMigrationHostFromZoteroBroker
      >[1]
    >["localControl"];
    const host = createLiteratureArtifactMigrationHostFromZoteroBroker(broker, {
      localControl,
    });
    const service = createLiteratureArtifactMigrationService({
      host,
      idFactory,
      candidateIdFactory: (ordinal) => `candidate-${ordinal}`,
    });
    const preview = await service.scan({ libraryId: 1 });
    assert.isTrue(preview.ok);
    if (!preview.ok) throw new Error("expected migration preview");
    const result = await service.apply({
      scanOperationId: preview.operationId,
      candidateIds: [preview.candidates[0]!.candidateId],
    });
    assert.isTrue(result.ok);
    if (!result.ok) throw new Error("expected migration result");
    assert.equal(result.state, "completed");
    assert.notInclude(preservedVisibleHtml, "legacy references");
    assert.include(preservedVisibleHtml, "matching metadata");

    resetPluginStateStoreForTests();
    resetLiteratureArtifactMigrationRuntimeForTests();
    wrongParent = true;
    const retryService = createLiteratureArtifactMigrationService({
      host,
      idFactory,
      candidateIdFactory: (ordinal) => `candidate-${ordinal}`,
    });
    const retryPreview = await retryService.scan({ libraryId: 1 });
    assert.isTrue(retryPreview.ok);
    if (!retryPreview.ok) throw new Error("expected retry preview");
    const retryResult = await retryService.apply({
      scanOperationId: retryPreview.operationId,
      candidateIds: [retryPreview.candidates[0]!.candidateId],
    });
    assert.isTrue(retryResult.ok);
    if (!retryResult.ok) throw new Error("expected retry result");
    assert.equal(retryResult.state, "completed_with_attention");
    assert.equal(
      listLiteratureArtifactMigrationSets({
        runId: retryResult.runId,
        limit: 10,
      })[0]?.outcome,
      "repair_required",
    );
  });

  it("stores stable scan failure codes without raw host error details", async function () {
    const secret = "/private/library/raw-note.html";
    const service = createLiteratureArtifactMigrationService({
      host: {
        scanLibrary: async () => {
          throw new Error(secret);
        },
        applySet: async () => ({ outcome: "applied" as const }),
      },
    });
    const result = await service.scan({ libraryId: 1 });
    assert.isFalse(result.ok);
    assert.notInclude(
      JSON.stringify(listLiteratureArtifactMigrationRuns({ limit: 10 })),
      secret,
    );
    assert.include(
      getLiteratureArtifactMigrationRun(
        listLiteratureArtifactMigrationRuns({ limit: 10 })[0]!.runId,
      )?.diagnostics,
      "scan_failed:migration_error",
    );
  });

  it("publishes bounded scan progress and stops before later source work", async function () {
    let continueScan: (() => void) | undefined;
    const stopped = new Promise<void>((resolve) => {
      continueScan = resolve;
    });
    let progressAllowedAfterStop = true;
    const service = createLiteratureArtifactMigrationService({
      host: {
        scanLibrary: async ({ reportProgress }) => {
          assert.equal(
            reportProgress?.({ completed: 1, total: 3, candidateCount: 1 }),
            true,
          );
          assert.equal(
            reportProgress?.({ completed: 0, total: null, candidateCount: 0 }),
            true,
          );
          await stopped;
          progressAllowedAfterStop =
            reportProgress?.({ completed: 2, total: 3, candidateCount: 1 }) ??
            true;
          return [];
        },
        applySet: async () => ({ outcome: "applied" as const }),
      },
    });
    const scanning = service.scan({ libraryId: 1 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const active = service.getActiveSnapshot();
    assert.deepInclude(active, {
      phase: "scanning",
      progress: { completed: 1, total: 3, candidateCount: 1 },
    });
    assert.isTrue(service.stop({ runId: active!.runId }).ok);
    continueScan?.();
    const result = await scanning;
    assert.isFalse(result.ok);
    if (result.ok) throw new Error("expected stopped scan");
    assert.equal(result.code, "stopped");
    assert.isFalse(progressAllowedAfterStop);
    assert.isNull(service.getActiveSnapshot());
  });

  it("stores stable apply failure codes without raw host error details", async function () {
    const secret = "/private/library/raw-note.html";
    const set: LegacyArtifactSetInput = {
      libraryId: 1,
      parentRef: { libraryId: 1, key: "PARENT" },
      references: [{ title: "A Study", year: 2024, authors: ["Ada"] }],
    };
    const service = createLiteratureArtifactMigrationService({
      host: {
        scanLibrary: async () => [set],
        applySet: async () => {
          throw new Error(secret);
        },
      },
    });
    const preview = await service.scan({ libraryId: 1 });
    assert.isTrue(preview.ok);
    if (!preview.ok) throw new Error("expected migration preview");
    const result = await service.apply({
      scanOperationId: preview.operationId,
      candidateIds: [preview.candidates[0]!.candidateId],
    });
    assert.isFalse(result.ok);
    assert.notInclude(
      JSON.stringify(listLiteratureArtifactMigrationRuns({ limit: 10 })),
      secret,
    );
    assert.include(
      getLiteratureArtifactMigrationRun(preview.runId)?.diagnostics,
      "apply_failed:migration_error",
    );
  });

  it("persists one bounded set receipt and requires a fresh scan after restart", async function () {
    const set: LegacyArtifactSetInput = {
      libraryId: 1,
      parentRef: { libraryId: 1, key: "PARENT" },
      references: [{ title: "A Study", year: 2024, authors: ["Ada Lovelace"] }],
    };
    let applied = 0;
    const host = {
      scanLibrary: async () => [set],
      applySet: async () => {
        applied += 1;
        return { outcome: "applied" as const };
      },
    };
    const first = createLiteratureArtifactMigrationService({ host });
    const preview = await first.scan({ libraryId: 1 });
    assert.equal(preview.migrationId, LITERATURE_ARTIFACT_MIGRATION_ID);
    assert.equal(
      preview.definitionVersion,
      LITERATURE_ARTIFACT_MIGRATION_DEFINITION_VERSION,
    );
    const result = await first.apply({
      scanOperationId: preview.operationId,
      candidateIds: preview.candidates.map(
        (candidate) => candidate.candidateId,
      ),
    });
    assert.equal(result.state, "completed");
    assert.equal(applied, 1);
    assert.equal(listLiteratureArtifactMigrationRuns({ limit: 10 }).length, 1);
    assert.equal(getLiteratureArtifactMigrationRun(result.runId)?.setCount, 1);

    const restarted = createLiteratureArtifactMigrationService({ host });
    const stale = await restarted.apply({
      scanOperationId: preview.operationId,
      candidateIds: preview.candidates.map(
        (candidate) => candidate.candidateId,
      ),
    });
    assert.equal(stale.code, "fresh_scan_required");
  });

  it("pages runtime candidates and applies only the explicit selection", async function () {
    const ready = Array.from({ length: 26 }, (_unused, index) => ({
      libraryId: 1,
      parentRef: { libraryId: 1, key: `P${String(index).padStart(7, "0")}` },
      parentTitle: `Ready paper ${index + 1}`,
      references: [
        { title: `Ready reference ${index + 1}`, year: 2024, authors: ["Ada"] },
      ],
    }));
    const review: LegacyArtifactSetInput = {
      libraryId: 1,
      parentRef: { libraryId: 1, key: "REVIEW01" },
      parentTitle: "Review paper",
      references: [
        {
          sourceReferenceId: "REF-A",
          title: "Alpha",
          year: 2020,
          authors: ["Alice"],
          url: "shared",
        },
      ],
      citation: {
        items: [
          {
            title: "Beta",
            year: 2021,
            authors: ["Bob"],
            url: "shared",
            mentions: [{ rawCitation: "Beta (2021)" }],
          },
        ],
      },
    };
    const blocked: LegacyArtifactSetInput = {
      libraryId: 1,
      parentRef: { libraryId: 1, key: "BLOCK001" },
      parentTitle: "Blocked paper",
      filePayloads: [
        {
          payloadType: "references-json",
          value: { items: [{ title: "Blocked reference" }] },
        },
        { payloadType: "future-managed-json", value: { future: true } },
      ],
    };
    let applied = 0;
    const service = createLiteratureArtifactMigrationService({
      host: {
        scanLibrary: async () => [...ready, review, blocked],
        applySet: async () => {
          applied += 1;
          return { outcome: "applied" as const };
        },
      },
      candidateIdFactory: (ordinal) => `candidate-${ordinal}`,
    });
    const preview = await service.scan({ libraryId: 1 });
    assert.isTrue(preview.ok);
    if (!preview.ok) throw new Error("expected migration preview");

    const first = service.listCandidatePage({
      runId: preview.runId,
      limit: 25,
    });
    assert.lengthOf(first.items, 25);
    assert.isString(first.nextCursor);
    assert.deepEqual(first.summary, {
      total: 28,
      unfilteredTotal: 28,
      ready: 26,
      reviewRequired: 1,
      blocked: 1,
      selected: 26,
    });
    assert.equal(first.items[0]?.title, "Ready paper 1");
    assert.isTrue(first.items.every((candidate) => candidate.selected));

    const second = service.listCandidatePage({
      runId: preview.runId,
      limit: 25,
      cursor: first.nextCursor || undefined,
    });
    assert.deepEqual(
      second.items.map(({ classification, selected }) => ({
        classification,
        selected,
      })),
      [
        { classification: "ready", selected: true },
        { classification: "review_required", selected: false },
        { classification: "blocked", selected: false },
      ],
    );
    const reviewCandidate = second.items[1]!;
    const blockedCandidate = second.items[2]!;
    for (const issue of reviewCandidate.issues) {
      const option = issue.options.find(
        (entry) =>
          entry.kind === "keep_unresolved" || entry.kind === "accept_recovery",
      );
      assert.isOk(option);
      assert.isTrue(
        service.resolveCandidateIssue({
          scanOperationId: preview.operationId,
          candidateId: reviewCandidate.candidateId,
          issueId: issue.issueId,
          optionId: option!.optionId,
        }).ok,
      );
    }
    assert.isTrue(
      service.setCandidateSelection({
        scanOperationId: preview.operationId,
        candidateId: reviewCandidate.candidateId,
        selected: true,
      }).ok,
    );
    const blockedSelection = service.setCandidateSelection({
      scanOperationId: preview.operationId,
      candidateId: blockedCandidate.candidateId,
      selected: true,
    });
    assert.isFalse(blockedSelection.ok);
    if (blockedSelection.ok)
      throw new Error("blocked candidate was selectable");
    assert.equal(blockedSelection.code, "candidate_not_selectable");

    const selected = service.listCandidatePage({
      runId: preview.runId,
      limit: 25,
      cursor: first.nextCursor || undefined,
    });
    assert.equal(selected.summary.selected, 27);
    assert.isTrue(selected.items[1]?.selected);
    const result = await service.apply({
      scanOperationId: preview.operationId,
      migrationId: LITERATURE_ARTIFACT_MIGRATION_ID,
      definitionVersion: LITERATURE_ARTIFACT_MIGRATION_DEFINITION_VERSION,
    });
    assert.isTrue(result.ok);
    assert.equal(applied, 27);
  });

  it("resolves duplicate and linkage issues before approving a candidate", async function () {
    let appliedReferenceCount = 0;
    let appliedUnresolvedCount = 0;
    const service = createLiteratureArtifactMigrationService({
      host: {
        scanLibrary: async () => [
          {
            libraryId: 1,
            parentRef: { libraryId: 1, key: "PARENT" },
            parentTitle: "Needs review",
            references: [
              { title: "Same", year: 2024, authors: ["Ada"] },
              { title: "Same", year: 2024, authors: ["Ada"] },
            ],
            citation: { mentions: [{ rawCitation: "Unknown (2020)" }] },
          },
        ],
        applySet: async ({ candidate }) => {
          appliedReferenceCount =
            candidate.conversion.references.references.length;
          appliedUnresolvedCount =
            candidate.conversion.citation?.unresolved.length || 0;
          return { outcome: "applied" as const };
        },
      },
      candidateIdFactory: () => "candidate-1",
    });
    const preview = await service.scan({ libraryId: 1 });
    assert.isTrue(preview.ok);
    if (!preview.ok) throw new Error("expected migration preview");
    const initial = service.listCandidatePage({ runId: preview.runId });
    const candidate = initial.items[0]!;
    assert.equal(candidate.classification, "blocked");
    assert.equal(candidate.disposition, "pending");

    const duplicate = candidate.issues.find(
      (issue) => issue.reasonCode === "duplicate_reference",
    )!;
    assert.deepEqual(duplicate.affectedItems, [{ label: "Same" }]);
    const initialLinkage = candidate.issues.find(
      (issue) => issue.reasonCode === "unresolved_linkage",
    )!;
    assert.lengthOf(initialLinkage.affectedItems || [], 1);
    assert.include(initialLinkage.affectedItems![0]!.label, "Unknown (2020)");

    const merged = duplicate.options.find(
      (option) => option.kind === "merge_duplicates",
    )!;
    assert.isTrue(
      service.resolveCandidateIssue({
        scanOperationId: preview.operationId,
        candidateId: candidate.candidateId,
        issueId: duplicate.issueId,
        optionId: merged.optionId,
      }).ok,
    );
    const afterDuplicate = service.listCandidatePage({ runId: preview.runId });
    assert.equal(afterDuplicate.items[0]?.classification, "review_required");

    const linkage = afterDuplicate.items[0]!.issues.find(
      (issue) => issue.reasonCode === "unresolved_linkage",
    )!;
    const drop = linkage.options.find(
      (option) => option.kind === "drop_unresolved",
    )!;
    assert.isTrue(
      service.resolveCandidateIssue({
        scanOperationId: preview.operationId,
        candidateId: candidate.candidateId,
        issueId: linkage.issueId,
        optionId: drop.optionId,
      }).ok,
    );
    const resolved = service.listCandidatePage({ runId: preview.runId });
    assert.equal(resolved.items[0]?.classification, "ready");
    const resolvedLinkage = resolved.items[0]!.issues.find(
      (issue) => issue.reasonCode === "unresolved_linkage",
    )!;
    assert.isUndefined(
      resolvedLinkage.affectedItems,
      "dropped unresolved mentions must clear the affected item list",
    );
    assert.isTrue(
      service.setCandidateSelection({
        scanOperationId: preview.operationId,
        candidateId: candidate.candidateId,
        selected: true,
      }).ok,
    );
    const result = await service.apply({
      scanOperationId: preview.operationId,
    });
    assert.isTrue(result.ok);
    assert.equal(appliedReferenceCount, 1);
    assert.equal(appliedUnresolvedCount, 0);
  });

  it("filters the complete runtime plan before pagination", async function () {
    const service = createLiteratureArtifactMigrationService({
      host: {
        scanLibrary: async () => [
          {
            libraryId: 1,
            parentRef: { libraryId: 1, key: "READY" },
            parentTitle: "Ready paper",
            references: [{ title: "Ready", year: 2024, authors: ["Ada"] }],
          },
          {
            libraryId: 1,
            parentRef: { libraryId: 1, key: "BLOCKED" },
            parentTitle: "Blocked paper",
            filePayloads: [
              {
                payloadType: "references-json",
                value: { items: [{ title: "Blocked" }] },
              },
              { payloadType: "future-managed-json", value: {} },
            ],
          },
        ],
        applySet: async () => ({ outcome: "applied" as const }),
      },
    });
    const preview = await service.scan({ libraryId: 1 });
    assert.isTrue(preview.ok);
    if (!preview.ok) throw new Error("expected migration preview");
    const page = service.listCandidatePage({
      runId: preview.runId,
      query: {
        search: "blocked",
        classification: "blocked",
        reasonCode: "unsupported_input",
        disposition: "pending",
      },
    });
    assert.deepEqual(
      page.items.map((item) => item.title),
      ["Blocked paper"],
    );
    assert.equal(page.summary.total, 1);
    assert.equal(page.summary.unfilteredTotal, 2);
    assert.equal(page.summary.selected, 1);
    assert.include(page.availableReasons, "unsupported_input");
  });

  it("continues every retryable set across durable receipt pages", async function () {
    const sets: LegacyArtifactSetInput[] = Array.from(
      { length: 101 },
      (_, index) => ({
        libraryId: 1,
        parentRef: { libraryId: 1, key: `PARENT-${index + 1}` },
        references: [
          { title: `Study ${index + 1}`, year: 2024, authors: ["Ada"] },
        ],
      }),
    );
    let continuedParentCount = 0;
    const host = {
      scanLibrary: async (args: {
        parentRefs?: MigrationPortableItemRef[];
      }) => {
        if (args.parentRefs) continuedParentCount = args.parentRefs.length;
        return args.parentRefs
          ? sets.filter((set) =>
              args.parentRefs!.some(
                (ref) =>
                  ref.libraryId === set.parentRef.libraryId &&
                  ref.key === set.parentRef.key,
              ),
            )
          : sets;
      },
      applySet: async () => ({ outcome: "changed_since_scan" as const }),
    };
    const service = createLiteratureArtifactMigrationService({ host });
    const preview = await service.scan({ libraryId: 1 });
    assert.isTrue(preview.ok);
    if (!preview.ok) throw new Error("expected migration preview");
    const result = await service.apply({
      scanOperationId: preview.operationId,
      candidateIds: preview.candidates.map(
        (candidate) => candidate.candidateId,
      ),
    });
    assert.isTrue(result.ok);
    if (!result.ok) throw new Error("expected migration result");
    const continued = await service.continue({ runId: result.runId });
    assert.isTrue(continued.ok);
    assert.equal(continuedParentCount, 101);
  });

  it("shares the active gate, stops between sets, and pages durable receipts", async function () {
    const sets: LegacyArtifactSetInput[] = [
      {
        libraryId: 1,
        parentRef: { libraryId: 1, key: "PARENT-A" },
        references: [{ title: "A Study", year: 2024, authors: ["Ada"] }],
      },
      {
        libraryId: 1,
        parentRef: { libraryId: 1, key: "PARENT-B" },
        references: [{ title: "B Study", year: 2023, authors: ["Grace"] }],
      },
    ];
    let releaseFirst: (() => void) | undefined;
    const firstSetStarted = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let applied = 0;
    const host = {
      scanLibrary: async () => sets,
      applySet: async ({ parentRef }: { parentRef: { key: string } }) => {
        applied += 1;
        if (parentRef.key === "PARENT-A") {
          await firstSetStarted;
        }
        return { outcome: "applied" as const };
      },
    };
    const service = createLiteratureArtifactMigrationService({ host });
    const preview = await service.scan({ libraryId: 1 });
    const applying = service.apply({
      scanOperationId: preview.operationId,
      candidateIds: preview.candidates.map(
        (candidate) => candidate.candidateId,
      ),
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const busy = await service.scan({ libraryId: 1 });
    assert.equal(busy.ok, false);
    if (busy.ok) throw new Error("expected active migration gate");
    assert.equal(busy.code, "busy");
    assert.equal(service.stop({ runId: preview.runId }).ok, true);
    releaseFirst?.();
    const result = await applying;
    assert.equal(result.ok, true);
    if (!result.ok) throw new Error("expected migration result");
    assert.equal(result.state, "completed_with_attention");
    assert.equal(result.reason, "user_stopped");
    assert.equal(result.processedCount, 1);
    assert.equal(result.remainingCount, 1);
    assert.equal(applied, 1);
    const firstPage = service.listReceiptsPage({
      runId: preview.runId,
      limit: 1,
    });
    assert.equal(firstPage.items.length, 1);
    assert.isString(firstPage.nextCursor);
    const secondPage = service.listReceiptsPage({
      runId: preview.runId,
      limit: 1,
      cursor: firstPage.nextCursor || undefined,
    });
    assert.equal(secondPage.items.length, 1);
    assert.notEqual(firstPage.items[0]?.operationId, preview.operationId);
    assert.notEqual(
      firstPage.items[0]?.operationId,
      secondPage.items[0]?.operationId,
    );
    assert.equal(
      listLiteratureArtifactMigrationSets({ runId: preview.runId, limit: 10 })
        .length,
      2,
    );
  });
});
