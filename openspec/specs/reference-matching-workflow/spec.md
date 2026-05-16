# reference-matching-workflow Specification

## Purpose
TBD - created by archiving change add-reference-matching-workflow. Update Purpose after archive.
## Requirements
### Requirement: 系统必须提供 reference-matching workflow
系统 MUST 提供一个基于 `pass-through` provider 的 workflow，用于处理 references 笔记中的参考文献匹配与回写。

#### Scenario: Workflow 执行入口
- **WHEN** 用户在 Zotero 中执行 reference-matching workflow
- **THEN** workflow 使用 `pass-through` provider 本地执行
- **AND** 不依赖远端后端请求

### Requirement: Workflow 必须仅接受 literature-digest references 笔记作为合法输入
系统 MUST 在 `filterInputs` 阶段拒绝非 references 笔记，避免误处理普通笔记或其他条目。

#### Scenario: 合法 references 输入
- **WHEN** 选中笔记包含 `data-zs-note-kind="references"` 或 `data-zs-payload="references-json"`
- **THEN** 该输入被保留并进入 applyResult

#### Scenario: 非法输入
- **WHEN** 选中项不是 references 笔记
- **THEN** 该输入被过滤
- **AND** workflow 不执行匹配回写

### Requirement: 系统必须可解码 references payload 并恢复结构化 JSON
系统 MUST 从 references 笔记中解析 payload block，完成解码并获取原始参考文献 JSON 结构。

#### Scenario: 成功解码 payload
- **WHEN** payload block 存在且编码合法
- **THEN** 系统得到可迭代的 references 列表用于匹配

#### Scenario: payload 异常
- **WHEN** payload 缺失、编码损坏或 JSON 非法
- **THEN** 系统终止当前输入处理并返回明确错误
- **AND** 不写入部分回填结果

### Requirement: 系统必须为每条参考文献执行高置信匹配并在父条目写入关联引用
系统 MUST 在 references note 回填 citekey 后，将命中的库内文献条目作为 related items 写入该 note 的父条目。

#### Scenario: 匹配成功后同步更新父条目关联
- **WHEN** references note 中一条或多条参考文献被高置信匹配到库内条目
- **THEN** 系统 SHALL 回填 citekey 到 payload/表格
- **AND** 系统 SHALL 将对应命中条目关联到该 references note 的父条目

#### Scenario: 仅部分匹配成功
- **WHEN** 仅部分参考文献命中
- **THEN** 系统 SHALL 仅为命中项写入父条目关联
- **AND** 未命中项 SHALL NOT 创建关联

#### Scenario: references note 无父条目
- **WHEN** 输入 references note 无可解析父条目
- **THEN** 系统 SHALL 跳过关联写入
- **AND** 保持 citekey 回填流程的可预期行为（不因关联阶段崩溃）

### Requirement: 父条目关联写入必须幂等
系统 MUST 以幂等方式维护父条目 related items，重复执行同一 workflow 不得重复添加同一关联。

#### Scenario: 重复执行同一输入
- **WHEN** 对同一 references note 重复执行 reference-matching
- **THEN** 已存在的 related item SHALL NOT 被重复添加
- **AND** 父条目关联集合在重复执行后保持稳定

#### Scenario: 父条目已存在部分关联
- **WHEN** 父条目已含本次命中集合的子集
- **THEN** 系统 SHALL 仅补齐缺失关联
- **AND** 已存在关联保持不变

### Requirement: 系统必须覆盖回写 references 笔记并保持既有格式骨架
系统 MUST 在匹配完成后覆盖回写该 notes 内容，同时保持原有外层结构与头部语义（如 note-kind 与 payload block 形态）不被破坏。

#### Scenario: 回写完成
- **WHEN** 本次匹配处理结束
- **THEN** 笔记中 payload JSON 与 HTML 表格均反映最新 citekey
- **AND** 文件头与结构化容器保持兼容

### Requirement: 系统必须支持可试错的数据源策略并在关键分歧处请求决策
系统 MUST 优先尝试 Zotero JavaScript API 进行全库匹配；若不可满足要求，可回退 Better BibTeX JSON 接口。遇到无法自动抉择的关键分歧时，agent MUST 反馈并请求用户决策。

#### Scenario: Zotero API 可用
- **WHEN** Zotero JavaScript API 可完成全库匹配需求
- **THEN** 系统优先使用该路径

#### Scenario: Zotero API 不可满足
- **WHEN** 实现验证确认 Zotero API 路径不可满足稳定性或性能要求
- **THEN** 系统切换到 Better BibTeX JSON 路径
- **AND** 记录切换原因

#### Scenario: 分歧无法自动决策
- **WHEN** 两条路径均有显著权衡且无明确最优
- **THEN** agent 向用户反馈现状并请求决策后再继续实现

### Requirement: Reference matching MUST record freshness baselines

After a successful `reference-matching` run, the system SHALL store baseline
metadata inside the `references-json` payload without changing the canonical
references array structure.

#### Scenario: Baseline is written after matching

- **WHEN** reference matching completes successfully for a references note
- **THEN** the payload SHALL include `reference_matching` metadata
- **AND** the metadata SHALL include the current input hash, settings hash,
  Zotero metadata library snapshot hash, result hash, workflow version, and
  matched timestamp
- **AND** the visible references table SHALL remain synchronized with the
  payload references.

### Requirement: Fresh reference matching inputs MUST be gated out

The system SHALL compare current references input, workflow settings, and Zotero
metadata library snapshot hashes with the stored baseline during `filterInputs`.

#### Scenario: Fresh note is filtered

- **GIVEN** a selected references note has a valid baseline
- **AND** the current input hash, settings hash, and library snapshot hash match
  that baseline
- **WHEN** `reference-matching` builds requests
- **THEN** the note SHALL be filtered out
- **AND** no matching rewrite request SHALL be created for that note.

#### Scenario: Changed note remains executable

- **GIVEN** a selected references note has a valid baseline
- **WHEN** the references input hash differs from the baseline
- **THEN** the note SHALL remain a legal input for matching.

#### Scenario: Changed settings remain executable

- **GIVEN** a selected references note has a valid baseline
- **WHEN** the current workflow settings hash differs from the baseline
- **THEN** the note SHALL remain a legal input for matching.

#### Scenario: Changed library snapshot remains executable

- **GIVEN** a selected references note has a valid baseline
- **WHEN** the current Zotero metadata library snapshot hash differs from the
  baseline
- **THEN** the note SHALL remain a legal input for matching.

#### Scenario: Legacy or damaged baseline remains executable

- **WHEN** a selected references note has no baseline, an unreadable baseline, or
  a payload that cannot be safely checked
- **THEN** the note SHALL remain a legal input
- **AND** the apply phase SHALL handle matching or report the concrete error.
