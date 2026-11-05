import { assert } from "chai";
import { rebuildSynthesisReferenceRefreshPrepareRequest } from "../../packages/synthesis-contracts/src/index";

const LITERATURE_QUALITY = {
  status: "missing",
  schema: "literature_score.v1",
  rubric_id: "rubric:1",
  paper_type: "article",
  overall_score: 0,
  confidence: 0,
  confidence_adjusted_score: 0,
  quality_prior: 0.5,
  diagnostics: ["literature_score_missing"],
};

const LITERATURE_QUALITY_V2 = {
  status: "available",
  schema: "literature_score.v2",
  rubric_id: "literature-score.interpretive_historical.v1",
  overall_score: 68,
  confidence: 0.8,
  confidence_adjusted_score: 64.4,
  quality_prior: 0.644,
  diagnostics: [],
};

function descriptor(
  artifactType: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    paperRef: "1:ITEM1",
    artifactType,
    payloadType: "application/json",
    status: "missing",
    diagnostics: [],
    ...(artifactType === "literature_score"
      ? { literatureQuality: LITERATURE_QUALITY }
      : {}),
    ...extra,
  };
}

function prepareRequest(artifacts: unknown[]) {
  return {
    expectedReferenceHash: null,
    force: true,
    scope: { kind: "full" },
    items: [
      {
        paperRef: "1:ITEM1",
        libraryId: 1,
        itemKey: "ITEM1",
        itemType: "journalArticle",
        title: "Paper",
        year: "2026",
        date: "",
        creators: [],
        tags: [],
        collections: [],
        doi: "",
        arxiv: "",
        isbn: "",
        url: "",
        citekey: "",
        dateAdded: "",
      },
    ],
    artifacts,
  };
}

function allArtifactTypes(extra: Record<string, unknown> = {}) {
  return [
    descriptor("digest", extra),
    descriptor("references", extra),
    descriptor("citation_analysis", extra),
    descriptor("literature_score", extra),
  ];
}

describe("synthesis reference refresh artifact contract", () => {
  it("accepts the host artifact note fields declared by the wire contract", () => {
    const request = rebuildSynthesisReferenceRefreshPrepareRequest(
      prepareRequest(
        allArtifactTypes({
          noteKey: "NOTE1",
          noteTitle: "Digest note",
          missingReason: "payload_not_found",
        }),
      ),
    );
    assert.equal(request.artifacts.length, 4);
    for (const artifact of request.artifacts) {
      assert.equal(artifact.noteKey, "NOTE1");
      assert.equal(artifact.noteTitle, "Digest note");
      assert.equal(artifact.missingReason, "payload_not_found");
    }
  });

  it("keeps the artifact descriptor usable without the optional note fields", () => {
    const request = rebuildSynthesisReferenceRefreshPrepareRequest(
      prepareRequest(allArtifactTypes()),
    );
    assert.equal(request.artifacts.length, 4);
    for (const artifact of request.artifacts) {
      assert.isUndefined(artifact.noteKey);
      assert.isUndefined(artifact.noteTitle);
      assert.isUndefined(artifact.missingReason);
    }
  });

  it("rejects an empty note title instead of accepting a blank contract value", () => {
    assert.throws(() =>
      rebuildSynthesisReferenceRefreshPrepareRequest(
        prepareRequest(allArtifactTypes({ noteTitle: "" })),
      ),
    );
  });

  it("rebuilds a v2 quality summary without a fabricated paper type", () => {
    const request = rebuildSynthesisReferenceRefreshPrepareRequest(
      prepareRequest([
        ...allArtifactTypes().slice(0, 3),
        descriptor("literature_score", {
          literatureQuality: LITERATURE_QUALITY_V2,
        }),
      ]),
    );
    const literatureQuality = request.artifacts[3].literatureQuality;
    assert.equal(literatureQuality?.schema, "literature_score.v2");
    assert.notProperty(literatureQuality, "paper_type");
    assert.equal(literatureQuality?.overall_score, 68);
  });

  it("rejects mixed or unknown quality summaries", () => {
    for (const literatureQuality of [
      { ...LITERATURE_QUALITY_V2, paper_type: "article" },
      { ...LITERATURE_QUALITY_V2, literature_classification: {} },
      { ...LITERATURE_QUALITY_V2, schema: "literature_score.v9" },
      { ...LITERATURE_QUALITY_V2, schema: "literature_score.v1" },
    ]) {
      assert.throws(() =>
        rebuildSynthesisReferenceRefreshPrepareRequest(
          prepareRequest([
            ...allArtifactTypes().slice(0, 3),
            descriptor("literature_score", { literatureQuality }),
          ]),
        ),
      );
    }
  });
});
