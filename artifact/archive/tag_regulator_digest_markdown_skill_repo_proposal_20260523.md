# Proposal: `$tag-regulator` 支持可选 digest markdown 输入

## 背景

Zotero-Skills 主仓库的 `tag-regulator` workflow 将在父条目存在 literature digest 生成的 `digest-markdown` embedded payload 时，自动把 digest markdown 上传给 SkillRunner：

```json
{
  "input": {
    "metadata": {},
    "input_tags": [],
    "valid_tags": "inputs/valid_tags/valid_tags.yaml",
    "digest_markdown": "inputs/digest_markdown/digest.md"
  }
}
```

该字段是可选增强上下文；没有该字段时，skill 必须保持原行为。

## 建议修改

- 在 `SKILL.md` 的 payload 说明中新增 `{{ input.digest_markdown }}`：可选 Markdown 文件路径，内容来自当前论文的 digest。
- Step 0 读取 payload 时，若 `digest_markdown` 缺失、为空、不可读或编码异常，不应失败；记录 warning 或直接忽略均可。
- 在 `infer_tag=true` 且 digest 可用时，将 digest markdown 作为 metadata 之后的补充语义证据，用于识别研究领域、任务、方法、模型、数据、实验对象和贡献。
- 决策优先级建议为：受控词表约束最高；当前 `input_tags` 和 Zotero metadata 其次；digest markdown 用于补足摘要缺失、细化方法/任务、提高 suggest_tags 的 note 质量。
- 输出 schema 不变，仍只输出一个 JSON 对象，且必须保持：
  - `add_tags ⊆ valid_tags`
  - `remove_tags ⊆ input_tags`
  - `suggest_tags[].tag` 不属于 `valid_tags`

## 非目标

- 不新增 `digest_markdown_meta`。
- 不修改 stdout JSON schema。
- 不要求 digest markdown 存在。
- 不允许 digest 内容绕过受控词表约束直接写入 `add_tags`。
