import { getTestDomain } from "./zotero/testMode";
import {
  inferDomainFromFilePath,
  shouldSkipByDomain,
  shouldSkipByZoteroRoutineAllowlist,
} from "./zotero/domainFilter";

beforeEach(function () {
  const selectedDomain = getTestDomain();
  const currentFile = (this.currentTest && this.currentTest.file) || "";
  const currentFullTitle =
    (this.currentTest &&
      this.currentTest.fullTitle &&
      this.currentTest.fullTitle()) ||
    "";
  const testDomain = inferDomainFromFilePath(currentFile);
  if (shouldSkipByDomain({ selectedDomain, testDomain })) {
    this.skip();
  }
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
