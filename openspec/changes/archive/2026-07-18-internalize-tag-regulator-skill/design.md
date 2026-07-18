## Context

`skills_builtin/tag-regulator` 当前是指向独立仓库分支的 Git submodule，但其受控词表已由本插件 Synthesis TagVocab 提供，builtin workflow status 的实例保护也由非 submodule workflow apply hook 执行。skill 的 status 语义如果继续独立演进，会与插件 policy 和同仓库 Tag Bootstrapper 产生漂移。

该 skill 已是脚本辅助、机器契约型能力：LLM 负责语义归一化和推断，现有 Python 脚本负责确定性校验与排序，JSON Schema 约束 runner I/O。本次不改变这层架构。

## Goals / Non-Goals

**Goals:**

- 将当前 submodule 固定提交原样转为主仓库普通 tracked files。
- 让 Tag Regulator 与 Tag Bootstrapper 采用同一个 builtin status 治理分层。
- 保持 workflow、runner、Schema 和内容包路径兼容。
- 用契约测试防止 Tag Standard 与插件 builtin policy 再次漂移。

**Non-Goals:**

- 不导入 submodule Git 历史，不修改其他 submodule 或指针。
- 不新增 policy 文件、输入字段、数据库字段或 status 迁移。
- 不改变普通标签、自定义 `status:*`、建议标签 intake 或内容包安装协议。
- 不发布、提升内容包版本或提交 Git 变更。

## Decisions

1. **采用快照转换，不采用 subtree/history import。** 当前 submodule 提交 `3f4de54a367a3c8aa05897d925f3e6450ce89dc4` 是转换基线；移除 gitlink 和目录内 `.git` 指针后，将现有文件以普通文件加入主仓库。这样保留内容与路径，同时避免引入无关上游历史。
2. **插件 policy 继续作为唯一可执行事实源。** Tag Regulator 的 `SKILL.md` 和 Tag Standard 描述只读语义；workflow apply hook 通过 `statusTags.getPolicy()` 取得实际保护集合。Python 脚本、runner 与 Schema 不复制五个 tag 常量。
3. **保持 skill 契约不变。** `tag-regulator` ID、runner version、输入输出 Schema、脚本入口和 workflow request shape 均不变。builtin status 自然包含在插件导出的 `valid_tags` 中，但 skill 不输出对它们的增删或建议。
4. **Tag Standard 采用上游结构上的最小增量。** 以 `$HOME/Workspace/Code/Skill/tag_regulator/tag-regulator/references/tag_standard.md` 为内容基线，保留其中文结构、命名规则、Field 体系、治理流程与领域示例，只替换和删除与当前 workflow status policy 冲突的规则；Tag Regulator 与 Tag Bootstrapper 的最终文件必须完全一致。
5. **保持非独立发布。** 不把 Tag Regulator 加入 `skills_builtin/.public`；内容包构建器继续从 `skills_builtin/tag-regulator` 收集相同目录结构。

## Risks / Trade-offs

- **转换必须更新 Git index 才能把 gitlink 变为普通文件** → 只暂存 `.gitmodules` 与 Tag Regulator 路径，验收 index mode，不触碰其他未提交改动。
- **文档中列出五个 tag 可能随 policy 漂移** → 契约测试从插件 builtin policy 取得期望集合并与 reference 中的 `status:need-*` 对比。
- **模型仍可能违反 skill 指令输出 builtin status** → 保留现有 apply boundary 的确定性过滤与结构化 diagnostic，普通标签继续应用。
- **本地 `.git/modules` 留下缓存** → 不做破坏性清理；该缓存不参与仓库内容、打包或 checkout 行为。
