import { assert } from "chai";

// Regression: these modules used to hold their host slots in module-scope
// `let` bindings configured by acpSkillRunStore at evaluation time, so a
// direct import through the persistence -> ... -> store import cycle hit a
// TDZ ReferenceError. The slots now live in the acpSkillRunHosts leaf
// module, so each collaborator must be loadable on its own. The dynamic
// imports start at file load so this suite alone exercises the standalone
// module evaluation order.
const persistenceModule = import("../../../src/modules/acpSkillRunPersistence");
const transcriptMirrorModule =
  import("../../../src/modules/acpSkillRunTranscriptMirror");
const workspaceDataPlaneModule =
  import("../../../src/modules/acpSkillRunWorkspaceDataPlane");

describe("acp skill run hosts leaf module", function () {
  it("loads persistence, transcript mirror, and workspace data plane standalone", async function () {
    const [persistence, transcriptMirror, workspaceDataPlane] =
      await Promise.all([
        persistenceModule,
        transcriptMirrorModule,
        workspaceDataPlaneModule,
      ]);
    assert.isFunction(persistence.flushAcpSkillRunRuntimeFileWrites);
    assert.isFunction(transcriptMirror.hydrateAcpSkillRunTranscriptMirror);
    assert.isFunction(workspaceDataPlane.listAcpSkillRunSummaries);
  });
});
