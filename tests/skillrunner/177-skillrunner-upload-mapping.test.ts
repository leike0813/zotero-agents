import { assert } from "chai";
import { buildSkillRunnerUploadRelativePath } from "../../src/providers/skillrunner/uploadMapping";

describe("SkillRunner upload mapping", function () {
  it("builds the uploads-root relative input path for a local file", function () {
    assert.equal(
      buildSkillRunnerUploadRelativePath(
        "source_path",
        "/tmp/notes/example.md",
      ),
      "inputs/source_path/example.md",
    );
  });

  it("uses the basename for Windows local paths", function () {
    assert.equal(
      buildSkillRunnerUploadRelativePath(
        "source_path",
        "C:\\Users\\leike\\paper.pdf",
      ),
      "inputs/source_path/paper.pdf",
    );
  });

  it("sanitizes file keys into safe path segments", function () {
    assert.equal(
      buildSkillRunnerUploadRelativePath("Source Path!", "/tmp/notes/a.md"),
      "inputs/Source-Path-/a.md",
    );
    assert.equal(
      buildSkillRunnerUploadRelativePath("a/b\\c", "/tmp/notes/a.md"),
      "inputs/a-b-c/a.md",
    );
    assert.equal(
      buildSkillRunnerUploadRelativePath("", "/tmp/notes/a.md"),
      "inputs/file/a.md",
    );
  });

  it("falls back to upload.bin when the local path has no basename", function () {
    assert.equal(
      buildSkillRunnerUploadRelativePath("source_path", ""),
      "inputs/source_path/upload.bin",
    );
    assert.equal(
      buildSkillRunnerUploadRelativePath("source_path", "/"),
      "inputs/source_path/upload.bin",
    );
  });

  it("uses the basename for relative and dotted local paths", function () {
    assert.equal(
      buildSkillRunnerUploadRelativePath("source_path", "./paper.pdf"),
      "inputs/source_path/paper.pdf",
    );
    assert.equal(
      buildSkillRunnerUploadRelativePath("source_path", "./notes/../paper.pdf"),
      "inputs/source_path/paper.pdf",
    );
  });
});
