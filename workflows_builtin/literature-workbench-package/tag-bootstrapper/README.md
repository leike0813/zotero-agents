# Tag Bootstrapper

## 用途

通过交互式 Skill-Runner skill 帮用户生成第一批受控标签，或在已有受控词表基础上追加新标签。

## 输入

- 当前 Synthesis tag vocabulary 中的 active entries
- 当前 TagVocab protocol，包括 facets、tag pattern、max tag length
- `tag_note_language` 参数，用于控制返回标签说明语言

## 输出与写入

workflow 读取后端返回的 `add_tags` 对象数组，并在 apply 阶段执行本地校验与去重：

- 与已有正式词表按 `tag.toLowerCase()` 去重
- 跳过本轮返回中的重复 tag
- 通过 Synthesis tag vocabulary service 写入正式受控词表
- 保留当前 aliases、abbrev、protocol

若后端返回 `error` 或输出结构非法，workflow 不写入词表。
