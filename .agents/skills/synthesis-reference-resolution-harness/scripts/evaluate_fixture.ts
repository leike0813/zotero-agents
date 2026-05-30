import fs from "fs";
import path from "path";
import {
  evaluateReferenceResolutionFixture,
  type ReferenceMatcherPolicyId,
  type ReferenceResolutionEvaluationResult,
  type ReferenceResolutionFixture,
} from "../../../../src/modules/synthesis/referenceMatcher.ts";

function argValue(name: string, fallback = "") {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function readJson<T>(fixture: string, fileName: string): T {
  return JSON.parse(fs.readFileSync(path.join(fixture, fileName), "utf8")) as T;
}

function loadFixture(
  fixture: string,
  labelsFile: string,
): ReferenceResolutionFixture {
  return {
    library: readJson(fixture, "library.json"),
    references: readJson(fixture, "references.json"),
    goldLabels: readJson(fixture, labelsFile),
    dangerPairs: readJson(fixture, "danger-pairs.json"),
  };
}

function markdownReport(
  fixture: string,
  results: ReferenceResolutionEvaluationResult[],
) {
  const lines = [
    "# Synthesis Reference Resolution Experiment Report",
    "",
    `Date: ${new Date().toISOString().slice(0, 10)}`,
    "",
    `Fixture: \`${fixture.replace(/\\/g, "/")}\``,
    "",
    "| Policy | TP | FP | FN | Precision | Recall | F1 | Candidate@1 | Candidate@3 | Danger FP |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  ];
  for (const result of results) {
    lines.push(
      `| ${result.policy} | ${result.truePositive} | ${result.falsePositive} | ${result.falseNegative} | ${result.precision.toFixed(4)} | ${result.recall.toFixed(4)} | ${result.f1.toFixed(4)} | ${result.candidateAt1Recall.toFixed(4)} | ${result.candidateAt3Recall.toFixed(4)} | ${result.dangerFalsePositive} |`,
    );
  }
  lines.push(
    "",
    "Policy boundary:",
    "",
    "- `literature_matching_metadata` is not used for literature-to-literature reference identity resolution.",
    "- Automatic `matched` edges should remain precision-first.",
    "- Lower-confidence candidates should remain suggestions until explicitly reviewed.",
    "",
  );
  return `${lines.join("\n")}\n`;
}

function main() {
  const fixturePath = argValue("--fixture");
  if (!fixturePath) {
    throw new Error("missing --fixture");
  }
  const labelsFile = argValue("--labels", "gold-labels.json");
  const report = argValue("--report");
  const includeIds = process.argv.includes("--include-ids");
  const policies = (
    argValue("--policies") ||
    "baseline,policy-a,policy-b,policy-c,policy-d,production"
  )
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean) as ReferenceMatcherPolicyId[];
  const fixture = loadFixture(fixturePath, labelsFile);
  const results = policies.map((policy) =>
    evaluateReferenceResolutionFixture(fixture, policy),
  );
  if (report) {
    fs.mkdirSync(path.dirname(report), { recursive: true });
    fs.writeFileSync(report, markdownReport(fixturePath, results), "utf8");
  }
  console.log(
    JSON.stringify(
      {
        ok: true,
        fixture: fixturePath,
        labelsFile,
        report: report || "",
        results: includeIds
          ? results
          : results.map(
              ({ falsePositiveIds, falseNegativeIds, ...result }) => ({
                ...result,
                falsePositiveIdCount: falsePositiveIds.length,
                falseNegativeIdCount: falseNegativeIds.length,
              }),
            ),
      },
      null,
      2,
    ),
  );
}

main();
