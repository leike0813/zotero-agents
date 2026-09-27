import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";
import { assert } from "chai";
import selectionContextSchema from "../../src/schemas/selectionContextSchema";
import { lockSelection } from "../../src/modules/selectionContext";

describe("selection-context schema", function () {
  const ajv = new Ajv({ allErrors: true, strict: true, logger: false });
  addFormats(ajv);
  const validate = ajv.compile(selectionContextSchema);
  it("accepts ordered canonical facts and rejects rich or incomplete identity", function () {
    const ref = { libraryId: 1, key: "PARENT01" };
    const context = lockSelection([
      { kind: "parent", ref, itemType: "journalArticle" },
    ]);
    assert.isTrue(validate(context), ajv.errorsText(validate.errors));
    for (const invalid of [
      { ...context, items: { parents: [] } },
      {
        ...context,
        items: [{ ...context.items[0], ref: { key: "PARENT01" } }],
      },
      {
        ...context,
        items: [{ ...context.items[0], filePath: "/private/file" }],
      },
    ])
      assert.isFalse(validate(invalid));
  });
});
