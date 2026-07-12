// The package owns the compliance policy so the workflow and host projection
// always apply precisely the same controlled-vocabulary rule.
// @ts-expect-error The workflow package is bundled as a runtime ESM module.
import { evaluateTagCompliance as evaluatePackageTagCompliance } from "../../../workflows_builtin/literature-workbench-package/lib/tagCompliance.mjs";

export type TagComplianceEvaluation = {
  compliant: boolean;
  nonCompliantTags: string[];
};

export function evaluateTagCompliance(args: {
  tags?: unknown[];
  controlledTags?: unknown[];
}): TagComplianceEvaluation {
  return evaluatePackageTagCompliance(args) as TagComplianceEvaluation;
}
