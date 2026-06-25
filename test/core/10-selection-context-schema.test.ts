import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { assert } from "chai";
import selectionContextSchema from "../../src/schemas/selectionContextSchema";
import dualParent from "../fixtures/selection-context/selection-context-dual-parent.json";
import mixAll from "../fixtures/selection-context/selection-context-mix-all.json";
import multiAttachDiffParents from "../fixtures/selection-context/selection-context-multi-attach-diff-parents.json";
import multiAttachSameParent from "../fixtures/selection-context/selection-context-multi-attach-same-parent.json";
import multiMarkdownDiffParents from "../fixtures/selection-context/selection-context-multi-markdown-diff-parents.json";
import multiMarkdownNoPdf from "../fixtures/selection-context/selection-context-multi-markdown-no-pdf.json";
import multiMarkdownSameParent from "../fixtures/selection-context/selection-context-multi-markdown-same-parent.json";
import multiMarkdownWithParent from "../fixtures/selection-context/selection-context-multi-markdown-with-parent.json";
import multiPdfAndMd from "../fixtures/selection-context/selection-context-multi-pdf-and-md.json";
import orphanNote from "../fixtures/selection-context/selection-context-orphan-note.json";
import singleMarkdown from "../fixtures/selection-context/selection-context-single-markdown.json";
import singleParent from "../fixtures/selection-context/selection-context-single-parent.json";
import singlePdf from "../fixtures/selection-context/selection-context-single-pdf.json";
import variousTypeAttachDiffParents from "../fixtures/selection-context/selection-context-various-type-attach-diff-parents.json";
import variousTypeAttachSameParent from "../fixtures/selection-context/selection-context-various-type-attach-same-parent.json";
import { isFullTestMode } from "./testMode";

const describeSchemaSuite = isFullTestMode() ? describe : describe.skip;

describeSchemaSuite("selection-context schema", function () {
  it("validates all selection context fixtures", async function () {
    const ajv = new Ajv({ allErrors: true, strict: true, logger: false });
    addFormats(ajv);
    const validate = ajv.compile(selectionContextSchema);

    const fixtures = [
      {
        name: "selection-context-dual-parent.json",
        data: dualParent,
      },
      {
        name: "selection-context-mix-all.json",
        data: mixAll,
      },
      {
        name: "selection-context-multi-attach-diff-parents.json",
        data: multiAttachDiffParents,
      },
      {
        name: "selection-context-multi-attach-same-parent.json",
        data: multiAttachSameParent,
      },
      {
        name: "selection-context-multi-markdown-diff-parents.json",
        data: multiMarkdownDiffParents,
      },
      {
        name: "selection-context-multi-markdown-no-pdf.json",
        data: multiMarkdownNoPdf,
      },
      {
        name: "selection-context-multi-markdown-same-parent.json",
        data: multiMarkdownSameParent,
      },
      {
        name: "selection-context-multi-markdown-with-parent.json",
        data: multiMarkdownWithParent,
      },
      {
        name: "selection-context-multi-pdf-and-md.json",
        data: multiPdfAndMd,
      },
      {
        name: "selection-context-orphan-note.json",
        data: orphanNote,
      },
      {
        name: "selection-context-single-markdown.json",
        data: singleMarkdown,
      },
      {
        name: "selection-context-single-parent.json",
        data: singleParent,
      },
      {
        name: "selection-context-single-pdf.json",
        data: singlePdf,
      },
      {
        name: "selection-context-various-type-attach-diff-parents.json",
        data: variousTypeAttachDiffParents,
      },
      {
        name: "selection-context-various-type-attach-same-parent.json",
        data: variousTypeAttachSameParent,
      },
    ];

    const failures: string[] = [];
    for (const fixture of fixtures) {
      if (!validate(fixture.data)) {
        failures.push(`${fixture.name}: ${ajv.errorsText(validate.errors)}`);
      }
    }

    assert.isTrue(
      failures.length === 0,
      `Invalid fixtures:\n${failures.join("\n")}`,
    );
  });
});
