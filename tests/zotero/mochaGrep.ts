import { getTestGrepPattern } from "./testMode";

const GREP_APPLIED_FLAG = "__zotero_skills_mocha_grep_applied__";

export function applyMochaGrepFromEnv() {
  const runtime = globalThis as {
    mocha?: { grep?: (pattern: string) => unknown };
    [GREP_APPLIED_FLAG]?: boolean;
  };
  if (runtime[GREP_APPLIED_FLAG]) {
    return;
  }
  runtime[GREP_APPLIED_FLAG] = true;

  const pattern = getTestGrepPattern();
  if (!pattern) {
    return;
  }

  if (typeof runtime.mocha?.grep === "function") {
    runtime.mocha.grep(pattern);
  }
}
