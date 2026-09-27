describe(
  "runtime platform services in Zotero native-core OMP-ai compatibility bundle",
  function () {
    it("runs the native Agent through the OMP pi-ai bridge", async function () {
      const runtime = globalThis as typeof globalThis & {
        OmpZoteroPrototype?: {
          runOmpCompatibilityProbe(): Promise<Record<string, any>>;
        };
        Services?: { env?: { get(name: string): string } };
      };
      const outputRoot = runtime.Services?.env?.get("OMP_PROTOTYPE_OUTPUT");
      assert.isString(outputRoot);
      assert.isNotEmpty(outputRoot);

      const source = await Zotero.File.getContentsAsync(
        `${outputRoot}/omp.iife.js`,
      );
      (0, eval)(source);
      try {
        const report = await runtime.OmpZoteroPrototype?.runOmpCompatibilityProbe();
        assert.equal(report?.schema, "omp-zotero-compatibility.v1");
        assert.isTrue(report?.runtime.nodeRuntimeAbsent);
        assert.isTrue(report?.runtime.bunGlobalAbsent);
        assert.isTrue(report?.agent.nativeCoreUsed);
        assert.isFalse(report?.agent.ompCoreLoaded);
        assert.equal(report?.agent.ompCalls, 2);
        assert.equal(report?.agent.finalStopReason, "stop");
        assert.equal(report?.agent.finalText, "echo complete");
        assert.deepEqual(Array.from(report?.agent.toolExecutions ?? []), [
          "echo:probe",
        ]);
        assert.equal(report?.cancellation.stopReason, "aborted");
        assert.isAbove(report?.catalog.bundledProviders, 0);
        assert.isAbove(report?.catalog.bundledModels, 0);
        assert.equal(report?.catalog.overlayAccepted, 1);
        assert.equal(report?.catalog.overlayRejected, 2);
        assert.isTrue(report?.auth.explicitApiKeyForwarded);
        assert.isFalse(report?.auth.ompStateTouched);
        Zotero.debug(
          `[omp-zotero-compatibility] Zotero ${Zotero.version}: ${JSON.stringify(report)}`,
        );
      } finally {
        delete runtime.OmpZoteroPrototype;
      }
    });
  },
);
