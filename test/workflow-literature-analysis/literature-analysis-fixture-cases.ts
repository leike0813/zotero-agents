import multiMarkdownDiffParents from "../fixtures/selection-context/selection-context-multi-markdown-diff-parents.json";
import multiMarkdownNoPdf from "../fixtures/selection-context/selection-context-multi-markdown-no-pdf.json";
import multiMarkdownSameParent from "../fixtures/selection-context/selection-context-multi-markdown-same-parent.json";
import multiMarkdownWithParent from "../fixtures/selection-context/selection-context-multi-markdown-with-parent.json";
import singlePdf from "../fixtures/selection-context/selection-context-single-pdf.json";

export type LiteratureAnalysisFixtureCase = {
  name: string;
  context: unknown;
  expectedFilteredPaths: string[];
  expectedRequests: Array<{
    targetParentID: number;
    uploadPath: string;
  }>;
};

export const LITERATURE_ANALYSIS_FIXTURE_CASES: LiteratureAnalysisFixtureCase[] = [
  {
    name: "multi-markdown-diff-parents",
    context: multiMarkdownDiffParents as unknown,
    expectedFilteredPaths: [
      "attachments/LVBBEES6/Xiao 等 - 2025 - Rethinking detection based table structure recognition for visually rich document images.md",
      "attachments/NWU22TPK/Li 等 - 2022 - Panoptic SegFormer Delving Deeper Into Panoptic Segmentation With Transformers.md",
    ],
    expectedRequests: [
      {
        targetParentID: 76,
        uploadPath:
          "attachments/LVBBEES6/Xiao 等 - 2025 - Rethinking detection based table structure recognition for visually rich document images.md",
      },
      {
        targetParentID: 57,
        uploadPath:
          "attachments/NWU22TPK/Li 等 - 2022 - Panoptic SegFormer Delving Deeper Into Panoptic Segmentation With Transformers.md",
      },
    ],
  },
  {
    name: "multi-markdown-no-pdf",
    context: multiMarkdownNoPdf as unknown,
    expectedFilteredPaths: [
      "attachments/FKYDC77R/Li 等 - 2022 - Panoptic SegFormer Delving Deeper Into Panoptic Segmentation With Transformers_noPDF.md",
    ],
    expectedRequests: [
      {
        targetParentID: 249,
        uploadPath:
          "attachments/FKYDC77R/Li 等 - 2022 - Panoptic SegFormer Delving Deeper Into Panoptic Segmentation With Transformers_noPDF.md",
      },
    ],
  },
  {
    name: "multi-markdown-same-parent",
    context: multiMarkdownSameParent as unknown,
    expectedFilteredPaths: [
      "attachments/NWU22TPK/Li 等 - 2022 - Panoptic SegFormer Delving Deeper Into Panoptic Segmentation With Transformers.md",
    ],
    expectedRequests: [
      {
        targetParentID: 57,
        uploadPath:
          "attachments/NWU22TPK/Li 等 - 2022 - Panoptic SegFormer Delving Deeper Into Panoptic Segmentation With Transformers.md",
      },
    ],
  },
  {
    name: "multi-markdown-with-parent",
    context: multiMarkdownWithParent as unknown,
    expectedFilteredPaths: [
      "attachments/NWU22TPK/Li 等 - 2022 - Panoptic SegFormer Delving Deeper Into Panoptic Segmentation With Transformers.md",
    ],
    expectedRequests: [
      {
        targetParentID: 57,
        uploadPath:
          "attachments/NWU22TPK/Li 等 - 2022 - Panoptic SegFormer Delving Deeper Into Panoptic Segmentation With Transformers.md",
      },
    ],
  },
  {
    name: "single-pdf-fallback",
    context: singlePdf as unknown,
    expectedFilteredPaths: [
      "attachments/EXKUYHMH/Zhang 等 - 2022 - Accelerating DETR Convergence via Semantic-Aligned Matching.pdf",
    ],
    expectedRequests: [
      {
        targetParentID: 2,
        uploadPath:
          "attachments/EXKUYHMH/Zhang 等 - 2022 - Accelerating DETR Convergence via Semantic-Aligned Matching.pdf",
      },
    ],
  },
];
