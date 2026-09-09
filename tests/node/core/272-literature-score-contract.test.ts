import { assert } from "chai";
import {
  LITERATURE_SCORE_SCHEMA,
  parseLiteratureScoreArtifact,
  validateLiteratureScoreArtifact,
  type LiteratureScoreArtifact,
} from "../../../packages/synthesis-contracts/src/literatureArtifacts";
import { parseImportedScoreArtifact } from "../../../workflows_builtin/literature-workbench-package/lib/importSchemas.mjs";

const dimensionKeys = [
  "methodological_rigor",
  "evidence_completeness",
  "reproducibility",
  "innovation_signals",
  "research_impact_potential",
  "writing_quality",
];

function scoreArtifact(): LiteratureScoreArtifact {
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
