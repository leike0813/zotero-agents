import { writeFileSync } from "node:fs";
import path from "node:path";
import { beginSynthesisProtocolExecutionScope } from "./synthesisProtocolExecutionEvidence";

let scope: ReturnType<typeof beginSynthesisProtocolExecutionScope> | undefined;
export const mochaHooks = {
  beforeAll() {
    scope = beginSynthesisProtocolExecutionScope();
  },
  afterAll() {
    scope?.end();
    const directory = process.env.ZOTERO_SYNTHESIS_PROTOCOL_EVIDENCE_DIR;
    if (directory && scope?.identity)
      writeFileSync(
        path.join(directory, "verified.json"),
        JSON.stringify({ identity: scope.identity }),
      );
  },
};
