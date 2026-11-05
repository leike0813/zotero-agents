import { assert } from "chai";
import {
  LITERATURE_SCORE_SCHEMA,
  parseLiteratureScoreArtifact,
  validateLiteratureScoreArtifact,
  type LiteratureScoreArtifact,
} from "../../packages/synthesis-contracts/src/literatureArtifacts";
import { parseImportedScoreArtifact } from "../../workflows_builtin/literature-workbench-package/lib/importSchemas.mjs";
import {
  buildLiteratureQualitySnapshot,
  parseLiteratureScore,
} from "../../src/shared/literatureScore";

const dimensionKeys = [
  "methodological_rigor",
  "evidence_completeness",
  "reproducibility",
  "innovation_signals",
  "research_impact_potential",
  "writing_quality",
];

function scoreArtifact(): Extract<
  LiteratureScoreArtifact,
  { schema: "literature_score.v1" }
> {
  return {
    schema: LITERATURE_SCORE_SCHEMA,
    rubric_id: "default-v1",
    paper_type: "empirical",
    paper_type_reason: "The paper reports an empirical study.",
    overall_score: 78,
    confidence: 0.8,
    confidence_adjusted_score: 62.4,
    dimensions: dimensionKeys.map((dimension_key, index) => ({
      dimension_key,
      name: dimension_key.replaceAll("_", " "),
      configured_weight: 1 / 6,
      effective_weight: 1 / 6,
      raw_score: 10 + index,
      applicable_max_score: 20,
      score: 50 + index,
      confidence: 0.8,
      summary: "The available evidence supports this dimension.",
      criteria: [
        {
          criterion_key: `${dimension_key}-criterion`,
          name: "Evidence quality",
          status: "scored",
          score: 10,
          max_score: 20,
          reason: "The source provides usable evidence.",
          evidence: [
            {
              line_start: 10 + index,
              line_end: 11 + index,
              quote: "A representative evidence quote.",
            },
          ],
        },
      ],
    })),
  };
}

describe("canonical literature score artifact contract", function () {
  it("preserves a v2 classification without fabricating a v1 paper type", function () {
    const { paper_type, paper_type_reason, ...common } = scoreArtifact();
    const artifact = {
      ...common,
      schema: "literature_score.v2",
      literature_classification: {
        disciplines: ["history"],
        profile_id: "interpretive_historical",
        confidence: "high",
        reason: "The study interprets historical sources.",
      },
    };
    assert.deepEqual(parseLiteratureScoreArtifact(artifact), artifact);
    assert.deepEqual(parseImportedScoreArtifact(artifact), artifact);
    const summary = parseLiteratureScore(artifact);
    assert.deepEqual(
      summary && "classification" in summary ? summary.classification : null,
      artifact.literature_classification,
    );
    assert.notProperty(summary, "paperType");
    const quality = buildLiteratureQualitySnapshot({ payload: artifact });
    assert.equal(quality.status, "available");
    assert.equal(quality.schema, "literature_score.v2");
    assert.closeTo(quality.quality_prior, 0.724, 0.000001);
    assert.notProperty(quality, "paper_type");
    assert.notProperty(quality, "literature_classification");
    for (const invalid of [
      { ...artifact, schema: "literature_score.v9" },
      { ...artifact, paper_type, paper_type_reason },
      {
        ...artifact,
        literature_classification: {
          ...artifact.literature_classification,
          profile_id: "unknown",
        },
      },
      { ...artifact, dimensions: artifact.dimensions.slice(1) },
    ]) {
      assert.isFalse(validateLiteratureScoreArtifact(invalid).ok);
    }
  });

  it("accepts the native score object and preserves criteria evidence", function () {
    const artifact = scoreArtifact();
    assert.isTrue(validateLiteratureScoreArtifact(artifact).ok);
    assert.deepEqual(parseLiteratureScoreArtifact(artifact), artifact);
    assert.deepEqual(parseImportedScoreArtifact(artifact), artifact);
    assert.throws(() =>
      parseImportedScoreArtifact({ literature_score: artifact }),
    );
  });

  it("rejects renderer wrappers and summary-only dimensions", function () {
    const wrapped = { literature_score: scoreArtifact() };
    assert.isFalse(validateLiteratureScoreArtifact(wrapped).ok);

    const summaryOnly = structuredClone(scoreArtifact());
    delete (summaryOnly.dimensions[0] as unknown as Record<string, unknown>)
      .criteria;
    assert.isFalse(validateLiteratureScoreArtifact(summaryOnly).ok);
  });
});
