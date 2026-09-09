import {
  inferDomainFromFilePath,
  shouldSkipByZoteroRoutineAllowlist,
} from "./domainFilter";
import { getTestDomain } from "./testMode";

const INSTALL_FLAG = "__zsZoteroRoutinePruneInstalled";

export function installZoteroRoutinePruning() {
  const runtime = globalThis as typeof globalThis & {
    [INSTALL_FLAG]?: boolean;
  };
  if (runtime[INSTALL_FLAG]) {
    return;
  }
  runtime[INSTALL_FLAG] = true;

  beforeEach(function () {
    const selectedDomain = getTestDomain();
    const currentFile = (this.currentTest && this.currentTest.file) || "";
    const currentFullTitle =
      (this.currentTest &&
        this.currentTest.fullTitle &&
        this.currentTest.fullTitle()) ||
      "";
    const testDomain = inferDomainFromFilePath(currentFile);
    if (
      shouldSkipByZoteroRoutineAllowlist({
        selectedDomain,
        testDomain,
        fullTitle: currentFullTitle,
        filePath: currentFile,
      })
    ) {
      this.skip();
    }
  });
}
