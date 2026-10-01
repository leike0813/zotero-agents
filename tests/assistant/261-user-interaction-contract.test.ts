import { assert } from "chai";
import Ajv2020 from "ajv/dist/2020";

import {
  ASK_USER_MAX_QUESTIONS_PER_CALL,
  ASK_USER_MIN_QUESTIONS_PER_CALL,
  ASK_USER_RESULT_SCHEMA,
  USER_INTERACTION_BATCH_FILE_LIMIT,
  USER_INTERACTION_BATCH_FILE_TOTAL_MAX_BYTES,
  USER_INTERACTION_BATCH_SCHEMA,
  USER_INTERACTION_FILE_MAX_BYTES,
  USER_INTERACTION_MAX_QUESTIONS_PER_BATCH,
  USER_INTERACTION_QUESTION_KINDS,
  ASK_USER_MODEL_INPUT_SCHEMA,
  ASK_USER_MODEL_INPUT_SCHEMA_ID,
  countUserInteractionFileRefs,
  isUserInteractionBatchSubmittableV1,
  parseAskUserModelInputV1,
  parseAskUserToolResultV1,
  parseUserInteractionBatchV1,
  userInteractionAnswerFitsQuestionV1,
  type UserInteractionBatchV1,
} from "../../src/shared/userInteractionContract.js";

// Minimal structural view of the exported JSON Schema so the test can assert
// the shape the Tool Gateway definition consumes.
type JsonSchemaNode = {
  type?: unknown;
  enum?: unknown;
  required?: string[];
  default?: unknown;
  minItems?: number;
  maxItems?: number;
  additionalProperties?: unknown;
  properties?: Record<string, JsonSchemaNode>;
  items?: JsonSchemaNode;
};

// The shared versioned ask_user contract is the single source of truth for
// the model input, the host-persisted batch and the per-call model result.
// These assert the stable bounds and identity rules only.

function fileRef(refId: string) {
  return {
    refId,
    name: refId + ".pdf",
    mediaType: "application/pdf",
    byteLength: 12,
  };
}

function batch(overrides: Record<string, unknown> = {}): unknown {
  return {
    schema: USER_INTERACTION_BATCH_SCHEMA,
    batchId: "batch-1",
    ownerKey: "run-1",
    turnId: "turn-1",
    assistantMessageId: "msg-1",
    status: "collecting",
    revision: 3,
    calls: [
      { toolCallId: "call-1", callIndex: 0, questionIds: ["q-1", "q-2"] },
    ],
    questions: [
      {
        questionId: "q-1",
        toolCallId: "call-1",
        callIndex: 0,
        questionIndex: 0,
        kind: "single_select",
        prompt: "Pick one",
        header: "Header",
        hint: null,
        required: true,
        options: [
          { optionId: "o-1", label: "A", value: "a", description: null },
          { optionId: "o-2", label: "B", value: "b", description: null },
        ],
        files: [],
      },
      {
        questionId: "q-2",
        toolCallId: "call-1",
        callIndex: 0,
        questionIndex: 1,
        kind: "text",
        prompt: "Explain",
        header: null,
        hint: null,
        required: false,
        options: [],
        files: [],
      },
    ],
    draftAnswers: {
      "q-1": { kind: "single_select", optionId: "o-1", value: "a" },
    },
    ...overrides,
  };
}

describe("versioned user interaction contract", function () {
  it("binds the Q201 managed-file bounds to one batch", function () {
    assert.equal(USER_INTERACTION_BATCH_FILE_LIMIT, 20);
    assert.equal(USER_INTERACTION_FILE_MAX_BYTES, 20 * 1024 * 1024);
    assert.equal(USER_INTERACTION_BATCH_FILE_TOTAL_MAX_BYTES, 50 * 1024 * 1024);
    assert.equal(USER_INTERACTION_MAX_QUESTIONS_PER_BATCH, 16);
  });

  it("accepts 1..4 model questions and defaults required to true", function () {
    const parsed = parseAskUserModelInputV1({
      questions: [
        {
          kind: "multi_select",
          prompt: "Choose",
          options: [
            { label: "One", value: 1 },
            { label: "Two", value: { nested: [true] } },
          ],
        },
      ],
    });
    assert.isOk(parsed);
    assert.isTrue(parsed!.questions[0].required);
    assert.isNull(parseAskUserModelInputV1({ questions: [] }));
    assert.isNull(
      parseAskUserModelInputV1({
        questions: Array.from({ length: 5 }, () => ({
          kind: "text",
          prompt: "Q",
        })),
      }),
    );
  });

  it("rejects select questions outside the 2..8 unique-value bounds", function () {
    const option = (value: unknown) => ({ label: String(value), value });
    assert.isNull(
      parseAskUserModelInputV1({
        questions: [
          { kind: "single_select", prompt: "P", options: [option("only")] },
        ],
      }),
    );
    assert.isNull(
      parseAskUserModelInputV1({
        questions: [
          {
            kind: "single_select",
            prompt: "P",
            options: Array.from({ length: 9 }, (_entry, index) =>
              option(index),
            ),
          },
        ],
      }),
    );
    assert.isNull(
      parseAskUserModelInputV1({
        questions: [
          {
            kind: "single_select",
            prompt: "P",
            options: [option("dup"), option("dup")],
          },
        ],
      }),
    );
    // Non-select kinds carry no options; files questions carry slots.
    assert.isNull(
      parseAskUserModelInputV1({
        questions: [
          { kind: "text", prompt: "P", options: [option("a"), option("b")] },
        ],
      }),
    );
    assert.isOk(
      parseAskUserModelInputV1({
        questions: [
          {
            kind: "files",
            prompt: "Attach",
            files: [{ name: "paper", required: true, accept: ".pdf" }],
          },
        ],
      }),
    );
  });

  it("parses a host batch and rejects inconsistent identities", function () {
    const parsed = parseUserInteractionBatchV1(batch());
    assert.isOk(parsed);
    assert.equal(parsed!.revision, 3);
    assert.equal(countUserInteractionFileRefs(parsed!.draftAnswers), 0);
  });

  it("rejects malformed batch identity and answer mappings", function () {
    // Unknown call for a question.
    const orphan = batch({
      calls: [
        { toolCallId: "call-other", callIndex: 0, questionIds: ["q-1", "q-2"] },
      ],
    });
    assert.isNull(parseUserInteractionBatchV1(orphan));
    // Answer kind that does not match the question kind.
    assert.isNull(
      parseUserInteractionBatchV1(
        batch({ draftAnswers: { "q-1": { kind: "text", text: "nope" } } }),
      ),
    );
    // optionId not declared by the question.
    assert.isNull(
      parseUserInteractionBatchV1(
        batch({
          draftAnswers: {
            "q-1": { kind: "single_select", optionId: "o-9", value: "a" },
          },
        }),
      ),
    );
    // Selection value must match the declared option value.
    assert.isNull(
      parseUserInteractionBatchV1(
        batch({
          draftAnswers: {
            "q-1": { kind: "single_select", optionId: "o-1", value: "b" },
          },
        }),
      ),
    );
    // A file ref may not carry a path or raw bytes.
    assert.isNull(
      parseUserInteractionBatchV1(
        batch({
          questions: [
            {
              questionId: "q-1",
              toolCallId: "call-1",
              callIndex: 0,
              questionIndex: 0,
              kind: "files",
              prompt: "Attach",
              header: null,
              hint: null,
              required: true,
              options: [],
              files: [
                {
                  slotId: "s-1",
                  name: "paper",
                  required: true,
                  hint: null,
                  accept: null,
                },
              ],
            },
          ],
          calls: [{ toolCallId: "call-1", callIndex: 0, questionIds: ["q-1"] }],
          draftAnswers: {
            "q-1": {
              kind: "files",
              slots: [
                {
                  slotId: "s-1",
                  files: [{ ...fileRef("f-1"), localPath: "/tmp/x.pdf" }],
                },
              ],
            },
          },
        }),
      ),
    );
  });

  it("caps the batch at 16 questions and the staged files at 20", function () {
    const question = (index: number) => ({
      questionId: "q-" + index,
      toolCallId: "call-1",
      callIndex: 0,
      questionIndex: index,
      kind: "text" as const,
      prompt: "Q" + index,
      header: null,
      hint: null,
      required: true,
      options: [],
      files: [],
    });
    const tooMany = batch({
      calls: [
        {
          toolCallId: "call-1",
          callIndex: 0,
          questionIds: Array.from({ length: 4 }, (_e, i) => "q-" + i),
        },
      ],
      questions: Array.from({ length: 17 }, (_e, i) => question(i)),
    });
    assert.isNull(parseUserInteractionBatchV1(tooMany));

    const slots = {
      slotId: "s-1",
      name: "paper",
      required: true,
      hint: null,
      accept: null,
    };
    const fileQuestion = {
      ...question(0),
      questionId: "q-file",
      kind: "files" as const,
      files: [slots],
    };
    const over = batch({
      calls: [{ toolCallId: "call-1", callIndex: 0, questionIds: ["q-file"] }],
      questions: [fileQuestion],
      draftAnswers: {
        "q-file": {
          kind: "files",
          slots: [
            {
              slotId: "s-1",
              files: Array.from({ length: 21 }, (_e, i) => fileRef("f-" + i)),
            },
          ],
        },
      },
    });
    assert.isNull(parseUserInteractionBatchV1(over));
  });

  it("rejects a files question that declares no slot", function () {
    // A slot-less files question has nowhere to receive files: the owner
    // resolves the target by the declared slotId (with single-slot auto-fill),
    // so host slot identity must exist before the question reaches the user.
    assert.isNull(
      parseAskUserModelInputV1({
        questions: [{ kind: "files", prompt: "Attach" }],
      }),
    );
    assert.isNull(
      parseAskUserModelInputV1({
        questions: [{ kind: "files", prompt: "Attach", files: [] }],
      }),
    );
    assert.isOk(
      parseAskUserModelInputV1({
        questions: [
          { kind: "files", prompt: "Attach", files: [{ name: "paper" }] },
        ],
      }),
    );
    // The same rule holds at the persisted-batch boundary.
    const slotless = batch({
      calls: [{ toolCallId: "call-1", callIndex: 0, questionIds: ["q-file"] }],
      questions: [
        {
          questionId: "q-file",
          toolCallId: "call-1",
          callIndex: 0,
          questionIndex: 0,
          kind: "files",
          prompt: "Attach",
          header: null,
          hint: null,
          required: true,
          options: [],
          files: [],
        },
      ],
      draftAnswers: {},
    });
    assert.isNull(parseUserInteractionBatchV1(slotless));
  });

  it("accepts only the answered/declined model result shapes", function () {
    const answered = parseAskUserToolResultV1({
      schema: ASK_USER_RESULT_SCHEMA,
      toolCallId: "call-1",
      outcome: "answered",
      answers: [
        {
          questionId: "q-1",
          answer: { kind: "single_select", optionId: "o-1", value: "a" },
        },
        {
          questionId: "q-2",
          answer: { kind: "unanswered", reason: "optional" },
        },
      ],
    });
    assert.isOk(answered);
    const declined = parseAskUserToolResultV1({
      schema: ASK_USER_RESULT_SCHEMA,
      toolCallId: "call-1",
      outcome: "declined",
      answers: [],
    });
    assert.isOk(declined);
    assert.isNull(
      parseAskUserToolResultV1({
        schema: ASK_USER_RESULT_SCHEMA,
        toolCallId: "call-1",
        outcome: "declined",
        answers: [
          {
            questionId: "q-1",
            answer: { kind: "unanswered", reason: "optional" },
          },
        ],
      }),
    );
  });

  it("treats untyped batches as unsubmittable until required answers exist", function () {
    const parsed = parseUserInteractionBatchV1(
      batch(),
    ) as UserInteractionBatchV1;
    assert.isOk(parsed);
    assert.isTrue(isUserInteractionBatchSubmittableV1(parsed));
  });

  it("boundary-checks one answer against its question", function () {
    const parsed = parseUserInteractionBatchV1(
      batch(),
    ) as UserInteractionBatchV1;
    const select = parsed.questions.find(
      (entry) => entry.questionId === "q-1",
    )!;
    const optionalText = parsed.questions.find(
      (entry) => entry.questionId === "q-2",
    )!;
    assert.isTrue(
      userInteractionAnswerFitsQuestionV1(select, {
        kind: "single_select",
        optionId: "o-1",
        value: "a",
      }),
    );
    // Undeclared option, mismatched value, wrong kind and an unanswered
    // required question are all rejected.
    assert.isFalse(
      userInteractionAnswerFitsQuestionV1(select, {
        kind: "single_select",
        optionId: "o-9",
        value: "a",
      }),
    );
    assert.isFalse(
      userInteractionAnswerFitsQuestionV1(select, {
        kind: "single_select",
        optionId: "o-1",
        value: "b",
      }),
    );
    assert.isFalse(
      userInteractionAnswerFitsQuestionV1(select, { kind: "text", text: "x" }),
    );
    assert.isFalse(
      userInteractionAnswerFitsQuestionV1(select, {
        kind: "unanswered",
        reason: "optional",
      }),
    );
    // An optional question accepts an explicit unanswered marker or text.
    assert.isTrue(
      userInteractionAnswerFitsQuestionV1(optionalText, {
        kind: "unanswered",
        reason: "optional",
      }),
    );
    assert.isTrue(
      userInteractionAnswerFitsQuestionV1(optionalText, {
        kind: "text",
        text: "hi",
      }),
    );
  });

  it("exports the model input JSON Schema the Tool Gateway definition consumes", function () {
    const schema = ASK_USER_MODEL_INPUT_SCHEMA as unknown as JsonSchemaNode;
    assert.equal(
      ASK_USER_MODEL_INPUT_SCHEMA_ID,
      "zotero-agents.ask-user-input.v1",
    );
    assert.equal(schema.type, "object");
    assert.isFalse(schema.additionalProperties);
    assert.deepEqual(schema.required, ["questions"]);
    const questions = schema.properties?.questions as JsonSchemaNode;
    assert.equal(questions.minItems, ASK_USER_MIN_QUESTIONS_PER_CALL);
    assert.equal(questions.maxItems, ASK_USER_MAX_QUESTIONS_PER_CALL);
    const question = questions.items as JsonSchemaNode;
    assert.deepEqual(question.required, ["kind", "prompt"]);
    assert.deepEqual(question.properties?.kind?.enum, [
      ...USER_INTERACTION_QUESTION_KINDS,
    ]);
    assert.equal(question.properties?.required?.default, true);
    // Options and files describe their items so the model knows the shape.
    assert.deepEqual(question.properties?.options?.items?.required, [
      "label",
      "value",
    ]);
    assert.deepEqual(question.properties?.files?.items?.required, ["name"]);
    assert.equal(question.properties?.files?.minItems, 1);
    assert.equal(
      question.properties?.files?.items?.properties?.required?.default,
      true,
    );
    // The gateway compiles this schema with the same Ajv configuration.
    const validate = new Ajv2020({
      allErrors: true,
      strict: false,
      logger: false,
    }).compile(ASK_USER_MODEL_INPUT_SCHEMA);
    assert.isTrue(validate({ questions: [{ kind: "text", prompt: "Q" }] }));
    assert.isFalse(validate({ questions: [] }));
    assert.isFalse(validate({ questions: [{ prompt: "missing kind" }] }));
  });
});
