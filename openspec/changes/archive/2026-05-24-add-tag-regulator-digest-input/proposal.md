## Why

`tag-regulator` 当前只把父条目元数据、已有标签和受控词表发送给 SkillRunner。对于已经运行过 literature digest 的条目，digest markdown 中包含方法、任务、贡献和上下文信息，能显著提升标签识别与建议质量。

## What Changes

- `tag-regulator` workflow 在构建请求时自动读取父条目下 digest note 的最新 embedded payload attachment。
- 当存在 `digest-markdown` payload 且内容非空时，将其作为可选 `input.digest_markdown` 上传给 SkillRunner。
- 找不到 digest payload 时保持现有请求不变，不提供用户开关，不增加 metadata 字段，不修改输出 schema。
- 产出一份面向 `$tag-regulator` skill 仓库的升级 proposal，但不在本仓库直接修改 submodule skill。

## Impact

- Affected workflow package: `tag-vocabulary-package/tag-regulator`.
- Affected tests: tag-regulator request-building coverage and builtin workflow manifest packaging.
- No behavior change for items without digest markdown embedded payload.
