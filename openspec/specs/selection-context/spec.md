# selection-context Specification

## Purpose
TBD - created by archiving change m2-baseline. Update Purpose after archive.
## Requirements
### Requirement: 系统必须构建结构化 Selection Context
系统 MUST 将 basis 一致的选择页或显式 portable refs 转为锁定的有序 canonical facts，作为 workflow 输入与请求编译的单一来源；不得包含 raw Zotero 对象、原生数字 ID、文件路径或按对象种类展开的 rich tree。

#### Scenario: 混合选择输入
- **WHEN** 用户选择包含 parent/item/attachment/note 的混合集合
- **THEN** 系统输出结构化 `selectionContext`
- **AND** 提供可用于后续 unit 拆分的稳定字段

### Requirement: 系统必须支持按 workflow 输入策略裁剪上下文
系统 MUST 支持按 workflow 的 `inputs.member` 与 `inputs.grouping` 语义（如 parent/attachment/note）进行输入单元化处理。

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
`input-member` with `source: "related"` SHALL expand the target kind through canonical library facts for the locked refs and deduplicate candidates by identity while retaining first appearance.

#### Scenario: Parent and attachment both reference the same attachment
- **WHEN** related attachment expansion reaches one attachment through multiple selected objects
- **THEN** the planner emits that attachment once at its first deterministic position

### Requirement: Selection selector SHALL preserve the whole context
The `selection` selector SHALL emit exactly one whole-selection candidate and SHALL only be compatible with `member.kind: "selection"` and `grouping.mode: "all"`.

#### Scenario: Whole selection workflow
- **WHEN** a valid whole-selection manifest is planned
- **THEN** it emits one all-group unit containing the complete scoped SelectionContext


### Requirement: Current view SHALL remain a lightweight context read
`context.getCurrentView` SHALL return normalized library-tree and view facts without embedding the complete selected-item snapshot. Collection path values SHALL remain display names rather than filesystem paths.

#### Scenario: Caller needs view and selected items
- **WHEN** a caller needs both current view facts and the serialized selection
- **THEN** it invokes the two explicit members and neither response contains raw host values

### Requirement: Selected items SHALL be exact basis-bound pages
`context.getSelectedItems` SHALL accept optional limit/cursor and trusted control, return items/returned/total/hasMore/nextCursor, default to 25 and allow at most 100 items per page. Each call SHALL bind its cursor to the current ordered exact ref sequence and after-index, hydrate only page items, and preserve child refs and parentRef without promotion, deduplication or sorting. It SHALL have no snapshot cap, TTL, selection cache or persistence.

#### Scenario: Parent and two child attachments are selected
- **WHEN** the ordered selection contains a parent and two of its attachments
- **THEN** pages retain all three exact refs in order, with the attachment parent refs

#### Scenario: Selection changes during acquisition
- **WHEN** current selection membership or order differs from the continuation basis
- **THEN** the page fails with basis_mismatch and the logical acquisition discards every collected page without automatic retry

#### Scenario: Source is unavailable or canceled
- **WHEN** the selected context cannot be read or trusted cancellation is observed
- **THEN** the call fails with a canonical error rather than reporting an empty or partial selection

#### Scenario: Selection exceeds the old snapshot size
- **WHEN** more than 10,000 items are selected
- **THEN** a valid page remains bounded to its effective limit and is not rejected by a snapshot-size cap
