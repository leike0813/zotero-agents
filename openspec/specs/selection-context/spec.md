# selection-context Specification

## Purpose
TBD - created by archiving change m2-baseline. Update Purpose after archive.
## Requirements
### Requirement: 系统必须构建结构化 Selection Context
系统 MUST 将当前用户选择重建为统一的结构化上下文，作为 workflow 输入与请求编译的单一来源。

#### Scenario: 混合选择输入
- **WHEN** 用户选择包含 parent/item/attachment/note 的混合集合
- **THEN** 系统输出结构化 `selectionContext`
- **AND** 提供可用于后续 unit 拆分的稳定字段

### Requirement: 系统必须支持按 workflow 输入策略裁剪上下文
系统 MUST 支持按 workflow 的 `inputs.unit` 语义（如 parent/attachment/note）进行输入单元化处理。

#### Scenario: unit 裁剪
- **WHEN** workflow 声明了特定输入 unit
- **THEN** 系统按 unit 生成可执行的输入上下文
- **AND** 无合法单元时返回可解释的跳过结果

### Requirement: Selection context SHALL support every v2 atomic member kind
The planner SHALL support `selection`, `parent`, `child`, `attachment`, `note`, `generated-note`, and `digest-image-target` members and SHALL construct a scoped context for every emitted candidate.

#### Scenario: Selected child is a workflow input
- **WHEN** a workflow declares child members
- **THEN** the planner emits ordered child candidates with stable identities and parent relations when available

### Requirement: Related selection expansion SHALL be stable and deduplicated
`input-member` with `source: "related"` SHALL expand the target kind through stable SelectionContext relations and deduplicate candidates by identity while retaining first appearance.

#### Scenario: Parent and attachment both reference the same attachment
- **WHEN** related attachment expansion reaches one attachment through multiple selected objects
- **THEN** the planner emits that attachment once at its first deterministic position

### Requirement: Selection selector SHALL preserve the whole context
The `selection` selector SHALL emit exactly one whole-selection candidate and SHALL only be compatible with `member.kind: "selection"` and `grouping.mode: "all"`.

#### Scenario: Whole selection workflow
- **WHEN** a valid whole-selection manifest is planned
- **THEN** it emits one all-group unit containing the complete scoped SelectionContext

