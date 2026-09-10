import { assert } from "chai";
import { createFailClosedZoteroHostCapabilityBroker } from "../helpers/zoteroHostCapabilityBrokerHarness";
import { compileDeclarativeRequest } from "../../src/workflows/declarativeRequestCompiler";

const uploadBroker = createFailClosedZoteroHostCapabilityBroker({
  library: {
    getItemDetail: async () => ({
      kind: "attachment",
      item: {
        ref: { libraryId: 1, key: "SOURCE01" },
        title: "Source",
        filename: "only.md",
        contentType: "text/markdown",
        url: null,
        linkMode: "imported_file",
        role: "ordinary",
        createdAt: "2026-01-01",
        file: { state: "available", path: "D:/fixtures/only.md" },
      },
    }),
  },
});

describe("declarative request compiler guards", function () {
  it("defaults skillrunner declarative requests to local-package source", async function () {
    const request = (await compileDeclarativeRequest({
      hostApi: uploadBroker,
      kind: "skillrunner.job.v1",
      selectionContext: {
        sampledAt: "2026-01-01",
        items: [
          {
            kind: "attachment",
            ref: { libraryId: 1, key: "SOURCE01" },
            parentRef: { libraryId: 1, key: "PARENT01" },
            itemType: "attachment",
            filename: "only.md",
            contentType: "text/markdown",
          },
        ],
      },
      manifest: {
        id: "default-local-package-source",
        label: "Default Local Package Source",
        provider: "skillrunner",
        request: {
          kind: "skillrunner.job.v1",
          create: {
            skill_id: "tag-regulator",
            mode: "auto",
          },
        },
        hooks: {
          applyResult: "hooks/applyResult.js",
        },
      } as any,
    })) as {
      kind: string;
      skill_id: string;
      skill_source?: string;
    };

    assert.equal(request.kind, "skillrunner.job.v1");
    assert.equal(request.skill_id, "tag-regulator");
    assert.equal(request.skill_source, "local-package");
  });

  it("preserves explicit installed skillrunner source", async function () {
    const request = (await compileDeclarativeRequest({
      hostApi: uploadBroker,
      kind: "skillrunner.job.v1",
      selectionContext: {
        sampledAt: "2026-01-01",
        items: [
          {
            kind: "attachment",
            ref: { libraryId: 1, key: "SOURCE01" },
            parentRef: { libraryId: 1, key: "PARENT01" },
            itemType: "attachment",
            filename: "only.md",
            contentType: "text/markdown",
          },
        ],
      },
      manifest: {
        id: "installed-package-source",
        label: "Installed Package Source",
        provider: "skillrunner",
        request: {
          kind: "skillrunner.job.v1",
          create: {
            skill_id: "tag-regulator",
            mode: "auto",
            skill_source: "installed",
          },
        },
        hooks: {
          applyResult: "hooks/applyResult.js",
        },
      } as any,
    })) as {
      kind: string;
      skill_id: string;
      skill_source?: string;
    };

    assert.equal(request.kind, "skillrunner.job.v1");
    assert.equal(request.skill_id, "tag-regulator");
    assert.equal(request.skill_source, "installed");
  });

  it("builds skillrunner request with inline input alongside upload selectors", async function () {
    const request = (await compileDeclarativeRequest({
      hostApi: uploadBroker,
      kind: "skillrunner.job.v1",
      selectionContext: {
        sampledAt: "2026-01-01",
        items: [
          {
            kind: "attachment",
            ref: { libraryId: 1, key: "SOURCE01" },
            parentRef: { libraryId: 1, key: "PARENT01" },
            itemType: "attachment",
            filename: "only.md",
            contentType: "text/markdown",
          },
        ],
      },
      manifest: {
        id: "inline-input-pass-through",
        label: "Inline Input Pass Through",
        provider: "skillrunner",
        request: {
          kind: "skillrunner.job.v1",
          create: {
            skill_id: "tag-regulator",
            mode: "auto",
          },
          input: {
            inline: {
              infer_tag: true,
              source: "workflow",
            },
            upload: {
              files: [
                {
                  key: "source_path",
                  from: "selected.source",
                },
              ],
            },
          },
        },
        hooks: {
          applyResult: "hooks/applyResult.js",
        },
      } as any,
      executionOptions: {
        workflowParams: {
          profile: "default",
        },
      },
    })) as {
      kind: string;
      skill_id: string;
      input?: Record<string, unknown>;
      upload_files: Array<{ key: string; path: string }>;
      parameter?: Record<string, unknown>;
    };

    assert.equal(request.kind, "skillrunner.job.v1");
    assert.equal(request.skill_id, "tag-regulator");
    assert.equal(
      (request as { skill_source?: string }).skill_source,
      "local-package",
    );
    assert.deepEqual(request.upload_files, [
      { key: "source_path", path: "D:/fixtures/only.md" },
    ]);
    assert.deepEqual(request.parameter, { profile: "default" });
    assert.deepEqual(request.input, {
      inline: {
        infer_tag: true,
        source: "workflow",
      },
      source_path: "inputs/source_path/only.md",
    });
  });

  it("Risk: HR-03 rejects selector cardinality violations for selected.markdown", async function () {
    let thrown: unknown = null;

    try {
      await compileDeclarativeRequest({
        hostApi: uploadBroker,
        kind: "skillrunner.job.v1",
        selectionContext: {
          sampledAt: "2026-01-01",
          items: [
            {
              kind: "attachment",
              ref: { libraryId: 1, key: "SOURCE01" },
              parentRef: { libraryId: 1, key: "PARENT01" },
              itemType: "attachment",
              filename: "a.md",
              contentType: "text/markdown",
            },
            {
              kind: "attachment",
              ref: { libraryId: 1, key: "SOURCE02" },
              parentRef: { libraryId: 1, key: "PARENT01" },
              itemType: "attachment",
              filename: "b.md",
              contentType: "text/markdown",
            },
          ],
        },
        manifest: {
          id: "hr03-selector-cardinality",
          label: "HR03 Selector Cardinality",
          provider: "skillrunner",
          request: {
            kind: "skillrunner.job.v1",
            create: {
              skill_id: "literature-analysis",
              mode: "auto",
            },
            input: {
              upload: {
                files: [
                  {
                    key: "md_path",
                    from: "selected.markdown",
                  },
                ],
              },
            },
          },
          hooks: {
            applyResult: "hooks/applyResult.js",
          },
        } as any,
      });
    } catch (error) {
      thrown = error;
    }

    assert.isOk(thrown);
    assert.match(
      String(thrown),
      /requires exactly 1 matched attachment, got 2/i,
    );
  });

  it("Risk: HR-03 rejects selector cardinality violations for selected.source", async function () {
    let thrown: unknown = null;

    try {
      await compileDeclarativeRequest({
        hostApi: uploadBroker,
        kind: "skillrunner.job.v1",
        selectionContext: {
          sampledAt: "2026-01-01",
          items: [
            {
              kind: "attachment",
              ref: { libraryId: 1, key: "SOURCE01" },
              parentRef: { libraryId: 1, key: "PARENT01" },
              itemType: "attachment",
              filename: "a.md",
              contentType: "text/markdown",
            },
            {
              kind: "attachment",
              ref: { libraryId: 1, key: "SOURCE02" },
              parentRef: { libraryId: 1, key: "PARENT01" },
              itemType: "attachment",
              filename: "a.pdf",
              contentType: "application/pdf",
            },
          ],
        },
        manifest: {
          id: "hr03-selector-source-cardinality",
          label: "HR03 Selector Source Cardinality",
          provider: "skillrunner",
          request: {
            kind: "skillrunner.job.v1",
            create: {
              skill_id: "literature-analysis",
              mode: "auto",
            },
            input: {
              upload: {
                files: [
                  {
                    key: "source_path",
                    from: "selected.source",
                  },
                ],
              },
            },
          },
          hooks: {
            applyResult: "hooks/applyResult.js",
          },
        } as any,
      });
    } catch (error) {
      thrown = error;
    }

    assert.isOk(thrown);
    assert.match(
      String(thrown),
      /requires exactly 1 matched attachment, got 2/i,
    );
  });

  it("Risk: HR-03 rejects duplicated upload file keys deterministically", async function () {
    let thrown: unknown = null;

    try {
      await compileDeclarativeRequest({
        hostApi: uploadBroker,
        kind: "skillrunner.job.v1",
        selectionContext: {
          sampledAt: "2026-01-01",
          items: [
            {
              kind: "attachment",
              ref: { libraryId: 1, key: "SOURCE01" },
              parentRef: { libraryId: 1, key: "PARENT01" },
              itemType: "attachment",
              filename: "only.md",
              contentType: "text/markdown",
            },
          ],
        },
        manifest: {
          id: "hr03-duplicate-upload-key",
          label: "HR03 Duplicate Upload Key",
          provider: "skillrunner",
          request: {
            kind: "skillrunner.job.v1",
            create: {
              skill_id: "literature-analysis",
              mode: "auto",
            },
            input: {
              upload: {
                files: [
                  {
                    key: "md_path",
                    from: "selected.markdown",
                  },
                  {
                    key: "md_path",
                    from: "selected.markdown",
                  },
                ],
              },
            },
          },
          hooks: {
            applyResult: "hooks/applyResult.js",
          },
        } as any,
      });
    } catch (error) {
      thrown = error;
    }

    assert.isOk(thrown);
    assert.match(String(thrown), /duplicated upload file key/i);
  });

  it("Risk: HR-03 rejects generic-http.steps.v1 requests without steps", async function () {
    let thrown: unknown = null;

    try {
      await compileDeclarativeRequest({
        hostApi: uploadBroker,
        kind: "generic-http.steps.v1",
        selectionContext: { sampledAt: "2026-01-01", items: [] },
        manifest: {
          id: "hr03-steps-missing",
          label: "HR03 Steps Missing",
          provider: "generic-http",
          request: {
            kind: "generic-http.steps.v1",
            steps: [],
          },
          hooks: {
            applyResult: "hooks/applyResult.js",
          },
        } as any,
      });
    } catch (error) {
      thrown = error;
    }

    assert.isOk(thrown);
    assert.match(String(thrown), /requires request\.steps\[\]/i);
  });

  it("builds generic-http.request.v1 without selection when trigger.requiresSelection is false", async function () {
    const request = (await compileDeclarativeRequest({
      hostApi: uploadBroker,
      kind: "generic-http.request.v1",
      selectionContext: { sampledAt: "2026-01-01", items: [] },
      manifest: {
        id: "generic-http-no-selection",
        label: "Generic HTTP No Selection",
        provider: "generic-http",
        trigger: {
          requiresSelection: false,
        },
        request: {
          kind: "generic-http.request.v1",
          http: {
            method: "POST",
            path: "/v1/jobs",
          },
        },
        hooks: {
          applyResult: "hooks/applyResult.js",
        },
      } as any,
    })) as {
      kind: string;
      targetParentRef?: number;
      taskName: string;
      sourceAttachmentRefs: string[];
      request: {
        method: string;
        path: string;
        json: Record<string, unknown>;
      };
    };

    assert.equal(request.kind, "generic-http.request.v1");
    assert.isUndefined(request.targetParentRef);
    assert.equal(request.taskName, "Workflow: Generic HTTP No Selection");
    assert.deepEqual(request.sourceAttachmentRefs, []);
    assert.deepEqual(request.request, {
      method: "POST",
      path: "/v1/jobs",
      json: {
        workflow_id: "generic-http-no-selection",
        workflow_label: "Generic HTTP No Selection",
        attachment_refs: [],
      },
    });
  });
});
