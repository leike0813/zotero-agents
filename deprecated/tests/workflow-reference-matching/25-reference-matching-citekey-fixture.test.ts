import { assert } from "chai";
import notePayloadFixture from "../fixtures/workflow-reference-matching/mix-all-reference-note-payload.json";
import bbtCitekeyFixture from "../fixtures/workflow-reference-matching/mix-all-bbt-citekeys-23124.json";
import { __referenceMatchingTestOnly } from "../../workflows_builtin/literature-workbench-package/reference-matching/hooks/applyResult.mjs";

type ReferenceFixtureEntry = {
  id: string;
  title: string;
  year: string;
  author: string[];
  rawText: string;
};

type BbtSnapshotItem = {
  itemKey: string;
  citekey: string;
  title: string;
};

describe("reference-matching citekey generation (fixture-based)", function () {
  it("reproduces mix-all note vs BBT snapshot comparison deterministically", function () {
    const template = String(notePayloadFixture.template || "").trim();
    assert.isNotEmpty(template, "template should exist in note fixture");

    const references = (notePayloadFixture.references ||
      []) as ReferenceFixtureEntry[];
    const bbtItems = (bbtCitekeyFixture.items || []) as BbtSnapshotItem[];
    assert.lengthOf(references, 22, "mix-all note fixture should have 22 references");
    assert.lengthOf(bbtItems, 22, "bbt snapshot fixture should have 22 items");

    const normalizeTitle = (text: string) =>
      String(text || "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/&amp;/g, " and ")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");

    const bbtMap = new Map<string, string>();
    for (const item of bbtItems) {
      bbtMap.set(normalizeTitle(item.title), String(item.citekey || "").trim());
    }

    const rows = references.map((reference) => {
      const predicted = __referenceMatchingTestOnly.buildPredictedCitekey(
        reference,
        template,
      );
      const actual = String(bbtMap.get(normalizeTitle(reference.title)) || "").trim();
      return {
        id: reference.id,
        title: reference.title,
        predicted,
        actual,
      };
    });

    const matched = rows.filter((entry) => entry.predicted === entry.actual);
    const mismatched = rows.filter((entry) => entry.predicted !== entry.actual);
    assert.lengthOf(matched, 12);
    assert.lengthOf(mismatched, 10);

    const mismatchTitles = mismatched
      .map((entry) => entry.title)
      .sort((a, b) => a.localeCompare(b));
    assert.deepEqual(mismatchTitles, [
      "An End-to-End Transformer Model for 3D Object Detection",
      "DAB-DETR: Dynamic Anchor Boxes are Better Queries for DETR",
      "DN-DETR: Accelerate DETR Training by Introducing Query DeNoising",
      "End-to-End Object Detection with Transformers",
      "Faster R-CNN: Towards Real-Time Object Detection with Region Proposal Networks",
      "LW-DETR: A Transformer Replacement to YOLO for Real-Time Detection",
      "MOTR: End-to-End Multiple-Object Tracking with Transformer",
      "Panoptic SegFormer: Delving Deeper Into Panoptic Segmentation With Transformers_noPDF",
      "RF-DETR: Neural Architecture Search for Real-Time Detection Transformers",
      "RT-DETRv3: Real-time End-to-End Object Detection with Hierarchical Dense Positive Supervision",
    ]);

    const conditionalDetr = rows.find(
      (entry) => entry.title === "Conditional DETR for Fast Training Convergence",
    );
    assert.isOk(conditionalDetr);
    assert.equal(
      conditionalDetr?.predicted,
      "meng_conditional-detr_2021",
      "Conditional DETR should produce expected predicted citekey",
    );
    assert.equal(
      conditionalDetr?.actual,
      "meng_conditional-detr_2021",
      "Conditional DETR should match BBT citekey in snapshot",
    );
  });
});
