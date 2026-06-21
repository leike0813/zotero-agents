import { assert } from "chai";
import {
  collectOutputArtifactFields,
  collectOutputBundleArtifactPaths,
  validateFlatArtifactManifest,
} from "../../src/modules/workflowExecution/artifactManifest";

describe("bundle artifact manifest contract", function () {
  const outputSchema = {
    type: "object",
    oneOf: [
      {
        type: "object",
        properties: {
          html_path: {
            type: "string",
            "x-type": "artifact",
            "x-role": "deep-reading-html",
          },
          artifact_manifest_path: {
            type: "string",
            "x-type": "artifact",
            "x-role": "artifact-manifest",
          },
        },
      },
    ],
  };

  it("collects top-level artifact and artifact-manifest schema roles", function () {
    assert.deepEqual(collectOutputArtifactFields(outputSchema), [
      {
        name: "artifact_manifest_path",
        role: "artifact-manifest",
        isManifest: true,
      },
      {
        name: "html_path",
        role: "deep-reading-html",
        isManifest: false,
      },
    ]);
  });

  it("expands flat artifact manifests into bundle paths", async function () {
    const result = await collectOutputBundleArtifactPaths({
      output: {
        html_path: "result/deep-reading.html",
        artifact_manifest_path: "result/deep-reading-artifacts.json",
      },
      outputSchema,
      readArtifactText: async (path) => {
        assert.equal(path, "result/deep-reading-artifacts.json");
        return JSON.stringify({
          diagnostics: "result/sections/diagnostics.json",
          manifest: "result/deep-reading-manifest.json",
        });
      },
    });

    assert.deepEqual(result, {
      ok: true,
      paths: [
        "result/deep-reading-artifacts.json",
        "result/deep-reading-manifest.json",
        "result/deep-reading.html",
        "result/sections/diagnostics.json",
      ],
      diagnostics: [],
    });
  });

  it("rejects non-flat or unsafe artifact manifest values", function () {
    const result = validateFlatArtifactManifest({
      ok: "result/file.json",
      nested: { path: "result/nested.json" },
      absolute: "C:/tmp/file.json",
      escaping: "../file.json",
      empty: "",
    });

    assert.isFalse(result.ok);
    if (!result.ok) {
      assert.sameMembers(
        result.diagnostics.map((entry) => entry.path),
        ["nested", "absolute", "escaping", "empty"],
      );
    }
  });
});
