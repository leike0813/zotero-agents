import { assert } from "chai";
import { compileDeclarativeRequest } from "../../src/workflows/declarativeRequestCompiler";

describe("declarative request compiler guards", function () {
  it("defaults skillrunner declarative requests to local-package source", function () {
    const request = compileDeclarativeRequest({
      kind: "skillrunner.job.v1",
      selectionContext: {
        items: {
          attachments: [
            {
              filePath: "D:/fixtures/only.md",
              mimeType: "text/markdown",
              parent: { id: 103, title: "Parent C" },
            },
          ],
        },
      },
      manifest: {
        id: "default-local-package-source",
        label: "Default Local Package Source",
        provider: "skillrunner",
        request: {
          kind: "skillrunner.job.v1",
          create: {
            skill_id: "tag-regulator",
          },
        },
        hooks: {
          applyResult: "hooks/applyResult.js",
        },
      } as any,
    }) as {
      kind: string;
      skill_id: string;
      skill_source?: string;
    };

    assert.equal(request.kind, "skillrunner.job.v1");
    assert.equal(request.skill_id, "tag-regulator");
    assert.equal(request.skill_source, "local-package");
  });

  it("preserves explicit installed skillrunner source", function () {
    const request = compileDeclarativeRequest({
      kind: "skillrunner.job.v1",
      selectionContext: {
        items: {
          attachments: [
            {
              filePath: "D:/fixtures/only.md",
              mimeType: "text/markdown",
              parent: { id: 103, title: "Parent C" },
            },
          ],
        },
      },
      manifest: {
        id: "installed-package-source",
        label: "Installed Package Source",
        provider: "skillrunner",
        request: {
          kind: "skillrunner.job.v1",
          create: {
            skill_id: "tag-regulator",
            skill_source: "installed",
          },
        },
        hooks: {
          applyResult: "hooks/applyResult.js",
        },
      } as any,
    }) as {
      kind: string;
      skill_id: string;
      skill_source?: string;
    };

    assert.equal(request.kind, "skillrunner.job.v1");
    assert.equal(request.skill_id, "tag-regulator");
    assert.equal(request.skill_source, "installed");
  });

  it("builds skillrunner request with inline input alongside upload selectors", function () {
    const request = compileDeclarativeRequest({
      kind: "skillrunner.job.v1",
      selectionContext: {
        items: {
          attachments: [
            {
              filePath: "D:/fixtures/only.md",
              mimeType: "text/markdown",
              parent: { id: 103, title: "Parent C" },
              item: { id: 9001, key: "AAA111" },
            },
          ],
        },
      },
      manifest: {
        id: "inline-input-pass-through",
        label: "Inline Input Pass Through",
        provider: "skillrunner",
        request: {
          kind: "skillrunner.job.v1",
          create: {
            skill_id: "tag-regulator",
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
    }) as {
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

  it("Risk: HR-03 rejects selector cardinality violations for selected.markdown", function () {
    let thrown: unknown = null;

    try {
      compileDeclarativeRequest({
        kind: "skillrunner.job.v1",
        selectionContext: {
          items: {
            attachments: [
              {
                filePath: "D:/fixtures/a.md",
                mimeType: "text/markdown",
                parent: { id: 101, title: "Parent A" },
              },
              {
                filePath: "D:/fixtures/b.md",
                mimeType: "text/markdown",
                parent: { id: 101, title: "Parent A" },
              },
            ],
          },
        },
        manifest: {
          id: "hr03-selector-cardinality",
          label: "HR03 Selector Cardinality",
          provider: "skillrunner",
          request: {
            kind: "skillrunner.job.v1",
            create: {
              skill_id: "literature-digest",
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

  it("Risk: HR-03 rejects selector cardinality violations for selected.source", function () {
    let thrown: unknown = null;

    try {
      compileDeclarativeRequest({
        kind: "skillrunner.job.v1",
        selectionContext: {
          items: {
            attachments: [
              {
                filePath: "D:/fixtures/a.md",
                mimeType: "text/markdown",
                parent: { id: 101, title: "Parent A" },
              },
              {
                filePath: "D:/fixtures/a.pdf",
                mimeType: "application/pdf",
                parent: { id: 101, title: "Parent A" },
              },
            ],
          },
        },
        manifest: {
          id: "hr03-selector-source-cardinality",
          label: "HR03 Selector Source Cardinality",
          provider: "skillrunner",
          request: {
            kind: "skillrunner.job.v1",
            create: {
              skill_id: "literature-digest",
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

  it("Risk: HR-03 rejects duplicated upload file keys deterministically", function () {
    let thrown: unknown = null;

    try {
      compileDeclarativeRequest({
        kind: "skillrunner.job.v1",
        selectionContext: {
          items: {
            attachments: [
              {
                filePath: "D:/fixtures/only.md",
                mimeType: "text/markdown",
                parent: { id: 102, title: "Parent B" },
              },
            ],
          },
        },
        manifest: {
          id: "hr03-duplicate-upload-key",
          label: "HR03 Duplicate Upload Key",
          provider: "skillrunner",
          request: {
            kind: "skillrunner.job.v1",
            create: {
              skill_id: "literature-digest",
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

  it("Risk: HR-03 rejects generic-http.steps.v1 requests without steps", function () {
    let thrown: unknown = null;

    try {
      compileDeclarativeRequest({
        kind: "generic-http.steps.v1",
        selectionContext: {
          items: {
            attachments: [],
          },
        },
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

  it("builds generic-http.request.v1 without selection when trigger.requiresSelection is false", function () {
    const request = compileDeclarativeRequest({
      kind: "generic-http.request.v1",
      selectionContext: {
        items: {
          attachments: [],
          parents: [],
          children: [],
          notes: [],
        },
      },
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
    }) as {
      kind: string;
      targetParentID?: number;
      taskName: string;
      sourceAttachmentPaths: string[];
      request: {
        method: string;
        path: string;
        json: Record<string, unknown>;
      };
    };

    assert.equal(request.kind, "generic-http.request.v1");
    assert.isUndefined(request.targetParentID);
    assert.equal(request.taskName, "task");
    assert.deepEqual(request.sourceAttachmentPaths, []);
    assert.deepEqual(request.request, {
      method: "POST",
      path: "/v1/jobs",
      json: {
        workflow_id: "generic-http-no-selection",
        workflow_label: "Generic HTTP No Selection",
        attachment_paths: [],
      },
    });
  });
});
