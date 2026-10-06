import { resolvePhase1FamilySelection } from "../../scripts/system-e2e/familyLifecycle";
import { readDiagnosticsEnv } from "./testDiagnosticsOutput";

type CaseIdentity = {
  caseId: string;
  familyId?: string;
  allowedSkip?: "platform_unsupported";
};
type CaseTest = Mocha.Test & { systemE2ECase?: CaseIdentity };
type CaseRunner = Mocha.Runner & {
  grepTotal(suite: Pick<Mocha.Suite, "eachTest">): number;
};

export function systemE2ECase(
  caseId: string,
  familyId: string | undefined,
  title: string,
  callback: (this: Mocha.Context) => void | Promise<void>,
  allowedSkip?: "platform_unsupported",
) {
  const test = it(title, callback) as CaseTest;
  test.systemE2ECase = {
    caseId,
    ...(familyId ? { familyId } : {}),
    ...(allowedSkip ? { allowedSkip } : {}),
  };
  return test;
}

export function prepareSystemE2ECases(
  runner: CaseRunner,
  publish: (event: unknown) => Promise<unknown>,
  env = {
    families: readDiagnosticsEnv("ZOTERO_SYSTEM_E2E_FAMILIES"),
    completed: readDiagnosticsEnv("ZOTERO_SYSTEM_E2E_COMPLETED_CASES"),
  },
) {
  const families = env.families
    ? new Set<string>(resolvePhase1FamilySelection(env.families))
    : undefined;
  const completed: unknown = JSON.parse(env.completed || "[]");
  if (
    !Array.isArray(completed) ||
    completed.some((id) => typeof id !== "string")
  )
    throw new Error("system_e2e_completed_cases_invalid");
  const tests: CaseTest[] = [];
  runner.suite.eachTest((test) => tests.push(test));
  const selected = tests.filter((test) => {
    if (
      !runner.grepTotal({
        eachTest: (callback) => {
          callback(test);
        },
      } as Mocha.Suite)
    )
      return false;
    const identity = test.systemE2ECase;
    if (!identity) throw new Error("system_e2e_case_identity_missing");
    return (
      !families ||
      !identity.familyId ||
      identity.familyId === "runner-foundation" ||
      families.has(identity.familyId)
    );
  });
  const retained = new Set(
    selected.filter((test) => !completed.includes(test.systemE2ECase!.caseId)),
  );
  const prune = (suite: Mocha.Suite) => {
    suite.tests = suite.tests.filter((test) => retained.has(test));
    suite.suites.forEach(prune);
  };
  prune(runner.suite);
  runner.total = runner.grepTotal(runner.suite);
  const publication = publish({
    type: "debug",
    data: {
      kind: "system-e2e-selection",
      cases: selected.map((test) => test.systemE2ECase),
    },
  });
  runner.suite.beforeAll("System E2E selection publication", async () => {
    await publication;
  });
  return publication;
}

(
  globalThis as typeof globalThis & {
    __zsPrepareSystemE2ECases?: typeof prepareSystemE2ECases;
  }
).__zsPrepareSystemE2ECases = prepareSystemE2ECases;
