# Design

## Runtime Validation

`topic_synthesis_db.py` 会内置一个小型 JSON Schema 子集校验器，覆盖本 suite schema 中实际使用的关键字：`type`、`required`、`additionalProperties`、`properties`、`items`、`enum`、`minLength`、`minItems`、`minimum`、`maximum`、`anyOf`、`$defs` 和 `$ref`。

Schema validation 先执行，stage semantic validation 后执行。Schema 负责字段形状和值域，semantic validation 负责 runtime 真源约束，例如 `source_paper_refs` 必须来自当前 workset。

## Stage Boundaries

Gate 只校验当前 stage payload 与当前 runtime state。Stage 40 负责核心 artifact sections 的证据引用和核心字段；Stage 60 负责 coverage/external section 的必要字段；Stage 70 负责最终 summary 字段。Runtime 不从其他 stage 猜测缺失业务字段。

## Generated Packages

所有 generated packages 继续从 `skills_src/topic-synthesis` 渲染。`SKILL.md` 保持 current-state only，只描述当前 payload 要求。
