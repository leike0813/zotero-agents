import { runTestSubstages, ZOTERO_FULL_STEPS } from "./run-test-substages";

void runTestSubstages(ZOTERO_FULL_STEPS).then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);
