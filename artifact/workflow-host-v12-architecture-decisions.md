# Workflow Host v12 Architecture Decision Record

> 状态：方案已完成集中式契约闭合、最终架构审阅与 OpenSpec implementation topology 落地。
> 最近更新：2026-08-29
> 当前阶段：OpenSpec 实施工件已就绪；尚未开始 production/test code 实施。
> 来源：`/tmp/architecture-review-20260825-122610.html` 的 candidate 06、随后开展的 Workflow Host v12 hardening 讨论，以及 2026-08-27 的 runtime adapter deepening 审阅。

## 1. 工件用途

本文件记录本轮已经确认的架构决策、被推翻或明确排除的方案、实现前置条件和仍待讨论的问题。后续讨论每确认一项，就直接更新本文件，避免依赖对话上下文还原设计。

本文件是跨 change 的架构决策与依赖总图，不替代各 OpenSpec change 的 proposal、delta specs、design 与 tasks，也不授权提交、切换分支、改写 Git 历史或发布。代码实施必须以本文件记录的固定 baseline 与 OpenSpec tasks 为共同约束。

## 2. Git 与实现基线

### 2.1 已核实的分支状态

- 当前工作分支：`dev`
- 当前 `dev` 与 `origin/dev`：`4dbddc24e884921262c559428bf851db5eadf2d7`
- 本地 `dev-refactor` 与 `origin/dev-refactor`：`57325c375e4896df2e8e5016241b7d80fd8cb878`
- `dev-refactor` 是当前 `dev` 的祖先；两者 merge base 为 `57325c375e4896df2e8e5016241b7d80fd8cb878`，ahead/behind 为 `0/3`。
- `dev` 已包含 `35f2f77d`（合入 `dev-refactor`）、`5505a789` 与 `4dbddc24`，也包含此前四个 Host hardening commits：`979d76a5`、`82322737`、`e6e3a678`、`63658067`。
- 旧 `integration/dev-into-dev-refactor` worktree 仍指向 `455d7e4466a8b7ab816312b57774abd09b1be53d`；它不再是本轮 baseline 来源。
- 本轮固定实现 baseline `B` 为 `4dbddc24e884921262c559428bf851db5eadf2d7`。当前工作区中不属于该 commit 的既有未提交改动不进入 `B`，也不得被本轮 change 覆盖或回滚。

### 2.2 已确认的实施前置条件

此前要求的 `dev`/`dev-refactor` 集成结果已经进入当前 `dev`。本轮不再执行旧 integration worktree 的 merge、fast-forward 或分支切换，而是直接固定当前 `dev` HEAD 为 `B`，并以它完成 OpenSpec implementation topology。

后续代码实施必须：

1. 从 `B` 的 production seam 出发核对每个 change 的 file-level tasks；若在当前脏工作区实施，先逐文件确认不会覆盖用户改动，更稳妥的执行方式是在以 `B` 为基础的独立 clean task worktree 中完成各切片。
2. 保留 Rust Synthesis sidecar ownership、Broker SSOT、runtime late binding、Research Bundle deepening 与 Contract Identity；这些事实已经共同存在于 `B`。
3. 每个切片遵循 tasks 中的 TDD 顺序，并运行该切片的最小必要门禁。
4. 只有所有前置切片完成后，才执行 `harden-workflow-host-api-v12` 的原子 v12 activation。

## 3. 总体目标与 seam

### 3.1 v12 的目标

本轮工作已经从 candidate 06 扩展为完整的 **Workflow Host v12 hardening**。

Workflow Host API v12 是所有 trusted in-process workflows 与插件内部 workflow modules 访问 Zotero host capabilities 的固定 interface。它必须：

- 形成 closed、显式、可治理的 projection；
- 隐藏 Zotero globals、SQL、runtime adapter、native objects 与分页实现；
- 提供稳定的错误、取消、资源预算、ordering 和 completion semantics；
- 让 caller 通过 interface 获取 leverage，让实现与验证保持 locality；
- 禁止 workflow 通过平行 escape hatch 绕过 interface。

### 3.2 不成为统一 interface 的范围

Workflow Host API 不是所有进程、transport 和 agent surfaces 的统一 facade。

- **Zotero Host Capability Broker**：Zotero host capability semantics 的唯一事实源。
- **Workflow Host API Projection**：trusted in-process workflows 的显式 projection。
- **Host Bridge / MCP**：独立 projections，继续拥有 authorization、permission、exposure、noninteractive policy 与 Host Bridge Locality Projection。
- **Synthesis sidecar**：拥有 Synthesis application、repository、CAS、staging 与 durable state；不得反向成为 Zotero host semantics 的定义来源。

Workflow Host 不得通过 spread、proxy、运行时 capability catalog 或整个 domain alias 自动继承 Broker、handlers、SynthesisClient 或任何 implementation module 的成员。

### 3.3 v12 是硬切换

- 当前 v11 已有公开含义，不能在删除成员后继续声称为 v11。
- `WORKFLOW_HOST_API_VERSION` 应提升到 12。
- `literature-workbench-package` 统一要求 v12，不保留 v2-v11 fallback。
- 不保留 `items.getAll` legacy adapter。
- 不以 compatibility alias 保存被删除的 v11 members。
- v12 identity、projection、package guard、spec、docs 与 conformance 必须一起发布，不能出现两个不同 shape 的 v12。

### 3.4 Workflow Host 是 closed composition root

`WorkflowHostApi` 的顶层角色固定为 closed composition root，而不是集中持有所有领域行为的单体 deep module。

- `src/workflows/hostApi.ts` 只负责 version identity、explicit member projection、contract variant 组合与 deny adapters；
- Zotero host semantics 归 Zotero Host Capability Broker；
- production TypeScript 的普通跨运行时异步文件操作最终归 `runtimePersistence`；caller 可以保留领域 module，但不得自行选择 `IOUtils`、`OS.File` 或 Node filesystem adapter；
- platform path selection 继续归 `runtimePersistence` 与既有 platform path module 的明确组合，不由 caller 拼接 separator 或猜测 runtime；
- runtime global、Zotero/addon/toolkit 与通用 Window candidate resolution 归 `src/utils/runtimeBridge.ts`；picker-compatible parent policy、picker adapter 与 cancel/empty normalization 归 `src/platform/filePicker.ts`；
- 宿主 subprocess module resolution 与 normalized one-shot execution 归 `src/platform/subprocess.ts`；command resolution policy、ACP/bridge lifecycle 与领域 outcome 仍归各自 owner；
- Synthesis durable application/repository state 归 native sidecar；
- library、mutations、notes、attachments、bibliography、researchBundles、archive、resources 等 nested modules 分别通过自己的 interface 获得 depth；
- 顶层必须提供一份 exact top-level/nested surface manifest，但不以压缩顶层方法数量为目标；
- 顶层 conformance 只锁定 version、exact shape、projection provenance 与 variant behavior；领域行为通过对应 nested module interface 测试；
- nested module 可以拥有私有 internal modules/seams，不得因为 implementation/test 需要把它们泄漏到 Workflow Host interface；
- 不得把所有 DTO validation、revision、mutation registry、file adapter、Synthesis composition 与 recovery 继续堆入 `hostApi.ts` 或单个 broker implementation file，误把物理堆积当作 locality。

因此，v12 的 deep-module 审阅单位是每个 nested module；顶层 facade 的价值是 closed composition、discoverability 与 governance。

### 3.5 公开契约完整性是 v12 surface 的准入门槛

任何成员只有在公开契约完整闭合后，才能进入 Workflow Host API v12 的 exact surface manifest。OpenSpec 可以继续决定内部实现，但不得把公开 shape 或公开语义留到编码阶段再决定。

每个候选成员在准入前必须确定：

- exact member name 与所属 nested module；
- exact input/output DTO、nullability 与 discriminated union；
- stable error codes、structured details 与 partial-success/outcome semantics；
- ordering、pagination、resource limits 与 completeness guarantees；
- lifetime、cancellation、concurrency、retry、recovery 和 persistence semantics（适用时）；
- contract variant 中的存在性、deny behavior 与环境差异。

公开契约中不得保留：

- `...`、开放式 string fallback、未闭合的 bag DTO；
- “later decide”“implementation-defined”或留给实现阶段选择的公共行为；
- 未说明来源的 optional projection；
- 只有名称而没有完整请求、结果、失败与边界语义的占位成员。

尚未达到门槛的能力必须在 exact manifest 冻结前二选一：完成契约设计，或从 v12 surface 移除并延期。不得以“先公开、以后补完”的方式进入 v12。

### 3.6 方案硬化的决策粒度

本轮 grilling 只逐项提交会实质改变以下内容的架构级决策：

- module owner、external seam 与公开成员的加入/删除；
- data integrity、atomicity、partial success、concurrency、lifetime 或 persistence semantics；
- compatibility/version、contract variant 与总体改动面；
- 会显著增加调用者认知负担或 implementation scope 的设计选择。

由既有决策可以机械推出的 DTO 字段、命名、宽松资源常量、per-type normalization table 与 closed error details，不再逐字段要求用户确认。它们由方案作者集中落成 exact surface/spec draft，再通过一次完整的一致性、完整性、overdesign 与 change-surface 审阅；任何真正改变上述架构语义的缺口才重新进入 grilling。

该范围收紧不降低 §3.5 的 implementation-readiness 门槛：public contract 仍须在 implementation 前闭合，只是不把 specification authoring 错当成一串架构决策。

### 3.7 Workflow Host v12 exact surface manifest

以下 manifest 是 v12 public member identity 的唯一事实源。它固定 exact top-level keys、nested keys、member names 与 call shape；各 DTO 的字段、不变量、limits、error/outcome 和 owner 由后续对应章节定义。任何正文示例与本 manifest 冲突时，必须先修正文漂移，不能在实现中自行选择。

```ts
type WorkflowHostApiV12 = Readonly<{
  version: 12;
  interactionMode: "interactive" | "non_interactive";

  addon: Readonly<{
    getConfig(): AddonIdentityDto;
  }>;

  environment: Readonly<{
    getInfo(): WorkflowEnvironmentInfo;
  }>;

  context: Readonly<{
    getCurrentView(): CurrentViewDto;
    getSelectedItems(
      control?: WorkflowCallControl,
    ): Promise<SelectedItemsSnapshotDto>;
  }>;

  navigation: Readonly<{
    openItem(
      ref: PortableItemRef,
      control?: WorkflowCallControl,
    ): Promise<NavigationResultDto>;
    openNote(
      ref: PortableItemRef,
      control?: WorkflowCallControl,
    ): Promise<NavigationResultDto>;
    openCollection(
      ref: PortableCollectionRef,
      control?: WorkflowCallControl,
    ): Promise<NavigationResultDto>;
    openSelection(
      input: NavigationSelectionInputDto,
      control?: WorkflowCallControl,
    ): Promise<NavigationResultDto>;
  }>;

  library: Readonly<{
    listItems(
      input: LibraryListItemsRequestDto,
      control?: WorkflowCallControl,
    ): Promise<LibraryListItemsPageDto>;
    traverseItems(
      input: LibraryTraversalRequestDto,
      control: WorkflowCallControl,
      onBatch: (batch: LibraryTraversalBatchDto) => Promise<void> | void,
    ): Promise<LibraryTraversalResultDto>;
    withItemSnapshot(
      input: LibrarySnapshotRequestDto,
      control: WorkflowCallControl,
      onBatch: (batch: LibrarySnapshotBatchDto) => Promise<void> | void,
    ): Promise<LibrarySnapshotResultDto>;
    listCollections(
      input: LibraryListCollectionsRequestDto,
      control?: WorkflowCallControl,
    ): Promise<LibraryListCollectionsPageDto>;
    getItemDetail(
      ref: PortableItemRef,
      control?: WorkflowCallControl,
    ): Promise<ItemDetailDto>;
    getItemNotes(
      parentRef: PortableItemRef,
      control?: WorkflowCallControl,
    ): Promise<NoteSummaryDto[]>;
    getNoteDetail(
      noteRef: PortableItemRef,
      options: NoteDetailOptionsDto,
      control?: WorkflowCallControl,
    ): Promise<NoteDetailDto>;
    listNotePayloads(
      noteRef: PortableItemRef,
      control?: WorkflowCallControl,
    ): Promise<NotePayloadSummaryDto[]>;
    getNotePayload(
      noteRef: PortableItemRef,
      options: NotePayloadOptionsDto,
      control?: WorkflowCallControl,
    ): Promise<NotePayloadValueDto>;
    getItemAttachments(
      parentRef: PortableItemRef,
      control?: WorkflowCallControl,
    ): Promise<AttachmentDetailDto[]>;
    listAnnotations(
      ref: PortableItemRef,
      control?: WorkflowCallControl,
    ): Promise<AnnotationDetailDto[]>;
    exportPortableItems(
      itemRefs: PortableItemRef[],
      control?: WorkflowCallControl,
    ): Promise<PortableRegularItemDto[]>;
  }>;

  metadata: Readonly<{
    translateIdentifier(
      input: MetadataLookupRequestDto,
      control?: WorkflowCallControl,
    ): Promise<MetadataLookupResultDto>;
  }>;

  mutations: Readonly<{
    preview<K extends MutationPreviewOperation>(
      input: MutationPreviewRequestByOperation[K],
      control?: WorkflowCallControl,
    ): Promise<MutationPreviewResult<MutationPlanByOperation[K]>>;
    execute<K extends MutationOperation>(
      input: MutationRequestByOperation[K],
      control?: WorkflowCallControl,
    ): Promise<MutationExecutionResult<MutationResultByOperation[K]>>;
  }>;

  notes: Readonly<{
    create(
      input: NoteCreateRequestDto,
      control?: WorkflowCallControl,
    ): Promise<MutationExecutionResult<{ note: NoteSummaryDto }>>;
    updateContent(
      input: NoteUpdateContentRequestDto,
      control?: WorkflowCallControl,
    ): Promise<MutationExecutionResult<{ note: NoteSummaryDto }>>;
    remove(
      input: NoteRemoveRequestDto,
      control?: WorkflowCallControl,
    ): Promise<MutationExecutionResult<NoteRemovalResultDto>>;
    upsertPayload(
      input: NotePayloadUpsertRequestDto,
      control?: WorkflowCallControl,
    ): Promise<MutationExecutionResult<NotePayloadUpsertResultDto>>;
  }>;

  images: Readonly<{
    prepareForNoteEmbedding(
      input: PrepareNoteImageRequestDto,
      control?: WorkflowCallControl,
    ): Promise<PreparedNoteImageDto>;
  }>;

  attachments: Readonly<{
    create(
      input: AttachmentCreateRequestDto,
      control?: WorkflowCallControl,
    ): Promise<MutationExecutionResult<{ attachment: AttachmentDetailDto }>>;
    updateMetadata(
      input: AttachmentUpdateMetadataRequestDto,
      control?: WorkflowCallControl,
    ): Promise<MutationExecutionResult<{ attachment: AttachmentDetailDto }>>;
    replaceFile(
      input: AttachmentReplaceFileRequestDto,
      control?: WorkflowCallControl,
    ): Promise<MutationExecutionResult<AttachmentReplaceFileResultDto>>;
    move(
      input: AttachmentMoveRequestDto,
      control?: WorkflowCallControl,
    ): Promise<MutationExecutionResult<AttachmentMoveResultDto>>;
    remove(
      input: AttachmentRemoveRequestDto,
      control?: WorkflowCallControl,
    ): Promise<MutationExecutionResult<AttachmentRemovalResultDto>>;
  }>;

  bibliography: Readonly<{
    listFormats(
      control?: WorkflowCallControl,
    ): Promise<BibliographyFormatDto[]>;
    render(
      input: BibliographyRenderRequestDto,
      control?: WorkflowCallControl,
    ): Promise<BibliographyRenderResultDto>;
  }>;

  researchBundles: Readonly<{
    materializePapers(
      input: MaterializePapersRequestDto,
      control?: WorkflowCallControl,
    ): Promise<MaterializePapersResultDto>;
    importPapers(
      input: ImportPapersRequestDto,
      control?: WorkflowCallControl,
    ): Promise<ImportPapersResultDto>;
  }>;

  statusTags: Readonly<{
    getPolicy(): StatusTagPolicyDto;
    transition(
      input: StatusTagTransitionRequestDto,
      control?: WorkflowCallControl,
    ): Promise<MutationExecutionResult<StatusTagTransitionResultDto>>;
  }>;

  file: Readonly<{
    readText(path: string, control?: WorkflowCallControl): Promise<string>;
    writeText(
      path: string,
      content: string,
      control?: WorkflowCallControl,
    ): Promise<void>;
    readBytes(
      path: string,
      control?: WorkflowCallControl,
    ): Promise<Uint8Array>;
    writeBytes(
      path: string,
      bytes: Uint8Array | ArrayBuffer,
      control?: WorkflowCallControl,
    ): Promise<void>;
    copy(
      input: WorkflowFileCopyRequestDto,
      control?: WorkflowCallControl,
    ): Promise<void>;
    exists(path: string, control?: WorkflowCallControl): Promise<boolean>;
    makeDirectory(
      input: WorkflowMakeDirectoryRequestDto,
      control?: WorkflowCallControl,
    ): Promise<void>;
    materializeWorkflowInputFile(
      input: WorkflowInputFileMaterializationRequestDto,
      control?: WorkflowCallControl,
    ): Promise<WorkflowMaterializedFileDto>;
    getTempDirectoryPath(): string;
    pickDirectory(input?: FilePickerRequestDto): Promise<string | null>;
    pickFile(input?: FilePickerRequestDto): Promise<string | null>;
    pickSaveFile(input?: SaveFilePickerRequestDto): Promise<string | null>;
    pickFiles(input?: FilePickerRequestDto): Promise<string[] | null>;
    stat(
      path: string,
      control?: WorkflowCallControl,
    ): Promise<WorkflowFileStatDto>;
    list(
      input: WorkflowFileListRequestDto,
      control?: WorkflowCallControl,
    ): Promise<WorkflowFileListResultDto>;
    move(
      input: WorkflowFileMoveRequestDto,
      control?: WorkflowCallControl,
    ): Promise<void>;
    remove(
      input: WorkflowFileRemoveRequestDto,
      control?: WorkflowCallControl,
    ): Promise<WorkflowFileRemoveResultDto>;
  }>;

  archive: Readonly<{
    measureEntries(
      input: WorkflowArchiveMeasureRequestDto,
      control?: WorkflowCallControl,
    ): Promise<WorkflowArchiveMeasureResultDto>;
    writeZipAtomic(
      input: WorkflowArchiveWriteRequestDto,
      control?: WorkflowCallControl,
    ): Promise<WorkflowArchiveWriteResultDto>;
    withExtractedZip<TResult>(
      input: WorkflowArchiveExtractRequestDto,
      control: WorkflowCallControl,
      callback: (
        archive: WorkflowExtractedArchive,
      ) => Promise<TResult> | TResult,
    ): Promise<TResult>;
  }>;

  resources: Readonly<{
    getInput(slotId: string): WorkflowResourceFileDto | null;
    getInputs(slotId: string): WorkflowResourceFileDto[];
    get(
      ref: ResourceRef,
      control?: WorkflowCallControl,
    ): Promise<WorkflowResourceFileDto>;
    materializeFile(
      input: WorkflowResourceMaterializeFileRequestDto,
      control?: WorkflowCallControl,
    ): Promise<WorkflowResourceFileDto>;
    allocateOutput(
      input: WorkflowResourceAllocationRequestDto,
      control?: WorkflowCallControl,
    ): Promise<WorkflowResourceAllocationDto>;
    publishOutput(
      input: WorkflowResourcePublishRequestDto,
      control?: WorkflowCallControl,
    ): Promise<WorkflowResourceOutputDescriptorDto>;
    listOutputs(): WorkflowResourceOutputDescriptorDto[];
  }>;

  clipboard: Readonly<{
    readText(control?: WorkflowCallControl): Promise<string | null>;
    writeText(
      text: string,
      control?: WorkflowCallControl,
    ): Promise<void>;
    hasText(control?: WorkflowCallControl): Promise<boolean>;
    clear(control?: WorkflowCallControl): Promise<void>;
  }>;

  editor: Readonly<{
    openSession<
      TState extends JsonValue,
      TContext extends JsonValue,
      TResult extends JsonValue,
    >(
      input: WorkflowEditorSessionRequest<TState, TContext, TResult>,
    ): Promise<WorkflowEditorSessionResult<TResult>>;
  }>;

  notifications: Readonly<{
    toast(input: WorkflowToastRequestDto): void;
  }>;

  logging: Readonly<{
    appendRuntimeLog(input: WorkflowRuntimeLogRequestDto): void;
  }>;

  synthesis: Readonly<{
    workflowApply: Readonly<{
      applyLiteratureDigest(
        input: SynthesisLiteratureDigestApplyRequest,
        control?: WorkflowCallControl,
      ): Promise<SynthesisLiteratureDigestApplyResult>;
      applyTopicPlan(
        input: SynthesisTopicPlanApplyRequest,
        control?: WorkflowCallControl,
      ): Promise<SynthesisTopicPlanApplyResult>;
      applyTopicSynthesisResult(
        input: SynthesisTopicApplyRequest,
        control?: WorkflowCallControl,
      ): Promise<SynthesisTopicApplyResult>;
    }>;
    topics: Readonly<{
      getReport(
        input: SynthesisTopicReportRequest,
        control?: WorkflowCallControl,
      ): Promise<SynthesisTopicReportResult>;
    }>;
    artifacts: Readonly<{
      readPaperArtifacts(
        input: SynthesisPaperArtifactsRequest,
        control?: WorkflowCallControl,
      ): Promise<SynthesisPaperArtifactsResult>;
    }>;
    tags: Readonly<{
      loadVocabulary(
        control?: WorkflowCallControl,
      ): Promise<SynthesisTagVocabularySnapshot>;
      saveVocabulary(
        input: SynthesisTagVocabularySaveRequest,
        control?: WorkflowCallControl,
      ): Promise<SynthesisTagMutationResult>;
      exportVocabularyForRegulator(
        control?: WorkflowCallControl,
      ): Promise<TagVocabularyRegulatorExportDto>;
      listStagedSuggestions(
        control?: WorkflowCallControl,
      ): Promise<SynthesisTagStagedSuggestion[]>;
      stageSuggestions(
        input: SynthesisTagSuggestionStageRequest,
        control?: WorkflowCallControl,
      ): Promise<SynthesisTagStageResult>;
      promoteStagedSuggestions(
        input: SynthesisTagSelectionRequest,
        control?: WorkflowCallControl,
      ): Promise<SynthesisTagPromotionResult>;
      discardStagedSuggestions(
        input: SynthesisTagSelectionRequest,
        control?: WorkflowCallControl,
      ): Promise<SynthesisTagDiscardResult>;
      withAuditRun(
        input: TagAuditRunRequestDto,
        control: WorkflowCallControl,
        callback: (
          run: TagAuditRunWriter,
        ) => Promise<LibraryTraversalResultDto> | LibraryTraversalResultDto,
      ): Promise<TagAuditRunResultDto>;
      acknowledgeRegulation(
        input: TagRegulationAcknowledgementRequestDto,
        control?: WorkflowCallControl,
      ): Promise<TagRegulationAcknowledgementResultDto>;
    }>;
  }>;
}>;
```

manifest metrics 固定为：23 个 top-level keys（2 个 metadata values + 21 个 nested modules）与 87 个 callable members。`synthesis` 的 14 个 callable members 计入 87，但其 `workflowApply/topics/artifacts/tags` grouping keys 不计作 callable member。

明确不存在的 top-level keys：`items`、`prefs`、`parents`、generic `tags`、generic `collections`、`command`、legacy `literature`。`resources.mode`、optional `resources`、optional `synthesis`、flat Synthesis aliases 与任何 runtime capability map 同样不存在。

manifest 只允许一个 code-native readonly literal 作为运行时 identity；TypeScript exactness、recursive conformance 和 package guard 从该 literal 与 `WorkflowHostApiV12` 互相校验。不得手写第二份 top-level-only allowlist，也不生成或向 workflow 暴露动态 capability catalog。OpenSpec current-state spec 与文档表达相同 interface，但不能反向成为 runtime member discovery source。

### 3.8 Portable DTO 与 in-process-only values

Broker、Synthesis wire contract、mutation evidence、errors、snapshot data、research graph data与普通 Workflow Host DTO 都必须是 strict JSON。以下值是 exact manifest 明确列出的 trusted in-process control/payload seam，不属于 portable DTO，也不得进入 Host Bridge/MCP、receipt、durable state 或 workflow manifest：

- `WorkflowCallControl.signal` 与 `WorkflowRuntimeContext.signal` 中的
  `CancellationSignal`；
- traversal、snapshot、archive 与 tag-audit callback；
- editor renderer/action callbacks 与其 DOM root；
- `file.readBytes/writeBytes` 与 archive entry content 使用的 `Uint8Array/ArrayBuffer`；
- local trusted file/archive/resource paths；
- archive callback 的泛型临时结果。

这份例外清单是闭合的。它不允许 raw `Zotero.Item`、`Zotero.Collection`、window、DOM、native stream、`nsIFile`、Components object、IOUtils adapter、Node filesystem object、Synthesis repository/application 或任意 `unknown` bag 重新进入 v12 interface。

`CancellationSignal` 是宿主无关的最小取消值，只承诺以下语义：

```ts
type CancellationSignal = Readonly<{
  readonly aborted: boolean;
  addEventListener(
    type: "abort",
    listener: () => void,
    options?: { once?: boolean },
  ): void;
  removeEventListener(type: "abort", listener: () => void): void;
}>;
```

接受 upstream 或 control signal 的输入仍可接收原生 `AbortSignal`，其结构
与上述最小契约兼容；runtime 自己提供的 signal 不承诺 `reason`、`onabort`、
`throwIfAborted()` 或 `dispatchEvent()`，也不承诺可直接作为原生 `fetch`
signal。

### 3.9 Canonical shared DTOs

```ts
type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

type PortableItemRef = {
  libraryId: number;
  key: string;
};

type PortableCollectionRef = {
  libraryId: number;
  key: string;
};

type StableIssueDto =
  | {
      code: "attachment_file_missing";
      attachmentRef: PortableItemRef;
    }
  | {
      code: "attachment_file_unreadable";
      attachmentRef: PortableItemRef;
    }
  | {
      code: "attachment_file_permission_denied";
      attachmentRef: PortableItemRef;
    }
  | {
      code: "bibliography_format_fallback";
      requested: BibliographyFormatRef[];
      used: BibliographyFormatRef;
    }
  | {
      code: "bibliography_renderer_warning";
      itemRef: PortableItemRef | null;
    };
```

所有 JSON number 必须 finite；object key、array length、depth 与 serialized bytes 服从所属 member 的 budgets。portable refs 只接受 positive finite integer `libraryId` 与 canonical Zotero key，禁止 numeric item ID、`libraryID` 拼写、复合字符串、raw ref fallback 或附带 title/path 等展示字段。跨 `bibliography` 与 `researchBundles` 复用的 nonfatal issue 只允许上述 `StableIssueDto` closed union；其他领域若需要 diagnostic，必须在自己的 public contract 中定义独立 closed code union，不允许 `code: string` 或 native warning passthrough。

## 4. Closed projection 与 runtime 收敛

### 4.1 Closed explicit projection

已确认：

- 每个顶层和 nested domain 使用显式 member allowlist。
- 底层 module 新增方法时，默认不会进入 Workflow Host。
- 新增公开成员必须经过 contract/version 审查。
- conformance 必须检查 exact nested member set、函数类型和 variant 行为，不能只检查顶层 key truthiness。

### 4.2 删除 workflow-visible escape hatches

v12 的 `WorkflowRuntimeContext` 与 hook scope 删除：

- `runtime.zotero`
- `runtime.handlers`
- 具备 host access 的 `runtime.helpers`
- hook-visible `IOUtils`
- 可直接访问 clipboard 的 `navigator.clipboard`

workflow consumers 禁止直接使用：

- `globalThis.Zotero`
- `Components`
- `fs/promises`
- `Zotero.File`
- 内部 Broker import
- 内部 runtime adapter

纯函数 helpers 保留为 package-local utilities，不因删除 `runtime.helpers` 而错误塞入 Workflow Host。

应增加静态门禁，consumer-side 绕过计数目标为零。Broker、Host adapters、Host Bridge/MCP adapters、loader/runtime infrastructure 只有在 §4.5 的批准 native workload 例外内才能直接使用 native capabilities；普通异步文件操作、通用 runtime/window resolution 与 one-shot subprocess execution 仍必须经过各自 owner seam。

### 4.3 Contract Variant

所有 Workflow Host API v12 contract variants 保持完全相同的 exact top-level/nested interface shape。`resources`、`synthesis` 与其他领域模块均不得成为 optional projection。

- interactive adapter 正常执行 UI interaction。
- non-interactive deny adapter 返回稳定的 `interaction_required`。
- runtime dependency 或环境能力不可用时，成员仍然存在，并通过后续统一的 closed error/outcome taxonomy 表达 unavailable；不得通过删除模块或成员表达不可用。
- 不通过缺失成员、optional module、`undefined`、可选链约定或 spread 后局部覆盖表达 variant。
- 顶层 metadata exact shape 只有只读字面量 `version: 12` 与 `interactionMode: "interactive" | "non_interactive"`；caller 可以用 `interactionMode` 预判是否应发起 UI interaction。
- 不提供逐成员 capability flags、动态 availability map 或 runtime capability catalog。sidecar、filesystem 或具体 adapter 的实际不可用由对应成员的 closed error/outcome 表达。
- `environment.getInfo()` 不承担 capability discovery。
- exact surface manifest、TypeScript contract、文档与 conformance tests 只有一份成员形状；variant 只改变受约束成员的执行结果，不产生第二套接口。

该规则适用于 navigation、clipboard、editor、file pickers、notifications 和其他用户交互能力。

### 4.4 Workflow call control seam

潜在阻塞且存在真实取消点的 trusted in-process Workflow Host members 复用一个控制类型：

```ts
type CancellationSignal = Readonly<{
  readonly aborted: boolean;
  addEventListener(
    type: "abort",
    listener: () => void,
    options?: { once?: boolean },
  ): void;
  removeEventListener(type: "abort", listener: () => void): void;
}>;

type WorkflowCallControl = Readonly<{
  signal?: CancellationSignal;
}>;
```

- `WorkflowRuntimeContext.signal` 与 `WorkflowCallControl.signal` 都使用上述
  `CancellationSignal`；domain input 与 output DTO 继续是 strict JSON，取消值
  只存在于独立的 in-process control parameter；
- ordinary async member 使用 `(input, control?)`；callback-scoped member 使用 `(input, control, callback)`，不把 `signal` 塞进 request bag；
- callback-scoped member 的 control 参数必须显式传入，未提供 signal 时使用 `{}`，不得通过 overload 猜第二参数究竟是 control 还是 callback；
- runtime 向 workflow 提供同一个只读 execution signal，caller 不自行创建平行 run-cancellation state；
- 该 signal 只用于 Workflow Host cooperative cancellation；runtime 不提供
  `reason`、`onabort`、`throwIfAborted()` 或 `dispatchEvent()`，也不保证它能直接
  作为原生 `fetch` signal；
- 接受 upstream 或 control signal 的输入仍兼容结构满足上述最小契约的原生
  `AbortSignal`；
- Workflow Host adapter 在调用开始前、可取消 internal adapter seam 与结果发布前检查 signal；底层原生操作不可中断时，至少不得在取消后发布迟到的成功结果；
- broker public DTO 仍只接受 portable JSON；control 由 Workflow Host adapter 映射到 private cancellation seam，不进入 broker domain contract；
- `WorkflowCallControl` 不投影给 Host Bridge/MCP，也不持久化、序列化或进入 capability metadata；
- 同步、瞬时读取以及不存在真实取消点的 member 不机械增加 control 参数。

`Workflow Host API v12` 的 version、exact surface manifest 与 23/21/87
成员指标不因该取消值契约而改变。Zotero 插件 module scope 即使没有全局
`AbortController`，runtime 仍必须为 `preflight`、`buildRequest` 与
`applyResult` 创建并提供上述 signal；upstream abort linkage 与 hook 结束时
的 abort 语义保持成立，不依赖全局构造器或全局 polyfill。

`canceled` 只允许在 member 具备上述控制通道和 cancellation checks 时成为其公开错误；不得声明 caller 无法触发的虚假 cancellation semantic。

### 4.5 Plugin-internal runtime adapter closure

v12 public interface 闭合之外，插件内部的 Zotero 版本适配也必须形成可治理的 owner seams。兼容行为采用按调用 feature detection，不按 `Zotero.version` 选择 implementation；版本字符串只用于 environment/diagnostic facts，不能成为业务或 adapter dispatch 条件。

production TypeScript 的普通异步文件操作包括 exists、read/write text、read/write bytes、copy、move、stat、list、remove、directory creation 与 temp-path resolution。无论 caller 属于 workflow loader、provider、installer、runtime manager、command resolver 或其他内部 module，这些操作都必须最终委托 `runtimePersistence`。caller 可以在自己的深层 module 中持有 naming、scope、validation、atomicity、retention 或领域 outcome，但不得复制 runtime filesystem selector。

以下 native workloads 形成闭合例外清单，保留在各自 owner-private internal seam，不扩张 `runtimePersistence` 的 external interface，也不得向 Workflow Host 暴露 native object：

- ChromeWorker 中的同步 indexed range read 与 `IOUtils.openFileForSyncReading`；
- Gecko ZIP 所需的 `nsIZipReader`、`nsIZipWriter` 与 `nsIFile`；
- script loader/module evaluation 的 native loader object；
- SQLite storage 初始化所需的同步 native file/storage object；
- bounded streaming transfer 所需的 Components streams；
- OS reveal、file URI construction、Zotero attachment native creation 与 picker interaction；
- 明确以枚举原始 adapter capability 为目的的 diagnostics/probes。

`test/**`、`scripts/**`、`tools/**` 与 `src/modules/harness/**` 的 Node-only 文件访问不纳入 production migration。production module 为 Node runtime 提供的 adapter branch 仍在纳入范围内；不能通过把 Node 分支写进 caller 来规避 owner seam。

runtime/window/picker 的 dependency direction 固定为：`filePicker` 每次调用从 `runtimeBridge` 解析当前 candidates，再应用 picker-compatible parent policy；`runtimeBridge` 不依赖 `filePicker`。缓存的 Workflow Host projection、Broker、caller 或 picker module 不得缓存 runtime global、Window、picker constructor、Chrome module 或 toolkit。owner 自己已经持有的 dialog/preferences Window 不是通用 resolver duplicate，可以直接使用；raw diagnostics 也可以枚举候选及来源。

subprocess seam 只吸收宿主 module/capability resolution、one-shot spawn/capture 与 stdout/stderr/exit/unavailable normalization。command search policy 留在 `platform/command.ts`；login environment parsing 留在 `platform/env.ts`；ACP transport framing、pipe pump、process-group identity、graceful/forced close 与 audit 留在 `acpTransport`；WebSocket bridge singleton、ready/health/shutdown 留在 bridge owner；installer、dependency probe 与 SkillRunner 继续持有各自 timeout、领域 outcome 和 diagnostics。不得把这些 lifecycle 聚合成一个 interface 几乎等于全部 implementation 的 generic process module。Synthesis Git Sync 已退役，Rust sidecar 的 WebDAV sync 通过 Host reverse capabilities 运行，不进入 subprocess seam。

## 5. Library read 与 traversal

### 5.1 明确命名的 interface

已确认采用明确命名的 library members，不使用 `page/read/traverse({ kind })` 通用 dispatcher。

理由：明确命名的成员可以分别固化 invariants、error modes 与 resource limits；通用 dispatcher 会把复杂度转移到庞大的 kind union，形成新的浅层 facade。

v12 删除 `library.searchItems`。当前实现与 `library.listItems({ query, libraryId, limit })` 复用同一 page selector，但只返回数组并丢失 cursor、`hasMore`、`returned`、`totalScanned` 与 normalized filters，没有独立 search engine、relevance ordering 或 session semantics。搜索的匹配、ordering、pagination 与 budget 只由 `listItems` 持有；Workflow Host 不保留 alias。

Host Bridge 若继续保留 transport-facing `library.search_items`，必须在其独立 projection 中映射到 Broker `listItems`，不能反向要求 Workflow Host 暴露重复 member。

`listItems` 的 exact page contract 固定为：

```ts
type LibraryListItemsRequestDto = {
  libraryId?: number;
  collectionRef?: PortableCollectionRef;
  tag?: string;
  itemType?: string;
  query?: string;
  limit?: number;
  cursor?: string;
};

type LibraryListItemsPageDto = {
  items: ItemSummaryDto[];
  nextCursor: string | null;
  hasMore: boolean;
  returned: number;
  totalScanned: number;
  criteria: {
    libraryId: number;
    collectionRef: PortableCollectionRef | null;
    tag: string | null;
    itemType: string | null;
    query: string | null;
    order: "stable_identity";
  };
};
```

`libraryId` 省略时解析为 user library，并在 response 中返回 resolved value。一个 request 只允许一个 collection/tag/itemType/query 值；空字符串按 absent 规范化，非法 ref/limit/cursor 拒绝。cursor 绑定 resolved criteria、schema 与 fixed ordering。`nextCursor === null` 与 `hasMore === false` 必须一致；success page 不返回 truncated flag，也不声称跨页 snapshot consistency。

### 5.2 `library.traverseItems`

v12 新增 Host-owned bounded traversal：

```ts
library.traverseItems(request, control, onBatch)
```

exact request、batch 与 result union：

```ts
type LibraryTraversalRequestDto = {
  libraryId?: number;
  scope: "top-level-regular";
  collectionRef?: PortableCollectionRef;
  tag?: string;
  itemType?: string;
  query?: string;
  resumeCursor?: string;
  pageSize?: number;
  maxItems?: number;
  maxPages?: number;
  maxDurationMs?: number;
};

type LibraryTraversalBatchDto = {
  batchIndex: number;
  items: LibraryTraversalItemDto[];
};

type LibraryTraversalItemDto = RegularItemSummaryDto & {
  tagDigest: string;
};

type LibraryTraversalResultDto =
  | LibraryTraversalCompleted
  | {
      outcome: "canceled";
      libraryId: number;
      visitedItems: number;
      visitedBatches: number;
    }
  | {
      outcome: "resource_limited";
      libraryId: number;
      visitedItems: number;
      visitedBatches: number;
      reason: "max_items" | "max_pages" | "max_duration";
      resumeCursor: string;
    };
```

`resumeCursor` 只恢复同一 resolved library/scope/criteria/order 的 live traversal，不把多次调用组合成 stable snapshot。callback 已接收的 batches 不会因后续 canceled/resource_limited/failure 被 Host 回滚；result 只描述 traversal coverage。

已确认的语义：

- Host 拥有 item enumeration、cursor loop、分页、ordering、budget、cancellation 与统计。
- `LibraryTraversalItemDto.tagDigest` 由 Broker 的 canonical tag normalization/order/hash SSOT 从该 item summary 的同一次完整 tag read 生成；该 traversal-only 字段不扩宽 `library.listItems`、selection snapshot 或其他 `RegularItemSummaryDto` projections。
- caller 不直接循环 Zotero/Broker page cursor。
- `onBatch` 串行执行；上一批 callback settle 后才能读取下一批。
- callback 是 trusted local seam，不进入 native RPC 或 Host Bridge/MCP。
- callback 抛错时 traversal 失败，Host 不把 caller 副作用伪装成已回滚。
- 一次只遍历一个 library。
- request 可省略 `libraryId`，省略时解析为 user library；outcome 必须返回实际 library ID。
- `scope` 必须显式填写；v12 首版只批准 `top-level-regular`。
- deleted items、notes、attachments、annotations 与 child items 不混入该 scope。
- 可复用 `listItems` 已有的 collection、tag、itemType、query 等 portable criteria。
- ordering 固定、cursor opaque 且绑定 library/scope/criteria/order。
- 采用 live traversal，不承诺跨页 snapshot consistency。
- side-channel 更新或实现优化不得改变上述 interface semantics。

### 5.3 资源预算

Host 统一拥有：

- `pageSize` 默认值与硬上限；
- `maxItems`、`maxPages`、`maxDurationMs` 默认值与绝对上限；
- caller 可请求更小预算，不能关闭上限或传入无界值；
- 达到预算且仍有 continuation 时，返回 `resource_limited` 与 opaque resume cursor；
- 不得静默截断后返回 `completed`。

v12 固定使用以下宽松 budgets；default 用于常规调用，hard max 只防止失控输入，不作为建议工作规模：

| Capability/resource | Default | Hard max |
| --- | ---: | ---: |
| `listItems.limit` | 25 | 100 |
| `listCollections.limit` | 100 | 500 |
| traversal `pageSize` | 100 | 500 |
| traversal `maxItems` | 100,000 | 1,000,000 |
| traversal `maxPages` | 1,000 | 10,000 |
| traversal `maxDurationMs` | 300,000 | 1,800,000 |
| snapshot `batchSize` | 500 | 1,000 |
| snapshot total items | — | 1,000,000 |
| snapshot session TTL | 30 minutes | fixed |

caller 可以降低 traversal budgets；省略时使用 default。snapshot total item cap 与 TTL 由 Host 固定，caller 不能放大或关闭。达到 snapshot hard cap/TTL 时结果不完整，consumer 必须保留旧 index 并开启新 snapshot。

正式 outcome 至少区分：

- `completed`
- `canceled`
- `resource_limited`
- failure（通过稳定 error contract）

tag audit 只有在 traversal `completed` 时才允许 promotion。

`completed` outcome 附带 Host-issued traversal completion evidence：

```ts
type LibraryTraversalCompleted = {
  outcome: "completed";
  libraryId: number;
  scope: "top-level-regular";
  visitedItems: number;
  visitedBatches: number;
  completionEvidence: {
    evidenceId: string;
    criteriaDigest: string;
    coverageDigest: string;
    completedAt: string;
  };
};
```

- `criteriaDigest` 绑定 resolved library、scope、filters 与 canonical ordering；
- `coverageDigest` 绑定实际交给 callback 的全部 canonical `(itemRef, revision, tagDigest)` tuples；
- revision 与 `LibraryTraversalItemDto.tagDigest` 必须来自对应 batch item 的同一次完整 Host read，coverage 生成必须复用已经交付的 digest，不得再次读取或另算；
- 只有 cursor 确认耗尽才能签发；canceled、resource_limited 与 failure 不返回 completion evidence；
- empty library 签发 canonical empty coverage evidence，使完整空扫描可以清除旧 ledger；
- evidence 由 Host registry/verification seam 核验，caller 不能自行构造可信 evidence；
- evidence 不是 authorization、mutation receipt 或可跨 run 持久化的业务对象。

### 5.4 tags 的 bounded summary

已确认不增加 `library.listItemTags` 或 `library.traverseItemTags`。

现有 summary 上限继续作为 v12 contract：

- 每个 item 最多 100 个 tags；
- 每个 tag 最多 200 个 UTF-16 code units。

但必须 fail-closed：

- `getTags()` 读取失败不能伪装成 `tags: []`；
- 截断不能伪装成完整事实；
- `traverseItems` 遇到读取失败或实际截断时返回明确错误；
- tag-auditor 保留旧 ledger，不发布可能错误的合规结果。

### 5.5 Annotations

v12 显式加入：

```ts
library.listAnnotations(...)
```

理由：Broker、Host Bridge 与 CLI 已共同证明该 read seam 稳定。

暂不加入 annotation export。Markdown/格式化导出属于 presentation adapter，不是基础 Zotero library read semantics。

### 5.6 Collections

v12 新增 canonical bounded read：

```ts
type LibraryListCollectionsRequestDto = {
  libraryId?: number;
  limit?: number;
  cursor?: string;
};

type CollectionDto = {
  ref: PortableCollectionRef;
  name: string;
  parentRef: PortableCollectionRef | null;
  revision: string;
  state: "active";
  path: string[];
};

type LibraryListCollectionsPageDto = {
  collections: CollectionDto[];
  libraryId: number;
  nextCursor: string | null;
  hasMore: boolean;
  returned: number;
  order: "stable_identity";
};
```

已确认的语义：

- 一次一个 library；
- bounded page + opaque cursor；
- 使用稳定 identity ordering，不用可变 name/path 作为 cursor ordering；
- DTO 返回 `libraryId`、`key`、`name`、parent identity、opaque `revision`、active state 与可选展示 path；
- path 不是 identity，也不决定分页顺序；
- 空 library 返回成功空页；
- 不可访问、invalid cursor 与读取失败使用稳定错误；
- 不增加完整 tree、`listChildren` 或 collection detail；caller 可根据 parent refs 构树。

`workflowParameterOptions` 必须迁移到该 interface，删除对 Broker helper 的直接依赖。

### 5.7 Navigation

v12 interactive variant 加入：

```ts
type NavigationSelectionInputDto = {
  itemRefs: PortableItemRef[];
};

type NavigationResultDto = {
  openedAt: string;
  target:
    | { kind: "item"; ref: PortableItemRef }
    | { kind: "note"; ref: PortableItemRef }
    | { kind: "collection"; ref: PortableCollectionRef }
    | { kind: "selection"; refs: PortableItemRef[] };
};
```

成功结果只表示 Host 已在当前 Zotero UI 打开 normalized target；target missing、kind mismatch、window unavailable 或 interaction denied 使用 stable error。`openSelection` 保持 input order，拒绝 duplicates，且受与 `context.getSelectedItems` 相同的 selection hard limit；不返回或复制一份 `CurrentViewDto`。

non-interactive variant 使用 deny adapter。Host Bridge/MCP 的授权与 exposure 继续独立。

### 5.8 Readiness audit

明确排除 `library.readinessAudit`。

它读取 PDF/source markdown、digest、references、citation analysis、literature score 等 Synthesis-derived artifacts，不是 Zotero library 原生状态。未来 workflow 若需要，应通过显式 Synthesis domain 投影，不得放入 Host `library`。

### 5.9 Full item snapshot feed

可靠的本地 Zotero metadata index refresh 是现有产品需求：Hermes `zotero-librarian` 定期读取完整 library projection，在完整成功后 upsert changed rows 并删除 absent rows，失败时保留上一份可用索引。当前 v11 `library.syncSnapshot` 只是对 live `listItems` page 增加临时 `generatedAt/snapshotId`，不保证跨页集合稳定，不能安全支持 absent-row deletion。

v12 保留并深化该 capability，不保留伪 snapshot semantics，也不扩张为 incremental sync protocol。

Broker-owned snapshot module 必须保证：

- 第一次读取创建 caller-scoped、process-local、TTL-bounded snapshot session；
- 一个 `snapshotId` 的所有 pages/batches 来自同一稳定 item projection，cursor 绑定 snapshot、library、ordering 与 schema；
- snapshot 只接受明确的单一 `libraryId` 和 contract-owned full-index projection，不接受 tag/query/collection/itemType 等会使 absent-row deletion 含糊的过滤条件；
- item DTO 完整覆盖 resident index 所需 metadata、tags、collections、note/attachment counts 与 portable identity；
- final completion evidence 至少绑定 snapshot identity、schema、total item count、canonical ordering 与 content digest；
- consumer 只有在完整 completion evidence 成立后才能提交新索引或删除 absent rows；expired、canceled、resource_limited、Host restart、cursor mismatch 或 incomplete read 必须保留旧索引并从新 snapshot 重试；
- session data 与 cursor state 是 ephemeral runtime state，terminal/expiry 后清理；不提供跨进程 resume；
- 不增加 incremental change cursor、永久 change log 或 deletion tombstone feed。

Workflow projection 的 exact request/batch/result 固定为：

```ts
type LibrarySnapshotRequestDto = {
  libraryId: number;
  batchSize?: number;
};

type LibrarySnapshotItemDto = RegularItemSummaryDto & {
  identifiers: {
    doi: string | null;
    isbn: string | null;
    issn: string | null;
    arxiv: string | null;
    pmid: string | null;
  };
  url: string | null;
  noteCount: number;
  attachmentCount: number;
  annotationCount: number;
  modifiedAt: string;
};

type LibrarySnapshotBatchDto = {
  schema: "zotero-agents.library-full-index.v1";
  snapshotId: string;
  batchIndex: number;
  items: LibrarySnapshotItemDto[];
};

type LibrarySnapshotCompletionEvidenceDto = {
  snapshotId: string;
  schema: "zotero-agents.library-full-index.v1";
  libraryId: number;
  scope: "top-level-regular";
  totalItems: number;
  totalBatches: number;
  order: "stable_identity";
  contentDigest: string;
  completedAt: string;
};

type LibrarySnapshotResultDto =
  | {
      outcome: "completed";
      completionEvidence: LibrarySnapshotCompletionEvidenceDto;
    }
  | {
      outcome: "canceled" | "expired" | "resource_limited";
      snapshotId: string;
      deliveredItems: number;
      deliveredBatches: number;
    };
```

snapshot scope 固定为目标 library 的 active top-level regular items；child notes、attachments 与 annotations 通过 counts 表达，不作为独立 snapshot rows。`batchSize` 只能在 Host 固定上下限内取值，不能改变 schema、scope、ordering 或完整性。非 completed result 不返回 completion evidence；callback 已消费的 batches 不能单独提交为 resident index。

projection 形式按 locality 分离，但共享同一个 Broker semantics owner：

- Workflow Host v12 使用 `library.withItemSnapshot(request, control, onBatch)`，由 Host 隐藏 page loop/session lifetime，并在 callback 完整结束后返回 completion evidence；
- Host Bridge/MCP/CLI 继续使用 paged `library.sync_snapshot` projection，后续 page 必须携带 Host-issued snapshot identity/cursor；
- v11 Workflow `library.syncSnapshot(page)` 删除，不保留 alias；`listItems` 继续是 live bounded page，`traverseItems` 继续是 live full traversal，两者都不能冒充 stable snapshot。

这是独立 vertical slice，实施会同步修改 Broker、Workflow Host、Host Bridge registry/schema、CLI contract、Hermes profile/index transaction、active specs、文档与测试。由于触及 Host Bridge agent-facing surface，执行前必须按其硬约束固定 baseline、materialized metrics 与批准删除清单，并完成 semantic parity/review gates。

## 6. Related-item semantics

读取继续使用：

```ts
library.getItemDetail(ref).item.relatedRefs
```

v12 在 canonical mutation union 中加入两个 execute-only operations：

```text
item.addRelated
item.removeRelated
```

它们只通过 `mutations.execute` 投影，不属于三类 mandatory-preview operations。

```ts
type RelatedItemMutationResultDto = {
  sourceRef: PortableItemRef;
  relatedRef: PortableItemRef;
  outcome: "added" | "removed" | "already_present" | "already_absent";
  sourceRevision: string;
};
```

已确认的语义：

- 单 pair；
- 严格有向：`source -> related`；
- 不增加 `bidirectional: true`；
- 两端必须存在、active、属于同一 library 且不能相同；
- 允许 Zotero 原生支持的 active item 类型，不人为限制为 top-level regular；
- deleted/trash item 拒绝操作；
- add 已存在返回 `already_present`；
- remove 已不存在返回 `already_absent`；
- 只修改并保存 source；
- preview 不写 Zotero；
- symmetric relation 若未来需要，应设计独立高层 operation，并明确两端保存、部分成功与恢复。

不新增 `library.listRelatedItems`，也不保留 legacy `parents.addRelated` 作为 v12 Host member。

## 7. 删除 raw `items` domain

早先“只删除 `items.getAll`、保留其余 raw members”的决定已经被后续 hardening 目标推翻。

v12 完全删除 `WorkflowHostApi.items`。

原因：`get/resolve/getByLibraryAndKey` 返回 live `Zotero.Item`，caller 可以继续任意调用 `saveTx()`、tag mutation、notes/attachments traversal 和 relation mutation，等价于保留 escape hatch。

迁移方向：

| v11 能力 | v12 owner |
| --- | --- |
| item lookup/detail | `library.getItemDetail` |
| notes/attachments read | bounded `library` reads |
| full-library scan | `library.traverseItems` |
| create/update/delete | canonical `mutations` + receipts |
| related/tag/status writes | canonical mutation 或专用深层 module |
| portable JSON/bibliography | bundle/export module |
| archive import/rollback | literature bundle materialization module |

所有 workflow-facing identity 统一为 portable `{ libraryId, key }`。raw `Zotero.Item` 只允许存在于 Broker/Host adapter implementation locality。

为完成迁移，v12 还必须补齐：

- structured creator DTO；
- attachment detail 中稳定的 link mode、charset、URL、embedded-image 等字段；
- ref-based bibliography/export；
- item create/delete mutation receipts；
- notes/attachments 返回值去 raw object。

## 8. Canonical mutations、receipt 与 revision

v12 不建立 persistent mutation ledger，也不承诺 mutation 的跨进程 resume、replay、duplicate suppression 或 receipt verification。所有 operation reservation、idempotency binding、result snapshot 与 receipt evidence 只存在于 bounded process-local registries；Host restart 后以 fresh Zotero state 为准。Synthesis sidecar 的 tag-audit active ledger 是独立的 durable domain state，不得与 mutation registry 混为一谈。

### 8.1 Mutation receipt

canonical `mutations.execute` 应返回 strict-JSON、Host-issued receipt，至少可表达：

- stable mutation entity ref；
- receipt/operation identity；
- per-entity before/after revision；
- confirmed committed/unchanged outcome；
- stable operation kind；
- retry/idempotency basis。

workflow 不能自行填写或伪造 revision。unknown outcome 不能用于确认 Synthesis audit 状态。

### 8.2 Revision ownership

- Host-issued opaque `revision` 是每个 canonical mutation entity 唯一的 public version fact；不公开第二套 numeric mutation epoch。
- v12 canonical mutation evidence 支持 item 与 collection 两种 entity；两者 revision 独立，不能跨 entity 比较。
- canonical Host mutation adapter 在 commit 前比较 expected/current revision，并在 receipt 中记录 before/after revision。
- revision 必须随契约定义的 observable entity state 变化；caller 不解析或排序 revision，只做 equality/CAS。
- permanent deletion 的当次 receipt 使用 Host-issued tombstone revision 表达 confirmed after-state；v12 不承诺在进程重启后继续解析或验证该 tombstone。
- fresh Host read/reconciliation 是 revision correctness 的依据；item/collection observer（若宿主提供）只负责 cache invalidation、提前标 stale 与外部变化通知，不是 correctness SSOT。
- Host 内部可以使用 monotonic counter、native Zotero version、content fingerprint 或组合实现 revision，但内部 epoch 不进入 Workflow Host、receipt 或 Synthesis contract。
- Broker 不依赖 Synthesis；receipt 与 sidecar audit 的协调发生在 composition adapter。

### 8.3 Confirmed receipt 与 attempt report

canonical `MutationReceipt` 只证明 Host 已确认的 final state。失败或不确定执行使用不同类型，不能生成一张看起来像成功凭证的 receipt：

```ts
type MutationExecutionResult<TResult extends JsonObject> =
  | {
      outcome: "committed" | "unchanged";
      receipt: MutationReceipt;
      result: TResult;
    }
  | {
      outcome: "failed" | "canceled" | "unknown" | "repair_required";
      attempt: MutationAttemptReport;
    };
```

语义：

- `committed` 表示 Host 已确认 target mutation 达到声明状态；
- `unchanged` 表示 Host 已确认 target state 原本已经满足 request，作为 idempotent success 仍可签发 receipt；
- success `result` 是 operation-specific strict-JSON DTO，由签发 receipt 时的同一次 confirmed final read 生成；
- `failed`、`canceled`、`unknown`、`repair_required` 只返回 attempt report；
- `canceled` 表示写入未提交且执行因已接受的取消请求正常终止；它与 Host 执行失败分开表达；
- attempt report 可以记录 attempted steps、可能受影响 refs 与 cleanup evidence，但不是 commit proof；
- `synthesis.tags.acknowledgeRegulation` 的输入类型只接受 confirmed `MutationReceipt`；
- unknown outcome 即使很可能已经写入，也不能 acknowledge audit；
- repair 完成后必须重新读取并核验最终 Zotero state；只有核验成功才能签发新的 confirmed receipt。

相同 `operationId` retry 在当前 Host process 内先查询 bounded mutation registry：

- 已存在 confirmed receipt 时直接返回当前进程内保存的原 receipt 与原 result snapshot；
- process-local state 为 unknown/repair-required 时禁止盲目 replay；caller 必须 fresh-read/reconcile 后使用新 operation identity；
- 已确认 failed 且无 write effects 时，才允许根据 operation policy 重新执行。

进程重启后 registry 清空。v12 不恢复旧 operation、不重放旧 result，也不把旧 receipt 当作可验证 evidence。

receipt 与 attempt report 使用不同 schemas/types；不得依靠一个 optional `ok` 或 `receipt?:` 字段让 caller 猜结果可信度。

所有 canonical mutations 以及接入同一 mutation authority 的 `notes`、`attachments` 等 specialized write modules 都复用这一 envelope，只替换 `TResult`。result 不是第二份 commit proof：

- bounded process-local registry 保存 canonical result snapshot 与 digest；
- same-process same-operation replay 返回原 receipt 与原 result，不能在 replay 时 fresh-read 后静默换成更新状态；
- caller 需要当前状态时显式调用 `library` read；
- result DTO 不包含 raw Zotero object、native error、local adapter、未清洗 path 或 optional success/error 混合字段；
- failure/canceled/unknown/repair-required 分支没有 `result`；
- 各 operation 不得另建 `ok`、`error`、`receipt?` 等平行 envelope。

### 8.4 Mutation receipt envelope 与 process-local verification

confirmed receipt 是小而可核验的 commit proof，不携带完整 request/content/path：

```ts
type MutationEntityRef =
  | { kind: "item"; ref: PortableItemRef }
  | { kind: "collection"; ref: PortableCollectionRef };

type ItemMutationVersionDto = {
  revision: string;
  state: "active" | "trashed" | "deleted";
};

type CollectionMutationVersionDto = {
  revision: string;
  state: "active" | "deleted";
};

type MutationChangeDto =
  | {
      entity: { kind: "item"; ref: PortableItemRef };
      effect:
        | "created"
        | "updated"
        | "trashed"
        | "deleted"
        | "unchanged";
      before: ItemMutationVersionDto | null;
      after: ItemMutationVersionDto;
    }
  | {
      entity: { kind: "collection"; ref: PortableCollectionRef };
      effect: "created" | "updated" | "deleted" | "unchanged";
      before: CollectionMutationVersionDto | null;
      after: CollectionMutationVersionDto;
    };

type MutationReceipt = {
  schema: "zotero-agents.mutation-receipt.v1";
  receiptId: string;
  operationId: string;
  operation: MutationReceiptOperation;
  outcome: "committed" | "unchanged";
  committedAt: string;
  effectDigest: string;
  changes: MutationChangeDto[];
};
```

generic execute operation 与 receipt operation 使用两个不同、各自闭合的 unions：

```ts
type MutationReceiptOperation =
  | MutationOperation
  | "notes.create"
  | "notes.updateContent"
  | "notes.remove"
  | "notes.upsertPayload"
  | "attachments.create"
  | "attachments.updateMetadata"
  | "attachments.replaceFile"
  | "attachments.move"
  | "attachments.remove"
  | "statusTags.transition"
  | "researchBundles.importPapers";
```

`MutationOperation` 仍严格等于 §8.13 的 11 项，只用于 `mutations.execute`。扩大 receipt discriminant 是为了让接入同一 mutation authority 的 specialized deep modules 使用同一 evidence contract；它不允许 caller 把 specialized member 名塞进 generic dispatcher。

identity 与 change semantics：

- `receiptId` 由 Host 生成，caller 不能指定；
- `operationId` 由 caller 提供并用于当前 Host process 内的 idempotency；普通 single-unit operation 只有一个最终 confirmed receipt；明确支持 partial success 的 `researchBundles.importPapers` 可以按 committed consistency group 签发多张 receipts，但它们共享同一 operation ID，并作为同一 registry result snapshot 的闭合 receipt set 保存；
- `changes` 只列真正被写入或被核验 unchanged 的 targets；仅作为 relation evidence、但未被写入的 target 不进入 changes；
- create 的 `before` 为 null；
- permanent item/collection delete 在当次 receipt 中使用 tombstone revision，after state 为 deleted；
- unchanged target 的 before/after 相同，effect 为 unchanged；
- `revision` 是对应 entity 唯一的 read/CAS version token，workflow 不得生成或解释；
- `effectDigest` 绑定 canonical operation input、confirmed outcome 与 normalized change set。

`MutationEntityRef` 暂时只包含 `item | collection`。note 与 attachment 继续使用 Zotero item identity，不新增平行的 entity kind；library、file、resource 或其他内部对象不进入该 union。generic `mutations` 的公开 operation 范围仍由独立 closed union 控制，不能因为 receipt 能表达 item ref 就自动暴露 note/attachment writes。

receipt 不包含 raw ref、native error、完整正文/tag set、file path、bytes 或 cleanup internals。

Host 维护 bounded process-local mutation registry。任何需要信任 receipt 的 composition adapter（包括 `synthesis.tags.acknowledgeRegulation`）必须在签发 receipt 的同一 Host process 内：

1. 按 `receiptId` 查 canonical record；
2. 核对 operation ID、operation kind、effect digest 与目标 before/after revisions；
3. 只信 registry record，不单凭 caller 传入的 JSON；
4. fresh-read current Zotero state，不能把 process-local record 当作 current-state SSOT。

registry 按容量与时间有界，随 Host process 结束而清空。receipt 不持久化为跨进程 proof；重启后 `acknowledgeRegulation` 必须拒绝旧 receipt，caller 重新读取当前状态并在新的 regulation run 中获得新 receipt。mutation 成功而 acknowledgement 尚未完成时发生重启，sidecar active row 保留；下次运行可以基于 fresh state 签发新的 `unchanged` 或 `committed` receipt 后再 acknowledge。

receipt DTO 是 portable evidence reference，不是 bearer authorization token。authorization/exposure 仍由调用 adapter 持有。

### 8.5 Canonical tag mutation 与 regulation evidence

普通 tag add/remove 合并为一次 canonical operation，避免两个 receipts 和可见中间状态：

```ts
mutations.execute({
  operation: "item.updateTags";
  operationId: string;
  itemRef: PortableItemRef;
  expectedRevision?: string;
  add: string[];
  remove: string[];
}): Promise<MutationExecutionResult<{
  item: ItemDetailDto;
}>>;
```

v12 删除 public `item.addTags` 与 `item.removeTags`。`item.updateTags` 规则：

- Host 统一 normalize/deduplicate add/remove；
- 同一 normalized tag 同时出现在两组时拒绝；
- reserved status tags 不能通过该 operation 修改；
- current tag read failure 或 truncation fail closed；
- 未声明的普通 tags 保持不变；
- final state 与 current state 相同返回 confirmed `unchanged` receipt；
- tag changes 在一个 Zotero mutation boundary 中提交，不向 caller 暴露 add/remove 中间态。

process-local mutation registry 为该 operation 保留内部 evidence：

```ts
{
  requestedAdd: string[];
  requestedRemove: string[];
  actualAdded: string[];
  actualRemoved: string[];
  finalTagDigest: string;
}
```

这些详细 tag data 不进入公共 receipt；`synthesis.tags.acknowledgeRegulation` 按 receiptId 核验同进程 registry：

1. operation kind 必须是 `item.updateTags`；
2. receipt target 与 audit target 相同；
3. receipt before revision 等于 active audit row 的 audited revision；
4. requested/actual delta 在 canonical receipt record 内部一致；
5. receipt after revision 仍等于 item current revision；
6. current complete tag set digest 等于 registry `finalTagDigest`；
7. active snapshot vocabulary hash 仍为 current，并且 fresh final tags 全部合规；
8. unchanged receipt 也只有在 fresh final tags 已合规时才能 acknowledge；
9. receipt 后发生任何 relevant mutation 时返回 `stale`，不得 acknowledge；
10. `statusTags.transition` receipt 不可用于 ordinary tag-regulation acknowledgement。

v12 不建立 per-item staged regulation plan。audit staging 记录问题与 audited evidence；实际修改意图由 canonical `item.updateTags` request/receipt 表达，acknowledgement 以 verified final compliance 为准。

tag digest 使用 Host canonical normalization/order/hash 事实源；workflow 与 Synthesis 不自行实现第二套 hash normalization。

### 8.6 Tag audit revision matching

tag audit/regulation 使用 public opaque revision 完成两端一致性校验，不引入 public epoch：

```text
staged audit auditedRevision
        ==
tag receipt target before.revision

tag receipt target after.revision
        ==
fresh current item revision
```

协议语义：

- traversal/evaluation 为 staged audit row 保存 `auditedRevision`；
- 用于 regulation acknowledgement 的 `item.updateTags` 必须以该 revision 执行 CAS；
- receipt before revision 不匹配表示 plan 基于旧状态，返回 conflict；
- receipt after revision 与 fresh current revision 不匹配表示 tag mutation 后又发生变化，返回 stale；
- unchanged receipt 同样要求 audited/current revisions 一致；
- permanent deletion 后 fresh read 为 missing；当前进程内依赖该 entity active state 的旧 receipt 立即失效，v12 不承诺跨重启验证旧 receipt；
- Host 在 mutation 与 acknowledgement 边界 fresh-read/reconcile revision，不能仅依赖 observer cache；
- observer 可以提前 invalidation 和降低重复计算，但 correctness 不以 observer 及时到达为前提。

revision 表示 contract-visible item state。Host 可以内部使用 native version、dateModified、canonical state fingerprint、monotonic counter 或组合实现，但 public caller 只进行 equality/CAS。若 item 经多次外部操作最终回到完全相同的 contract-visible state，Host 可以把它视为相同状态；candidate 06 不需要暴露或比较修改次数。

### 8.7 Process-scoped operation identity 与 idempotency

public request 仍只提供 `operationId: string`，effective identity 只在当前 Host process 内成立：

```text
trusted adapter-derived caller scope
+
caller-provided operationId
```

scope 与 process-local reservation：

- caller scope 由可信 adapter 根据 workflow/package principal 注入，workflow 不能填写或伪造；
- 所有 canonical mutation 及接入同一 mutation authority 的 specialized writes 都要求 caller 提供非空 `operationId`；不使用 optional ID、Host 自动生成 ID 或按 operation kind 分成不同规则；
- operationId 只要求在同一 caller scope 内唯一；不同 workflow/package 的相同字符串不冲突；
- operationId 不是 secret、receipt ID 或 authorization token；
- Host 在任何 Zotero write 前于 bounded in-memory registry 原子创建 operation reservation；
- reservation 记录 canonical request digest、lifecycle state 与最终 receipt/result snapshot 或 attempt reference；
- registry 不写 SQLite、prefs、filesystem 或 sidecar；active operation 与仍被 callback 使用的 receipt 必须 pinned，不能在使用中淘汰；
- terminal record 从形成最终 result snapshot 起保证保留 10 minutes；之后按 LRU 淘汰。registry 最多 4,096 terminal records、serialized evidence/result snapshots 合计最多 256 MiB；若新 reservation 会迫使 Host 在保证期内淘汰 record，必须在任何 write 前返回 `resource_limited`，不能牺牲已承诺的 replay window；
- 被 open tag-audit acknowledgement flow 引用的 receipt 在 flow terminal 前额外 pinned；pin 只延长同进程可验证期，不产生 durable proof；Host shutdown 仍立即清空全部 records。

replay semantics：

- same scope + operationId + request digest，在 record 仍存在时返回原 confirmed receipt 与原 canonical result snapshot；
- 相同 identity 正在执行时等待同一结果，或返回 `conflict`，details reason 为 `operation_in_progress`；不得并行执行第二份 write；
- process-local state 为 unknown/repair-required 时不得自动 resume；caller fresh-read/reconcile 后使用新 operation identity；
- same scope + operationId 但 request digest 不同，返回 `conflict`，details reason 为 `idempotency_conflict`；
- confirmed failed 且无 effects 的 retry policy 由 operation 定义，但只在同一 process-local identity 上生效；
- process restart 后不保留 reservation、receipt、result snapshot 或 ID binding。同一字符串可在新 process 中成为新 operation identity；v12 不承诺跨进程 duplicate suppression。

保留 `operationId` 的目的只是在同一进程内防止 retry、re-entrancy、重复 UI 触发或并发提交造成重复 write，尤其保护 create、attachment import 与 graph import。它不表示 durable workflow identity，也不扩大为 crash recovery contract。

canonical request digest 忽略 object-key order 等非语义差异；operation kind、portable refs、expected revision、normalized tag delta 与其他语义输入的变化必须改变 digest。canonicalization/hash 只有一个 Host implementation SSOT。该 digest 只用于当前进程的 request binding，不是 durable identity、authorization 或跨重启 proof。

### 8.8 Mutation attempt、错误与恢复契约

未成功执行统一返回 strict-JSON `MutationAttemptReport`。稳定契约同时表达停止状态、失败阶段和下一步恢复动作，不能只给一个含义不清的 `retryable` boolean：

```ts
type MutationAttemptStatus =
  | "failed"
  | "canceled"
  | "unknown"
  | "repair_required";

type MutationPhase =
  | "validation"
  | "reservation"
  | "read"
  | "commit"
  | "verification"
  | "compensation";

type MutationRecovery =
  | "none"
  | "retry_same_operation"
  | "refresh_and_retry_new_operation"
  | "reconcile"
  | "manual_repair";

type MutationAttemptError = {
  [K in WorkflowHostErrorCode]: {
    code: K;
    phase: MutationPhase;
    recovery: MutationRecovery;
    message?: string;
    details: WorkflowHostErrorDetailsByCode[K];
  };
}[WorkflowHostErrorCode];

type MutationAttemptReport = {
  schema: "zotero-agents.mutation-attempt.v1";
  attemptId: string;
  operationId: string;
  operation: MutationReceiptOperation;
  status: MutationAttemptStatus;
  error: MutationAttemptError;
  affectedRefs: MutationEntityRef[];
  residualRefs: MutationEntityRef[];
};
```

字段语义：

- `code`、`phase`、`recovery` 是供程序判断的稳定字段；code 只允许 §17 的 closed `WorkflowHostErrorCode`；
- `attemptId` 由 Host 生成，用于 batch/partial result 引用 attempt evidence，不是 operation identity 或 receipt；
- `message` 只帮助人理解，不属于程序分支或精确文本契约；
- `details` 只能包含该错误码允许的 strict-JSON 字段，不包含 raw refs、native cause、宿主对象、本地路径或未清洗内容；
- `affectedRefs` 记录已知可能受影响的对象，`residualRefs` 记录补偿后仍已知存在的残留；
- `unknown` 下两个 ref 列表只代表已知下界，空数组不能被解释为“已经证明没有影响或残留”；
- `canceled` 是独立 attempt status；只有确认没有 commit 才能使用，取消与 commit 竞争且无法确认最终结果时必须返回 `unknown`；
- `failed` 必须是已确认失败；如果已经确认无写入且 operation policy 允许，可使用 `retry_same_operation`；
- revision conflict 使用 `refresh_and_retry_new_operation`，要求 fresh read、重算请求并分配新的 operation ID；
- 不确定 outcome 使用 `reconcile`，禁止直接重放；
- 已知存在未修复残留使用 `repair_required` + `manual_repair`。

`MutationReceipt` 与 `MutationAttemptReport` 的信任级别保持分离：前者是 confirmed commit proof，后者是诊断与恢复证据，任何 attempt status 都不能用于 Synthesis acknowledgement。

### 8.9 Canonical collection membership mutation

v12 将 collection membership 的 add/remove 合并为唯一 canonical operation：

```ts
mutations.execute({
  operation: "collection.updateMembership";
  operationId: string;
  collectionRef: PortableCollectionRef;
  expectedRevision?: string;
  add: PortableItemRef[];
  remove: PortableItemRef[];
}): Promise<MutationExecutionResult<{
  collection: CollectionDto;
  addedRefs: PortableItemRef[];
  removedRefs: PortableItemRef[];
}>>;
```

input 与 validation：

- Host 统一 normalize/deduplicate `add` 与 `remove`；
- 同一 item 同时出现在两组时拒绝；
- 规范化后两组都为空时拒绝无意义 request；
- collection 与所有 item 必须存在、active、属于同一 library，并满足 Zotero 原生 collection-membership eligibility；
- 所有 refs 与完整 batch 在任何 write 前解析和验证；
- item 数量受 centralized mutation batch hard limit 约束。

commit 与 evidence：

- add/remove 是一个逻辑提交，不向 caller 暴露两步之间的中间状态；
- Host 可以内部使用多个 Zotero write，但必须负责 final-state verification 与失败补偿；
- 请求包含部分 already-present/already-absent member 时，只提交实际 delta；
- 没有任何 actual membership delta 时返回 confirmed `unchanged` receipt；
- 部分或全部发生实际变化时返回一张 confirmed `committed` receipt；
- receipt `changes` 包含 collection，以及真正发生 membership 变化的 items；item detail 中的 collection membership 属于 contract-visible state，因此相关 item revision 必须同步变化；
- requested delta、actual delta 与 normalized final membership digest 保存在 process-local mutation registry，公共 receipt 不携带完整 collection member set；
- 底层多步提交无法完成时先补偿；最终状态不能确认时返回 `unknown`，已知存在未修复残留时返回 `repair_required`。

v12 删除 `collection.addItems` 与 `collection.removeItems`，不保留 alias。当前 collection-collector workflow 迁移为只填 `add` 的 `collection.updateMembership`；未来移动或批量替换 membership 也必须复用这一 operation，不能重新增加平行写入口。

### 8.10 Canonical collection metadata 与 placement update

collection rename 与 parent move 修改同一个 collection，并可在一次 Host save boundary 中完成。v12 只提供一个 operation：

```ts
mutations.execute({
  operation: "collection.update";
  operationId: string;
  collectionRef: PortableCollectionRef;
  expectedRevision?: string;
  patch: {
    name?: string;
    parentRef?: PortableCollectionRef | null;
  };
}): Promise<MutationExecutionResult<{
  collection: CollectionDto;
}>>;
```

patch semantics：

- `name` 不出现表示名称不变；`parentRef` 不出现表示 parent 不变；
- `parentRef: null` 表示移动为 top-level collection；
- name 与 parent 可以在同一次 operation 中修改，只生成一张 receipt；
- patch 必须至少包含一个字段；规范化 target state 与 current state 相同则返回 confirmed `unchanged`；
- collection name 使用 Host 的统一 normalization，并在 write 前执行非空、长度和非法字符校验。

placement 与 safety：

- target collection 必须存在且 active；
- non-null parent 必须存在、active、属于同一 library，且不能等于 target；
- Host 在任何 write 前读取并验证完整 ancestor chain，禁止 direct 或 indirect cycle；
- ancestor chain 读取不完整或 concurrent change 无法排除时 fail closed；
- `expectedRevision` 存在时执行 CAS；成功 receipt 记录 target collection 的 before/after revision；
- parent collection 只是 placement constraint，不因 child move 被错误记录为已修改；若 Zotero 实际改变 parent 的 contract-visible state，则必须按实际 revision change 进入同一 receipt。

v12 不增加 `collection.rename`、`collection.move`，也不保留 raw handler aliases。collection metadata/placement 的 validation、CAS、保存、final-state verification 与 error recovery 都由该 canonical operation 持有。

### 8.11 Canonical collection create

v12 collection creation 支持 top-level 与 child placement，并可原子声明 initial members：

```ts
mutations.execute({
  operation: "collection.create";
  operationId: string;
  name: string;
  placement:
    | {
        kind: "root";
        libraryId?: number;
      }
    | {
        kind: "child";
        parentRef: PortableCollectionRef;
      };
  initialMemberRefs?: PortableItemRef[];
}): Promise<MutationExecutionResult<{
  collection: CollectionDto;
}>>;
```

placement semantics：

- `root` 创建 top-level collection；未指定 `libraryId` 时使用 user library；
- `child` 从 `parentRef` 推导 library，不接受另一份可能冲突的 library ID；
- parent 必须存在、active、可编辑；
- name 与 parent 在任何 write 前完成 normalization、可访问性和 Zotero schema 校验；
- 成功只返回 portable strict-JSON `CollectionDto`，不返回 raw `Zotero.Collection`。

initial membership 与 atomicity：

- `initialMemberRefs` 缺省或为空表示创建 empty collection；
- non-empty initial members 必须在创建 collection 前全部解析，并通过 active、same-library、eligibility 与 centralized batch-limit 校验；
- initial membership 内部复用 `collection.updateMembership` 的 canonical normalization、delta 与 final-state verification implementation，不能复制第二套规则；
- collection create 与 initial membership 对 caller 是一个逻辑 operation 和一张 receipt；
- membership 写入失败时 Host 尝试删除刚创建的 collection；补偿失败返回 `repair_required`，不能签发成功 receipt；
- receipt `changes` 包含 created collection，以及 membership 实际改变的 items；
- 同一 Host process 内的 `operationId` replay 不得创建第二个 collection；
- create 没有 descendant deletion 风险，不强制 preview。

v12 不保留只接受 `{name, libraryId}` 并返回 raw collection 的 handler-shaped public create。所有 root/child collection creation 只通过该 operation。

### 8.12 Canonical collection removal

Zotero collection 没有 item-style trash state。v12 不虚构 sidecar soft-delete，只提供语义明确、强制 preview 的永久删除：

```ts
mutations.preview({
  operation: "collection.remove";
  collectionRef: PortableCollectionRef;
  childPolicy: "reject_if_present" | "cascade";
});

mutations.execute({
  operation: "collection.remove";
  operationId: string;
  collectionRef: PortableCollectionRef;
  expectedRevision: string;
  childPolicy: "reject_if_present" | "cascade";
  previewToken: string;
}): Promise<MutationExecutionResult<{
  removedRef: PortableCollectionRef;
}>>;
```

deletion policy：

- `preview` 是 execute 的强制前置；collection removal 不提供不经预览的快捷路径；
- `reject_if_present` 在存在任何 child collection 时拒绝执行；
- `cascade` 永久删除 preview 精确列出的 target 与全部 descendant collections；
- member items 始终保持 active，只解除其与被删 collections 的 membership；
- v12 不暴露 Zotero `deleteItems: true`，不能在删除 collection 时隐式把文献移入回收站；
- 不提供 `disposition: "trash"`，`CollectionMutationVersionDto` 继续只有 `active | deleted`。

preview、conflict 与 limits：

- preview 列出将删除的 collection refs、将解除的 membership、对应 revisions 与 bounded summary；
- `previewToken` 绑定 operation input、target revision、完整 descendant set、membership set 与 policy；
- execute 前 fresh-read target、descendants 与 membership；任何变化使 token 失效并返回 conflict；
- cascade collection/member 数量超过 centralized hard limit 时必须在任何 write 前拒绝；不能截断计划后继续删除。

commit 与 evidence：

- receipt `changes` 包含所有 deleted collection tombstones，以及 membership 实际变化的 item before/after revisions；
- member item 仍属于其他 collections 时不影响那些 memberships；
- Host 对多步 membership detach 与 collection erase 承担 final-state verification 和 compensation/reconciliation；
- 最终状态不能确认时返回 `unknown`，已知存在未修复残留时返回 `repair_required`；
- 同一 Host process 且 registry record 仍存在时，相同 `operationId` replay 只能返回原 outcome，不能对已经删除的 collection 再执行一遍。

v12 删除 handler-shaped public `collection.delete`，不保留 alias。底层 handler 若暂时作为 internal implementation primitive 保留，也不得绕过 canonical authority 暴露给 Workflow Host。

### 8.13 Closed canonical mutation union 与删除清单

v12 `mutations.execute` 的 public operation union 固定为 11 项：

```ts
type MutationOperation =
  | "item.create"
  | "item.updateMetadata"
  | "item.changeType"
  | "item.remove"
  | "item.updateTags"
  | "item.addRelated"
  | "item.removeRelated"
  | "collection.create"
  | "collection.update"
  | "collection.updateMembership"
  | "collection.remove";

type ItemCreateRequest = {
  operation: "item.create";
  operationId: string;
  libraryId?: number;
  itemType: string;
  fields: Record<string, string>;
  creators?: CreatorDto[];
  initialTags?: string[];
  collectionRefs?: PortableCollectionRef[];
  initialRelatedRefs?: PortableItemRef[];
};

type ItemUpdateMetadataRequest = {
  operation: "item.updateMetadata";
  operationId: string;
  itemRef: PortableItemRef;
  expectedRevision?: string;
  patch: {
    fields?: Record<string, string | null>;
    creators?: CreatorDto[];
  };
};

type ItemChangeTypeRequest = {
  operation: "item.changeType";
  operationId: string;
  itemRef: PortableItemRef;
  expectedRevision: string;
  targetItemType: string;
  incompatibleData: "reject" | "move_to_extra" | "drop";
  previewToken: string;
};

type ItemRemoveRequest = {
  operation: "item.remove";
  operationId: string;
  itemRef: PortableItemRef;
} & (
  | { disposition: "trash"; expectedRevision?: string }
  | {
      disposition: "permanent";
      expectedRevision: string;
      childPolicy: "reject_if_present" | "cascade";
      previewToken: string;
    }
);

type ItemUpdateTagsRequest = {
  operation: "item.updateTags";
  operationId: string;
  itemRef: PortableItemRef;
  expectedRevision?: string;
  add: string[];
  remove: string[];
};

type ItemAddRelatedRequest = {
  operation: "item.addRelated";
  operationId: string;
  sourceRef: PortableItemRef;
  relatedRef: PortableItemRef;
  expectedRevision?: string;
};

type ItemRemoveRelatedRequest = {
  operation: "item.removeRelated";
  operationId: string;
  sourceRef: PortableItemRef;
  relatedRef: PortableItemRef;
  expectedRevision?: string;
};

type CollectionCreateRequest = {
  operation: "collection.create";
  operationId: string;
  name: string;
  placement:
    | { kind: "root"; libraryId?: number }
    | { kind: "child"; parentRef: PortableCollectionRef };
  initialMemberRefs?: PortableItemRef[];
};

type CollectionUpdateRequest = {
  operation: "collection.update";
  operationId: string;
  collectionRef: PortableCollectionRef;
  expectedRevision?: string;
  patch: {
    name?: string;
    parentRef?: PortableCollectionRef | null;
  };
};

type CollectionUpdateMembershipRequest = {
  operation: "collection.updateMembership";
  operationId: string;
  collectionRef: PortableCollectionRef;
  expectedRevision?: string;
  add: PortableItemRef[];
  remove: PortableItemRef[];
};

type CollectionRemoveRequest = {
  operation: "collection.remove";
  operationId: string;
  collectionRef: PortableCollectionRef;
  expectedRevision: string;
  childPolicy: "reject_if_present" | "cascade";
  previewToken: string;
};

type MutationExecuteRequest =
  | ItemCreateRequest
  | ItemUpdateMetadataRequest
  | ItemChangeTypeRequest
  | ItemRemoveRequest
  | ItemUpdateTagsRequest
  | ItemAddRelatedRequest
  | ItemRemoveRelatedRequest
  | CollectionCreateRequest
  | CollectionUpdateRequest
  | CollectionUpdateMembershipRequest
  | CollectionRemoveRequest;

type MutationRequestByOperation = {
  "item.create": ItemCreateRequest;
  "item.updateMetadata": ItemUpdateMetadataRequest;
  "item.changeType": ItemChangeTypeRequest;
  "item.remove": ItemRemoveRequest;
  "item.updateTags": ItemUpdateTagsRequest;
  "item.addRelated": ItemAddRelatedRequest;
  "item.removeRelated": ItemRemoveRelatedRequest;
  "collection.create": CollectionCreateRequest;
  "collection.update": CollectionUpdateRequest;
  "collection.updateMembership": CollectionUpdateMembershipRequest;
  "collection.remove": CollectionRemoveRequest;
};

type MutationResultByOperation = {
  "item.create": { item: RegularItemDetailDto };
  "item.updateMetadata": { item: RegularItemDetailDto };
  "item.changeType": { item: RegularItemDetailDto };
  "item.remove": ItemRemovalResultDto;
  "item.updateTags": { item: ItemDetailDto };
  "item.addRelated": RelatedItemMutationResultDto;
  "item.removeRelated": RelatedItemMutationResultDto;
  "collection.create": { collection: CollectionDto };
  "collection.update": { collection: CollectionDto };
  "collection.updateMembership": CollectionMembershipResultDto;
  "collection.remove": CollectionRemovalResultDto;
};
```

其中 aliases 固定为：

```ts
type ItemRemovalResultDto = {
  itemRef: PortableItemRef;
  outcome: RemovalOutcome;
};

type CollectionMembershipResultDto = {
  collection: CollectionDto;
  addedRefs: PortableItemRef[];
  removedRefs: PortableItemRef[];
};

type CollectionRemovalResultDto = {
  removedRef: PortableCollectionRef;
};
```

canonical mutation budgets 固定为：`operationId` 最多 128 characters；单 request 最多 10,000 个 item/collection/relation refs；ordinary tag 的 `add` 与 `remove` 各最多 100 项且每项沿用 §5.4 的 200 UTF-16 code-unit 上限；单 item 最多 512 个 metadata fields、10,000 creators、10,000 initial collection/related refs；collection name 最多 1,024 UTF-16 code units；generic request、preview result 与 execute success result 的 serialized size 各最多 64 MiB。operation-specific 更小上限优先。超限必须在 reservation/write 前返回 `resource_limited`；不得截断 request、plan、observations、receipt changes 或 result。

`mutations.execute(closed union)` 是 Workflow Host 对具名 member 原则的有意例外。11 类 writes 共享 process-local operation reservation、revision/CAS、actual-delta validation、receipt/attempt envelope、compensation 与 final-state verification；`execute` 因此是 canonical mutation authority 的真实 external seam，而不是只做 string switch 的浅 dispatcher。read capabilities 没有这套共同 lifecycle，继续使用具名 library members，不据此引入 `read({ kind })`。

closed-union constraints：

- `operation` 不允许 `MutationOperation | string` 或 unknown-operation pass-through；
- 不使用所有 operation fields 都 optional 的宽请求袋；每个 request variant 只拥有自己的字段；
- Broker、Workflow Host adapter 与 fail-closed test adapter 必须穷尽处理 request union；
- Workflow Host 使用 member-level explicit projection 与 operation-specific adapter，不 spread 转发 request bag；
- Broker 未来增加 operation 不会自动进入 Workflow Host；新增 public operation 必须经过显式 v12 contract 变更；
- Host Bridge、CLI、MCP 继续是独立 projections，不能反向定义或自动继承该 union。

v11 public names 的删除与迁移：

| v11 name/surface | v12 owner |
| --- | --- |
| `item.updateFields` | `item.updateMetadata` |
| `item.addTags`、`item.removeTags` | `item.updateTags` |
| `collection.addItems`、`collection.removeItems` | `collection.updateMembership` |
| `item.attachFile` | `attachments.create` |
| `note.createChild` | `notes.create` |
| `note.update` | `notes.updateContent` |
| `note.upsertPayload` | `notes.upsertPayload` |
| `literature.ingest` | `researchBundles.importPapers` |
| raw `collection.delete` | `collection.remove` |
| raw `collection.replace` | 删除，不提供 public replacement |
| raw `host.items`、`host.parents`、`host.tags`、`host.collections` | 整个 public domain 删除 |

v12 不保留旧 operation aliases；unknown/removed name 返回 stable `unsupported_operation` error，不能静默映射。

`item.restore` 明确延期，不进入该 union。恢复会同时牵涉 regular item、note、attachment 的 owner 与 child cleanup 语义；未来加入时必须同步设计 `item.restore`、`notes.restore`、`attachments.restore`，不能通过 generic item operation 绕过专用 owners。Zotero UI 的人工恢复能力不受此决定影响。

### 8.14 Preview coverage 与 mandatory-token boundary

`mutations.preview` 只覆盖三类高风险 execute，使用独立的 closed discriminated request union：

```ts
type MutationPreviewOperation =
  | "item.changeType"
  | "item.remove" // request 固定 disposition: "permanent"
  | "collection.remove";

type MutationPreviewRequestByOperation = {
  "item.changeType": {
    operation: "item.changeType";
    itemRef: PortableItemRef;
    targetItemType: string;
    incompatibleData: "reject" | "move_to_extra" | "drop";
  };
  "item.remove": {
    operation: "item.remove";
    itemRef: PortableItemRef;
    disposition: "permanent";
    childPolicy: "reject_if_present" | "cascade";
  };
  "collection.remove": {
    operation: "collection.remove";
    collectionRef: PortableCollectionRef;
    childPolicy: "reject_if_present" | "cascade";
  };
};
```

preview 不是 execute reservation：

- preview request 不包含 `operationId`，不创建 mutation operation reservation；
- preview 严格只读，不得调用 `saveTx()`、`eraseTx()`、写 sidecar、创建 managed staging 或留下需要 cleanup 的 host state；
- 每个 variant 只接受对应 operation 的 semantic fields，不能退回 optional-field request bag；
- preview 使用与 execute 相同的 normalization、schema validation、ref resolution、policy 与 resource-limit SSOT；
- preview 返回 operation-specific normalized plan、observed revisions、actual delta 或 proposed target summary；
- execute 始终 fresh-read/revalidate；preview 本身不构成 authorization、reservation 或 write guarantee。

三类 preview 都签发 execute 必需的 opaque `previewToken`：

```text
item.changeType
item.remove where disposition == "permanent"
collection.remove
```

token semantics：

- `item.changeType` token 绑定规范化 input、source revision、schema mapping 与 incompatible-data plan；
- permanent `item.remove` token 绑定 target revision、child set、managed-resource cleanup plan 与 child policy；
- `collection.remove` token 绑定 target/descendant revisions、完整 descendant set、membership set 与 child policy；
- token 必须有 Host-controlled expiry/scope，并防止被另一个 operation/input/target 重放；
- execute fresh-read 后发现绑定状态变化时返回 conflict，不尝试按旧计划执行；
- `item.remove` with `trash` 不提供 preview，直接依赖 execute validation 与 optional `expectedRevision`。

其余八种 canonical operations 不提供 informational preview。caller 使用 `library` read、`expectedRevision` 和 execute 的 `committed | unchanged` outcome；不得为它们另建平行 dry-run member。`notes`、`attachments`、`researchBundles` 若存在真实且独特的预检语义，由各自 deep module 使用具名 interface 持有，不能塞回 generic preview。

Host Bridge 可以复用 Broker preview result 生成 approval prompt，但 authorization、confirmation 和 remote exposure 仍属于 Host Bridge projection。Workflow Host preview 不返回通用 `requiresConfirmation: true`，也不承载 Host Bridge policy。

### 8.15 Unified mutation preview result envelope

三种高风险 canonical operations 共用一个 preview result envelope，只替换 operation-specific `TPlan`：

```ts
type MutationEntityObservationDto =
  | {
      entity: { kind: "item"; ref: PortableItemRef };
      version: ItemMutationVersionDto;
    }
  | {
      entity: { kind: "collection"; ref: PortableCollectionRef };
      version: CollectionMutationVersionDto;
    };

type MutationPreviewResult<TPlan extends JsonObject> = {
  schema: "zotero-agents.mutation-preview.v1";
  operation: MutationPreviewOperation;
  outcome: "would_change" | "unchanged";
  observedAt: string;
  observations: MutationEntityObservationDto[];
  plan: TPlan;
  token: {
    value: string;
    expiresAt: string;
  };
};
```

semantics：

- `would_change` 表示按 observed state 执行会产生 actual mutation；`unchanged` 表示 current state 已满足 normalized request；
- `observations` 包含生成计划所依赖的 entity revisions，包括只作为 validation/placement/relation constraint、不会被写入的 parent 或 related targets；
- `plan` 是 operation-specific normalized difference，不回显宽泛原始 request bag；
- preserved、remapped、moved-to-extra、dropped、child/resource 与 detached-membership 语义全部进入 operation-specific `plan`；不再并列一个重复、开放的 warning channel；
- 任一必要读取失败、计划截断、超过 hard limit 或无法生成完整 observations 时 preview 整体失败；
- token 始终存在且为对应 execute 的必要输入，不保留 `required: false` 分支；
- invalid request、not found、revision conflict、resource limit 等使用 stable capability error，不增加 `outcome: "blocked"` 伪成功态；
- envelope 不包含 `requiresConfirmation`、authorization state、raw host object、本地路径或内部 cleanup implementation details；
- `observedAt` 只用于诊断/展示，不能代替 revision 或 token validity。

### 8.16 Mandatory preview token lifecycle

mandatory `previewToken` 是 Host-issued、caller-scoped、短期 plan evidence，不是 single-use reservation。v12 不维护 issued/claimed/consumed/released 状态机。

issuance 与 binding：

- token 签发时绑定 trusted caller scope、operation kind、normalized semantic input、plan digest、observed revisions 与 `expiresAt`；
- token 是 opaque plan evidence，不是 authorization、receipt、secret identity、operation reservation 或 durable operation ID；
- token TTL 固定为 issuance 后 15 minutes，并通过 `expiresAt` 告知 caller；caller 不自行延长；
- internal implementation 可以使用 process-local authenticated token 或 bounded TTL lookup record；具体机制不是公共 interface，且不得写 durable storage。

execute validation：

- execute 在任何 write 前验证 token scope、operation、normalized input、plan digest、observed revisions 与 expiry；
- token validation 不跳过 fresh-read。descendant/child/membership set、cleanup plan 或任何 bound revision 改变时返回 conflict；
- token 在 expiry 前可以再次提交，但重复 write protection 由 process-local `operationId` registry 与 fresh-state validation 负责；
- 第一次成功 execute 后，entity revision/type/existence 已变化，旧 token 后续提交不能再次产生相同 destructive effect；
- confirmed failed 且没有 write effect 时，只要 token 未过期且 fresh state 仍匹配，caller 可以按 operation policy 重试；
- `unknown` / `repair_required` 后不得用旧 token 盲目 replay；caller fresh-read、重新 preview 并使用新 operation identity。

Host process restart 会使所有 token 失效。caller 必须重新 preview 和 fresh-read；v12 不恢复 token 或执行状态。

reissue 与 digest：

- token 过期时 caller 重新 preview；若旧 operation ID 尚未进入 accepted write，可以继续使用，否则分配新 operation ID；
- canonical request digest 不包含 token 随机字节，而绑定 token 所证明的 normalized plan digest；
- 等价 plan 的 token reissue 不产生虚假 `idempotency_conflict`；不同 plan/revision 不能因换一张 token 逃过 request-digest 检查；
- implementation 必须在同一个 canonicalization/hash SSOT 中生成 request digest 与 plan digest。

### 8.17 Operation-specific preview plan mapping

preview envelope 统一，但 `plan` 不使用万能 `changes: JsonObject[]`。request operation 与 plan type 使用一个 closed mapping SSOT：

```ts
type ItemChangeTypeDataEntryDto =
  | { kind: "field"; field: string; value: string }
  | { kind: "creator"; index: number; creator: CreatorDto };

type ItemChangeTypePlan = {
  itemRef: PortableItemRef;
  sourceRevision: string;
  sourceItemType: string;
  targetItemType: string;
  incompatibleData: "reject" | "move_to_extra" | "drop";
  preservedFields: Record<string, string>;
  preservedCreators: CreatorDto[];
  remappedFields: Array<{
    sourceField: string;
    targetField: string;
    value: string;
  }>;
  movedToExtra: Array<{
    source: ItemChangeTypeDataEntryDto;
    serializedLine: string;
  }>;
  dropped: ItemChangeTypeDataEntryDto[];
  resultFields: Record<string, string>;
  resultCreators: CreatorDto[];
};

type ItemPermanentRemovePlan = {
  itemRef: PortableItemRef;
  revision: string;
  childPolicy: "reject_if_present" | "cascade";
  children: Array<{
    ref: PortableItemRef;
    kind: "note" | "attachment" | "annotation";
    revision: string;
  }>;
  managedResources: {
    storedFiles: number;
    noteImages: number;
    notePayloads: number;
    linkedFilesPreserved: number;
  };
  relationInvalidations: Array<{
    sourceRef: PortableItemRef;
    relatedRef: PortableItemRef;
  }>;
};

type CollectionRemovePlan = {
  collectionRef: PortableCollectionRef;
  childPolicy: "reject_if_present" | "cascade";
  deletedCollections: Array<{
    ref: PortableCollectionRef;
    revision: string;
  }>;
  detachedMemberships: Array<{
    collectionRef: PortableCollectionRef;
    itemRef: PortableItemRef;
    itemRevision: string;
  }>;
};

type MutationPlanByOperation = {
  "item.changeType": ItemChangeTypePlan;
  "item.remove": ItemPermanentRemovePlan;
  "collection.remove": CollectionRemovePlan;
};
```

上述三个 DTO 是 plan 的 exact shape。`ItemChangeTypePlan.resultFields/resultCreators` 是 preview 后的 canonical target projection，其他字段解释它如何由 source 得到；两者必须由同一次 schema mapping 计算，不能分别生成。`ItemPermanentRemovePlan.children` 与 `CollectionRemovePlan.deletedCollections/detachedMemberships` 都是完整集合，不是 sample。

typing 与 completeness：

```ts
preview<K extends MutationPreviewOperation>(
  request: MutationPreviewRequestByOperation[K],
): Promise<MutationPreviewResult<MutationPlanByOperation[K]>>;
```

- request mapping、plan mapping 与 operation union 必须由同一 TypeScript contract SSOT 派生；Broker、Workflow Host 与 tests 不各写一份 string switch catalog；
- plan ref lists 使用 Host canonical ordering；
- plan 只返回 normalized semantics，不同时保留 raw input；
- bounded metadata 可以返回 before/after；note body、file bytes、local path、raw host state 与 cleanup implementation 不进入 plan；
- destructive plan 必须完整列出受影响 entities；超过 hard limit 时 preview 整体失败，不能返回 sample/truncated plan；
- `CollectionRemovePlan` membership entry 使用 `{ collectionRef, itemRef }` portable pair；
- `outcome: "unchanged"` 仍返回可解释的 operation-specific no-op plan；
- operation-specific plan 是 caller-facing semantics，不包含 handler call order 或 compensator internals。

## 9. Tag audit deepening

### 9.1 Ownership

修正后的 owner 划分：

```text
Workflow Host library module
  拥有 Zotero library traversal、batch、cursor、budget、cancel

tag-auditor workflow module
  拥有标签合规规则与 batch evaluation

Synthesis sidecar tag-audit application
  拥有 durable staging、revision conflict、promotion、cleanup
```

### 9.2 完成标准

v12 主路径必须端到端 O(batch)：

- library read 有界；
- evaluation 有界；
- audit staging batch append；
- 不在 workflow 内累积整个 library 的 audit entries。

### 9.3 Active ledger 与 staging

- 现有 active ledger 在扫描期间持续可见。
- 新 run 使用 sidecar-owned、run-scoped durable staging。
- 只有 traversal 全部成功且 conflict check 通过时，才在 transaction 中 set-based promotion。
- canceled、resource_limited、conflicted 或 failed 时清理 staging，保留旧 ledger。
- cleanup 失败只作为 diagnostic，不覆盖原始取消或失败。
- abandoned staging 在启动或下次重试时清理。
- 空 library 的成功扫描必须能发布空 snapshot，删除旧 records。

### 9.4 Live consistency 与冲突

- traversal 为 live keyset traversal，不承诺 snapshot。
- staged row 记录相应 item 的 audited revision/basis。
- 任一 staged 判断过时，整次 promotion abort；禁止 partial publish。
- 用户触发或外部可观察的 tag mutation 优先，扫描不得恢复旧判断。
- conflict 返回结构化 `conflicted/retryable` outcome。
- 不自动重新扫描整库；上层显式决定重试。

### 9.5 Cancellation 与 progress

- Workflow runtime 提供通用、只读 `CancellationSignal`。
- Host 在 batch seam 检查取消，不逐 item 检查。
- 取消后 staging 清理，旧 ledger 保持可见。
- operation 必须显示 `canceled`，不能伪装为成功。
- progress 按 batch 并节流更新，不逐 item 写 SQLite 或发 toast。
- Synthesis operation/history 只记录运行状态与进度，不充当 ledger readiness 事实源。
- 只有 promotion 或 regulation acknowledgement 确认提交后才刷新 active ledger UI。

### 9.6 Callback-scoped audit run

Workflow-facing interface 使用 callback-scoped run，而不是暴露 `begin/append/finalize/abort` ordering：

```ts
synthesis.tags.withAuditRun({ libraryId }, { signal }, async (run) => {
  // traverseItems onBatch -> evaluate -> run.append(...)
});
```

facade 自动管理 begin、abort、cleanup 与 promotion。callback 必须留在 plugin process；底层 native RPC 只传 JSON-safe `runId/batch/revisions/commit/abort`。

### 9.7 Audit run identity、basis 与 concurrency

workflow-facing input 不接受 caller-generated run ID：

```ts
synthesis.tags.withAuditRun(
  {
    libraryId: number;
    vocabularyHash: string;
  },
  WorkflowCallControl,
  async (run) => {
    // run.append(...)
  },
);
```

exact callback contract：

```ts
type TagAuditRunRequestDto = {
  libraryId: number;
  vocabularyHash: string;
};

type TagAuditRunWriter = Readonly<{
  append(entries: TagAuditStagingEntry[]): Promise<void>;
}>;

type TagVocabularyRegulatorExportDto = {
  vocabularyHash: string;
  allowedTags: string[];
};
```

callback 必须返回本轮 `library.traverseItems` 的 exact result；返回其他值是 `invalid_request`。facade 根据该 result 自动决定 promotion 或 abort，workflow 不持有 finalize/abort member。

`TagAuditRunWriter`、callback signature、`LibraryTraversalResultDto` 与带 raw `MutationReceipt` 的 acknowledgement wrapper 是 trusted in-process Workflow Host types，保留在 `src/workflows/types.ts`。`packages/synthesis-contracts` 只拥有 strict-JSON request/result 与 native wire DTO，不得为了跨 package 复用而复制 Host receipt 或 callback declaration。

run identity：

- `auditRunId` 由 sidecar 生成；workflow 不能指定、读取后用于控制流或持久化；
- ID 只隔离 sidecar staging batches、promotion、abort 与 cleanup，不是 item/collection revision、mutation `operationId`、authorization token 或长期 domain identity；
- plugin-process facade 持有 callback/run-handle 关联，native RPC 只传 JSON-safe run ID 与 batch data；
- process interruption 后 retry 创建新 run ID，不 resume 或复用 abandoned run；
- callback 正常返回只表示可以尝试 promotion，最终成功以 sidecar transaction 的 promotion result 为准。

concurrency：

- 同一 library 同时最多一个 open tag-audit run；不同 libraries 可以并行；
- 第二个同库调用返回 `conflict`，details reason 为 `operation_in_progress`，不能 join 另一个 callback；
- sidecar begin 必须原子取得 per-library lease；race loser 不能创建可 append 的 staging run；
- internal run record 可以保存 lease owner、heartbeat、expiry 与 host-instance identity，用于识别 crash 后的 abandoned staging；这些字段不进入 Workflow Host。

每个 run 固定一个 `basisDigest`，由唯一 canonical hash SSOT 绑定：

- `libraryId`；
- caller 提供且 sidecar 核验的 current `vocabularyHash`；
- Host 从 trusted execution context 注入的 workflow package/content identity；
- audit contract version。

caller 不能伪造 package/content identity。begin 与 promotion 都核验 vocabulary hash；扫描期间 vocabulary 变化使 promotion conflict，旧 active ledger 保持可见。

grouped candidate 通过 invocation-late trusted resolver 取得：

```ts
type TagAuditExecutionIdentity = {
  hostInstanceId: string;
  principal: {
    packageId: string;
    workflowId: string;
    contentDigest: string;
  };
};
```

resolver 缺失或任一 identity 无法由 trusted loader/runtime 确认时，`withAuditRun` 必须在 native begin 前 fail closed。identity 不进入 `WorkflowCallControl`，workflow callback 不能填写；v11 cached Host projection 也不得缓存它。07 只建立 resolver seam，production runtime/loader 在 `harden-workflow-host-api-v12` 原子激活时绑定真实 package/content facts。

为给 caller 提供可信 basis，v12 深化 vocabulary regulator export：

```ts
synthesis.tags.exportVocabularyForRegulator(): Promise<{
  vocabularyHash: string;
  allowedTags: string[];
}>;
```

裸 `string[]` 返回值删除，不保留 alias。`allowedTags` 与 `vocabularyHash` 必须来自同一次 sidecar read；读取不完整或 hash 无法确认时整体失败。

### 9.8 Tag audit staging row 与 append semantics

staging 保存本轮每个 audited item 的判断与最小一致性证据，不复制完整 Zotero state：

```ts
type TagAuditStagingEntry =
  | {
      target: SynthesisHostItemRef;
      auditedRevision: string;
      auditedTagDigest: string;
      auditedTags: string[];
      evaluation: {
        state: "compliant";
      };
    }
  | {
      target: SynthesisHostItemRef;
      auditedRevision: string;
      auditedTagDigest: string;
      auditedTags: string[];
      evaluation: {
        state: "needs_regulation";
        nonCompliantTags: string[];
      };
    };
```

coverage 与 storage：

- staging 暂存本轮成功扫描的全部 items，包括 compliant items；
- 全量 staging 使 promotion 能证明本轮覆盖，并删除 active ledger 中已经恢复 compliant 的旧记录；
- promotion 后 active ledger 只保留 `needs_regulation` rows 与 snapshot metadata，不长期保存全部 compliant rows；
- `auditedTags` 只属于 append wire input；application 完成 canonical normalization、digest 与 subset 校验后不持久化完整 tag set；staging row 不保存完整 tag set、title、其他 metadata、raw item 或 local path；
- durable unique key 是 `(auditRunId, libraryId, itemKey)`；target library 必须等于 run library。

evidence：

- `auditedRevision` 来自 `library.traverseItems` 的同一 item DTO；
- `auditedTagDigest` 由 Host canonical tag normalization/order/hash SSOT 从同一次完整 tag read 生成，workflow 不实现第二套 hash；
- `auditedTags` 来自同一 traversal item 的 complete tags；application 必须独立核验 canonical order/deduplication 与 `auditedTagDigest`，不能只信 workflow 提交的 digest；
- revision 保护整个 contract-visible item state，tag digest 只证明 evaluation 对应的 tag set，不是第二套 revision；
- `compliant` / `needs_regulation` 使用判别联合，empty array 不承担多种状态含义；
- `nonCompliantTags` 必须 normalize、deduplicate、canonical sort，并且是 audited tag set 的子集；
- tag read incomplete、truncated 或 digest 无法确认时不得 append。

append 与 retry：

- callback facade/internal RPC 管理 monotonic batch sequence 与 canonical batch digest，workflow 不手工编号；
- batch entry count/bytes 使用 centralized hard limits；
- 任一 row invalid 时整批拒绝，不做 partial append；
- 同一 run 重复 append 相同 sequence、digest 与 rows 时返回 idempotent success；
- 相同 `(auditRunId, libraryId, itemKey)` 但 revision、tag digest 或 evaluation 不同，返回 `conflict`，details reason 为 `concurrent_modification`，本轮不可 promotion；
- duplicate target、library mismatch、invalid revision、digest mismatch 或 non-compliant tag 不属于 audited set 时 fail closed。

### 9.9 Traversal completion evidence 与 promotion gate

callback 必须返回 `library.traverseItems` 的正式 result；caller 不手工读取或拼装 completion evidence：

```ts
await synthesis.tags.withAuditRun(
  { libraryId, vocabularyHash },
  { signal },
  async (run) =>
    host.library.traverseItems(
      {
        libraryId,
        scope: "top-level-regular",
      },
      { signal },
      async (batch) => {
        await run.append(evaluate(batch));
      },
    ),
);
```

promotion 前，plugin composition facade 与 sidecar application 必须完成以下 gate：

1. traversal outcome 是 `completed`；
2. resolved library 与 audit run library 相同；
3. scope 是 `top-level-regular`，criteria 没有 collection/tag/itemType/query 等过滤；
4. completion evidence 由 Host verification seam 签发且属于当前 caller scope/run；
5. `visitedItems` 等于 staging unique-row count；
6. traversal `coverageDigest` 等于 staging `(itemRef, auditedRevision, auditedTagDigest)` canonical digest；
7. current vocabulary hash 与 run basis 相同；
8. promotion transaction 内的 fresh revision/conflict check 通过。

任一 gate 失败都 abort/cleanup staging，保留旧 active ledger。callback 正常 return 本身不构成 coverage proof；canceled、resource_limited、filtered 或 partial traversal 永远不能 promotion。

completion evidence 只在当前 local composition 中验证。sidecar 不反向依赖 Workflow Host/Broker；composition adapter 验证 Host evidence 后，把 verified coverage digest/count 作为 trusted internal commit input 传给 sidecar。

### 9.10 Active snapshot、promotion transaction 与 run result

active tag-audit ledger 每个 library 只有一份 snapshot metadata：

```ts
type TagAuditSnapshotSummaryDto = {
  schema: "zotero-agents.tag-audit-snapshot.v1";
  libraryId: number;
  snapshotRevision: string;
  vocabularyHash: string;
  basisDigest: string;
  coverageDigest: string;
  auditedItems: number;
  needsRegulation: number;
  publishedAt: string;
  updatedAt: string;
};
```

`snapshotRevision` 只标识 sidecar active-ledger snapshot，用于 UI/cache/read consistency；它不是 Zotero entity revision、mutation epoch 或修改次数。caller 不解析、排序或自行生成它。

workflow-facing `withAuditRun` result：

```ts
type TagAuditRunResultDto =
  | {
      outcome: "published";
      snapshot: TagAuditSnapshotSummaryDto;
    }
  | {
      outcome: "canceled";
      auditedItems: number;
    }
  | {
      outcome: "resource_limited";
      auditedItems: number;
      limit: "items" | "pages" | "duration";
    }
  | {
      outcome: "conflicted";
      auditedItems: number;
      conflictCount: number;
      conflicts: Array<{
        target: PortableItemRef;
        auditedRevision: string;
        currentRevision: string;
      }>;
      retryable: true;
    };
```

promotion 使用单一 SQLite transaction：

1. transaction boundary 内再次核验 verified completion evidence、basis、current vocabulary hash 与全部 staged item revisions；
2. 为该 library 生成新的 opaque `snapshotRevision`；
3. 删除旧 active `needs_regulation` rows；
4. 从 staging set-based 复制本轮 `needs_regulation` rows；
5. 写入新的 active snapshot metadata；
6. 标记 run 为 promoted；
7. 原子 commit。

publication semantics：

- promotion steps 必须全成或全不成；
- empty library 或全部 compliant 也发布合法 empty snapshot，并清除旧 active rows；
- `published` 只在 transaction commit 且 post-commit read-back 确认成功后返回；
- commit outcome 无法确认时按 durable run marker reconcile，不能盲目再次 promotion；
- `canceled`、`resource_limited`、`conflicted` 不改变 active ledger；
- conflict count 是完整计数，`conflicts` 可以返回 bounded canonical sample；sample truncation 只影响诊断，不影响 conflict outcome；
- `resource_limited` 不返回可续接同一 staging run 的 cursor；完整 publication 必须从新 run 重新扫描；
- callback/sidecar unexpected failure 由 facade 把 internal `SynthesisClientError` 归一化为 §17 的 stable Workflow Host error；不把 internal class/message 暴露给 workflow，也不伪装成正常 outcome；
- active-ledger UI notification 只能在 confirmed `published` 后发送。

### 9.11 Synthesis internal design input：run isolation 与 crash cleanup

本节不属于 Workflow Host v12 exact manifest，也不向 workflow caller 暴露 lease、fencing、heartbeat、sweep、cleanup state 或 repository ordering。它记录 sidecar 专项 design/spec 必须满足的内部正确性输入；Synthesis implementation 可以替换具体机制，只要保持同库 run 隔离、旧 run 不可 publish、terminal leftovers 不污染新 run、active ledger 原子可见与失败不覆盖 primary outcome 等可观察 invariants。

sidecar internal run lifecycle：

```text
open
  ├─ promoting -> promoted
  ├─ callback canceled/limited/conflicted/failed -> aborted
  └─ lease expired / host lost -> abandoned

cleanup: pending | complete | failed
```

lease fencing：

- sidecar 为 open run 签发 internal lease token；每次 append、heartbeat、abort 与 promotion 都核验当前 token；
- lease token 不进入 Workflow Host，不是 public epoch、revision、operation ID 或 authorization；
- plugin facade 在 batch seam 续租，不逐 item heartbeat；
- lease expiry/host loss 确认后 sidecar 可以把 run 标为 `abandoned`；
- abandoned run 的旧 callback 恢复后不能 append、abort 新 run 或 promotion；
- 同库新 run 只有在旧 lease 已确认失效、旧 run 已 durable 标记 abandoned 后才能取得新 lease；
- lease acquisition、fencing comparison 与 run state transition 是 sidecar application/repository 的单一事实源。

automatic terminal handling：

- callback 返回 canceled/resource_limited/conflicted 或抛错时 facade 自动 abort；
- workflow 不暴露 `beginRun`、`abortRun`、`cleanupRun`、`resumeRun` 或 lease-management members；
- abandoned staging 不支持续扫；retry 永远创建新 audit run。

cleanup 顺序：

1. 先持久化 terminal state，并释放 per-library lease；
2. 再按 `auditRunId` 删除 staging rows；
3. 删除成功标记 `cleanup: complete`；
4. 删除失败保留 `cleanup: failed` 与 stable diagnostic。

cleanup failure 不覆盖 primary canceled/conflicted/failed outcome，也不长期阻塞同库新扫描；run-scoped staging key 保证 terminal leftovers 与新 run 隔离。

repository schema v4 为 run、batch、staging、active snapshot/rows 与 acknowledgement records 建立独立 owner tables。v3 `synt_tag_audit` 缺少 snapshot、audited revision、tag digest、vocabulary、basis 与 coverage evidence，migration 只能把这些旧 derived rows 失效并记录数量，不能伪造为 v4 active ledger；vocabulary、staged suggestions、effects 与其他 source facts必须保留。已知同 profile/data identity 的 v3 repository marker 显式升级到 v4，未知 marker 继续 fail closed。migration 必须覆盖 backup、失败回滚与 reopen。

recovery sweep：

- plugin/sidecar startup 执行 bounded abandoned/terminal-run sweep；
- 同库下一次 begin 前优先清理该 library 的 terminal/abandoned staging；
- ordinary maintenance 可以继续按 batch 清理；
- sweeper 只删除 terminal 或 lease 已确认失效的 run，不能碰有效 open run；
- promotion 成功时 active replacement、promoted marker 与 staging delete 尽量在同一 SQLite transaction；
- commit outcome unknown 时先读取 durable run marker 与 active snapshot reconcile，再决定 cleanup；
- staging payload 清除后仍保留 bounded run summary/diagnostic，用于运维审计；不长期保留逐 item compliant rows。

### 9.12 Synthesis internal design input：operation telemetry

本节 telemetry shape、counters、throttle 与 retention 不进入 Workflow Host interface。它们由 Synthesis operation/history 专项 contract 持有，可在不改变 `withAuditRun`、active snapshot 或 acknowledgement semantics 的前提下独立演进。

sidecar 为每个 run 维护一条 bounded、可更新的 operation summary：

```ts
type TagAuditOperationSummaryDto = {
  schema: "zotero-agents.tag-audit-operation.v1";
  libraryId: number;
  phase:
    | "starting"
    | "traversing"
    | "verifying"
    | "promoting"
    | "cleaning"
    | "terminal";
  outcome:
    | "running"
    | "published"
    | "canceled"
    | "resource_limited"
    | "conflicted"
    | "failed"
    | "repair_required";
  counters: {
    visitedItems: number;
    stagedItems: number;
    needsRegulation: number;
    batches: number;
    conflicts: number;
  };
  startedAt: string;
  updatedAt: string;
  finishedAt?: string;
  publishedSnapshotRevision?: string;
  diagnostics: Array<{
    code: string;
    severity: "warning" | "error";
  }>;
};
```

reporting semantics：

- `withAuditRun` facade 自动产生 progress，不增加 workflow-facing `reportProgress()`；
- progress 最多按 batch，并经过 centralized throttle；不逐 item 写 SQLite、log 或 UI notification；
- live traversal 没有可信 total 时不伪造 percent/ETA；
- counters 在同一 run 中单调不减；
- `publishedSnapshotRevision` 只在 confirmed published 后出现；
- terminal outcome 必须与 `TagAuditRunResultDto` 或 error/reconcile 的最终结论一致；
- telemetry 不保存 tag strings、title、body、完整 item refs、local paths 或 callback/native error stack；
- diagnostics 只保留 stable code/severity；详细受控错误留在 internal runtime log；
- run summary 按数量/时间 retention policy 有界保留。

correctness separation：

- telemetry/progress/history update failure 只产生 bounded diagnostic，不改变 audit correctness；
- run lifecycle marker、lease、staging、promotion transaction 是 correctness state；这些写入失败必须终止本轮；
- operation/history 不充当 active ledger readiness SSOT；UI 读取 active ledger 时以 `TagAuditSnapshotSummaryDto` 与 active rows 为准；
- active-ledger UI invalidation 只在 confirmed publication 或 confirmed regulation acknowledgement 后触发。

### 9.13 Active audit row 与 regulation acknowledgement

promotion 后 active ledger 只保存需要整改的 rows：

```ts
type ActiveTagAuditEntry = {
  target: PortableItemRef;
  snapshotRevision: string;
  auditedRevision: string;
  auditedTagDigest: string;
  nonCompliantTags: string[];
};
```

v12 不增加 per-item regulation-plan staging table。`acknowledgeRegulation` 只接受 target 与 Host-issued mutation receipt：

```ts
type TagRegulationAcknowledgementRequestDto = {
  target: PortableItemRef;
  mutationReceipt: MutationReceipt;
};

type TagRegulationAcknowledgementResultDto =
  | {
      outcome: "acknowledged";
      snapshotRevision: string;
      remainingNeedsRegulation: number;
    }
  | {
      outcome: "already_acknowledged";
      snapshotRevision: string;
    }
  | {
      outcome: "stale";
      reason:
        | "item_revision_changed"
        | "audit_snapshot_changed"
        | "vocabulary_changed"
        | "final_tags_changed"
        | "still_noncompliant";
    }
  | {
      outcome: "conflict";
      reason:
        | "receipt_invalid"
        | "wrong_operation"
        | "wrong_target"
        | "audited_revision_mismatch"
        | "receipt_delta_inconsistent";
    }
  | {
      outcome: "not_found";
    };
```

public request 继续只包含 target 与 raw Host receipt；workflow 不自报 snapshot identity。composition 使用 two-phase native handshake：

```ts
type TagRegulationAcknowledgementPrepareRequestDto = {
  target: SynthesisHostItemRef;
  receiptId: string;
};

type TagRegulationAcknowledgementPrepareResultDto =
  | {
      outcome: "ready";
      target: SynthesisHostItemRef;
      snapshotRevision: string;
      auditedRevision: string;
      vocabularyHash: string;
      nonCompliantTags: string[];
    }
  | { outcome: "already_acknowledged"; snapshotRevision: string }
  | { outcome: "not_found" };

type TagRegulationVerifiedCommitDto = {
  schema: "zotero-agents.tag-regulation-verified-commit.v1";
  target: SynthesisHostItemRef;
  receiptId: string;
  expectedSnapshotRevision: string;
  auditedRevision: string;
  currentRevision: string;
  finalTagDigest: string;
  finalTags: string[];
  vocabularyHash: string;
};
```

composition verification：

1. Host process-local mutation registry 先按 raw receipt 全字段核验 receipt ID/effect digest、`item.updateTags` operation、target 与 private delta，并在 flow terminal 前 pin record；
2. `client.prepareTagRegulationAcknowledgement` 读取 target active row 与 snapshot，返回 commit 所需的 exact current basis；
3. receipt before revision 等于 prepared row `auditedRevision`，否则返回 `conflict/audited_revision_mismatch`；
4. Host fresh-read current item revision 与 complete tag set；
5. receipt after revision 等于 current revision；
6. current canonical tag digest 等于 registry `finalTagDigest`；
7. prepared snapshot vocabulary hash 等于 current vocabulary hash；
8. current ordinary tags 全部属于该 vocabulary，原 `nonCompliantTags` 已全部消失；
9. composition 只把 `TagRegulationVerifiedCommitDto` 交给 `client.commitTagRegulationAcknowledgement`；raw receipt、effect digest、requested/actual delta 与 public changes 不进入 native wire；
10. commit 或任一失败路径 terminal 后解除 receipt pin。

ack transaction：

- 全部验证通过后，单个 sidecar transaction 删除 active row、递减 `needsRegulation`、签发新 opaque `snapshotRevision`、更新 snapshot `updatedAt`，并保存按 receipt ID + target + original snapshot revision 索引的 acknowledgement record；
- `publishedAt` 保留原 full-audit publication time；`coverageDigest` 与 `auditedItems` 不因单条 acknowledgement 改写；
- row 已删除但存在相同 acknowledgement record 时返回 `already_acknowledged`；
- row 不存在且没有相同 record 时返回 `not_found`；
- newer snapshot 中同一 item 再次出现时，旧 receipt/ack record 不能删除新 row；
- prepare 后 snapshot 变化时 commit 返回 `stale/audit_snapshot_changed`；不得把旧 proof 套用到 newer snapshot；
- receipt 可以包含 caller 明确要求的其他 ordinary-tag delta；final state 完整合规即可，不要求匹配不存在的 staged plan；
- unchanged receipt 只有在 fresh final compliance 成立时才可 acknowledge；
- item/tag fresh read 由 Host/Broker 完成，sidecar 不直接读取 Zotero；
- acknowledgement 未通过时 active row 保留，可在原因修复后用同一 receipt 安全重试；
- Host restart 后 process registry 缺失时，即使 durable acknowledgement record 存在也先返回 `conflict/receipt_invalid`；durable record 不能升级为跨进程 receipt proof；
- active-ledger UI invalidation 只在 confirmed `acknowledged` 后发送。

## 10. Synthesis sidecar 与 WorkflowSynthesisApi

### 10.1 dev-refactor 的 current owner

已核实 production 链路：

```text
SynthesisProductionOwner
  -> reverse-host + supervisor
  -> Rust ProductionApplications
  -> application modules + SQLite repository
  -> native RPC
  -> grouped SynthesisClient
  -> WorkflowSynthesisApi projection
```

巨型 TypeScript `SynthesisService` 仍存在，但只属于 legacy/harness fallback，不是 production owner。v12 不得重新从它推导或 spread workflow surface。

### 10.2 分组 interface

v12 的 `WorkflowSynthesisApi` 采用领域分组：

```text
synthesis.workflowApply.*
synthesis.topics.*
synthesis.artifacts.*
synthesis.tags.*
```

分组按领域含义，不按 Rust transport 或 RPC 实现命名。

### 10.3 已确认补齐的 drift

dev-refactor 当前 projection 漏了两个真实 caller，v12 必须加入：

```text
synthesis.workflowApply.applyTopicPlan
synthesis.tags.promoteStagedTagSuggestions
```

### 10.4 Tag regulation acknowledgement

v12 删除 workflow-facing `clearTagAuditRecord`，改为：

```ts
synthesis.tags.acknowledgeRegulation({
  target,
  mutationReceipt,
});
```

已确认的语义：

- receipt 必须由 Host mutation authority 签发；
- composition adapter/sidecar 按第 9.13 节校验 receipt before/after revisions、audited revision、current revision、final tag digest 与 current vocabulary compliance；
- exact outcome union 为 `acknowledged`、`already_acknowledged`、`stale`、`conflict`、`not_found`；
- mutation 成功但 acknowledge 未通过时保留 active row；原因修复后可用同一 receipt 重试；
- `clearTagAuditRecord` 可暂留内部 legacy transport，但不进入 v12 projection；
- staged promotion 继续使用 dev-refactor 已有 durable effect/receipt composition，不把 `TagEffectAdapter` 暴露给 workflow。

### 10.5 Exact grouped member map

v12 `WorkflowSynthesisApi` 固定为 4 个领域分组、14 个成员：

```ts
synthesis: {
  workflowApply: {
    applyLiteratureDigest,
    applyTopicPlan,
    applyTopicSynthesisResult,
  },

  topics: {
    getReport,
  },

  artifacts: {
    readPaperArtifacts,
  },

  tags: {
    loadVocabulary,
    saveVocabulary,
    exportVocabularyForRegulator,
    listStagedSuggestions,
    stageSuggestions,
    promoteStagedSuggestions,
    discardStagedSuggestions,
    withAuditRun,
    acknowledgeRegulation,
  },
}
```

current flat name 到 v12 member 的迁移：

| Current flat member | v12 grouped member |
| --- | --- |
| `applyLiteratureDigestSidecar` | `workflowApply.applyLiteratureDigest` |
| `applyTopicPlan`（当前 projection 缺失） | `workflowApply.applyTopicPlan` |
| `applyTopicSynthesisResult` | `workflowApply.applyTopicSynthesisResult` |
| `getTopicReport` | `topics.getReport` |
| `readPaperArtifacts` | `artifacts.readPaperArtifacts` |
| `loadTagVocabulary` | `tags.loadVocabulary` |
| `saveTagVocabulary` | `tags.saveVocabulary` |
| `exportTagVocabularyForRegulator` | `tags.exportVocabularyForRegulator` |
| `listStagedTagSuggestions` | `tags.listStagedSuggestions` |
| `stageTagSuggestions` | `tags.stageSuggestions` |
| `promoteStagedTagSuggestions`（当前 projection 缺失） | `tags.promoteStagedSuggestions` |
| `discardStagedTagSuggestions` | `tags.discardStagedSuggestions` |
| `replaceTagAuditRecords` | 删除，由 `tags.withAuditRun` 取代 |
| `clearTagAuditRecord` | 删除，由 `tags.acknowledgeRegulation` 取代 |

07 的 active v11 adapter 只对十一项存在等价 grouped semantics 的 flat methods 做 delegation。`getTopicPlanningContext` 没有 v12 member，`replaceTagAuditRecords` 没有 complete traversal evidence，`clearTagAuditRecord` 没有 confirmed mutation receipt；三者必须保持窄的 invocation-late legacy client passthrough，直到 `harden-workflow-host-api-v12` 迁移 callers 后原子删除。不得伪造 evidence 来宣称全量 delegation。

projection 与 naming constraints：

- v12 不保留任何 flat alias；所有 builtin callers 迁移到 grouped interface；
- public name 不包含 implementation term `Sidecar`；
- 已有 group context 时删除 `Tag` / `Topic` 重复词，但不把不同语义压成 generic `get/save/apply` bag；
- `createWorkflowSynthesisHostApi` 使用逐成员显式对象字面量投影 grouped `SynthesisClient`；不得传播完整 client、spread、proxy 或 runtime capability catalog；
- `WorkflowSynthesisApi` 与 `createWorkflowSynthesisHostApi` 分别命名 grouped candidate type/builder；`WorkflowSynthesisV11Api` 与 `createWorkflowSynthesisV11Adapter` 分别命名 active flat compatibility type/builder，`src/workflows/hostApi.ts` 在 v12 activation 前只装配后者；
- `applyTopicPlan`、`withAuditRun`、`acknowledgeRegulation` 的 wire DTO 已分别在 §10.6、§9.7–§9.10 与 §9.13 冻结；
- native RPC、Rust applications、SQLite repository、bundle/materialization helpers、`TagEffectAdapter`、runtime filesystem adapter 与 legacy `SynthesisService` 全部保持 internal；
- legacy TypeScript service 可以暂留为 test/legacy adapter，但不能成为 WorkflowSynthesisApi 类型或行为的定义来源。

full canonical client/native wire 为 audit/acknowledgement 新增六个 internal operations：

```text
client.beginTagAuditRun
client.appendTagAuditRun
client.promoteTagAuditRun
client.abortTagAuditRun
client.prepareTagRegulationAcknowledgement
client.commitTagRegulationAcknowledgement
```

这些 operations 不进入 Workflow projection；`withAuditRun` 与 `acknowledgeRegulation` 是唯一 workflow-facing composition。既有 `client.applyTopicPlan`、`client.promoteStagedTagSuggestions` 与 v11 legacy replace/clear transport 不重复实现。

### 10.6 Synthesis wire-contract closure

除三个 v12 新成员外，既有 grouped members 直接使用 `packages/synthesis-contracts` 的 current-state request/result types：

| v12 member | canonical contract |
| --- | --- |
| `workflowApply.applyLiteratureDigest` | `SynthesisLiteratureDigestApplyRequest -> SynthesisLiteratureDigestApplyResult` |
| `workflowApply.applyTopicSynthesisResult` | `SynthesisTopicApplyRequest -> SynthesisTopicApplyResult` |
| `topics.getReport` | `SynthesisTopicReportRequest -> SynthesisTopicReportResult` |
| `artifacts.readPaperArtifacts` | `SynthesisPaperArtifactsRequest -> SynthesisPaperArtifactsResult` |
| `tags.loadVocabulary` | `void -> SynthesisTagVocabularySnapshot` |
| `tags.saveVocabulary` | `SynthesisTagVocabularySaveRequest -> SynthesisTagMutationResult` |
| `tags.exportVocabularyForRegulator` | v12 `TagVocabularyRegulatorExportDto` |
| `tags.listStagedSuggestions` | `void -> SynthesisTagStagedSuggestion[]` |
| `tags.stageSuggestions` | `SynthesisTagSuggestionStageRequest -> SynthesisTagStageResult` |
| `tags.promoteStagedSuggestions` | `SynthesisTagSelectionRequest -> SynthesisTagPromotionResult` |
| `tags.discardStagedSuggestions` | `SynthesisTagSelectionRequest -> SynthesisTagDiscardResult` |
| `tags.withAuditRun` | §9.7–§9.10 callback contract |
| `tags.acknowledgeRegulation` | §9.13 receipt-bound contract |

这些 types 必须从 canonical contract package 导入；Workflow Host 不复制字段级定义。v12 public input 删除当前 flat adapter 中的 `WorkflowLiteratureDigestApplyInput` raw item fields、`unknown` bundle、`resultContext.resolveArtifact` 与 `bundleReader.readText` callbacks。consumer 或 composition adapter 先把 workflow product materialize 成 strict Synthesis request，再跨 grouped seam；不得把 legacy convenience input 提升为 v12 contract。

`applyTopicPlan` 是唯一需要新增到 canonical package 的 workflow-apply wire contract：

```ts
type SynthesisTopicPlanActionDto = {
  action: "create" | "update" | "mark_stale" | "reactivate";
  topic_id: string;
  title?: string;
  definition?: string;
  aliases?: string[];
  scope?: {
    include: string[];
    exclude: string[];
  };
  resolver?: JsonObject;
  revision?: number;
  basis?: JsonValue[];
  provenance?: JsonValue[];
};

type SynthesisTopicRelationProposalDto = {
  source_topic_id: string;
  target_topic_id: string;
  relation:
    | "broader_than"
    | "related_to"
    | "overlaps_with"
    | "contrasts_with";
  status?: "suggested" | "confirmed" | "rejected";
  confidence?: number;
  provenance?: JsonValue[];
  evidence_refs?: JsonValue[];
};

type SynthesisTopicPlanApplyRequest = {
  kind: "topic_plan";
  operation: "reconcile";
  base_graph_hash: string;
  library_index_hash: string;
  topic_actions: SynthesisTopicPlanActionDto[];
  relation_proposals: SynthesisTopicRelationProposalDto[];
  coverage_manifest_path?: string;
  recommended_updates: string[];
};

type SynthesisTopicPlanDiagnosticDto = {
  code:
    | "topic_action_noop"
    | "topic_revision_conflict"
    | "relation_duplicate"
    | "relation_endpoint_missing"
    | "relation_cycle"
    | "coverage_stale";
  message: string;
  source_topic_id?: string;
  target_topic_id?: string;
};

type SynthesisCanonicalTransactionReceipt = {
  schema: "zotero-agents.synthesis-canonical-transaction-receipt.v1";
  transaction_id: string;
  operation: "topic_plan.reconcile";
  before_graph_hash: string;
  after_graph_hash: string;
  committed_at: string;
};

type SynthesisTopicPlanApplyResult = {
  status: "persisted" | "no_change" | "already_applied" | "conflict";
  graph_hash: string;
  coverage_stale: boolean;
  recommended_updates: string[];
  diagnostics: SynthesisTopicPlanDiagnosticDto[];
  receipt: SynthesisCanonicalTransactionReceipt | null;
};
```

`persisted` 必须带 receipt；其他 statuses 的 receipt 为 `null`。receipt 只证明 opaque transaction identity、固定 operation、提交时间与前后 graph basis，不暴露 repository record、lease、fencing 或 telemetry。action/relation IDs、hash、path 与 diagnostic fields 全部 bounded；request 最多 10,000 actions、20,000 relation proposals、serialized 64 MiB。`resolver/basis/provenance/evidence_refs` 只允许 strict `JsonValue`，不能继续使用 `Record<string, unknown>`、`unknown[]` 或 `Partial<SynthesisTopicGraphEdge>`。field naming 保留当前 workflow product 的 snake_case，以免新增无价值的双向 mapping。

三个新增 Synthesis members 的 public limits 同步固定：`withAuditRun` 每次 `append` 最多 500 rows、serialized 8 MiB，单 row 最多 100 个 audited tags 与 100 个 non-compliant tags，conflict result 最多返回 100 个 canonical samples；run 的总 items/pages/duration 直接继承并核验 callback 返回的 §5.3 traversal evidence，不建立第二套 caller knobs。`exportVocabularyForRegulator` 最多返回 100,000 个 tags、serialized 16 MiB。`acknowledgeRegulation` 是单 target operation，不接受 batch。所有更大的 durable staging、lease、telemetry 与 cleanup limits 仍属于 Synthesis internal contract，不进入 Workflow Host。

control RPC 的 1 MiB / 50,000-node envelope 不能反向缩小这些 public limits。`applyTopicPlan` request、audit append request 与 regulator-vocabulary export result 超出 control envelope 时必须透明复用 existing bounded transfer plane；小 acknowledgement requests 继续走 control plane。operation policy、protocol registry、schema/corpus 与 composition 必须保持同一选择。

## 11. Legacy handler domain consolidation

v12 删除浅层 handler aliases：

- 顶层 `parents`
- 顶层 generic `tags`
- 顶层 `collections`

迁移方向：

- metadata update -> `item.updateMetadata` canonical mutation
- related-item write -> canonical related mutations
- note write -> explicit `notes` deep module
- generic tag write -> canonical mutations
- collection read -> `library.listCollections`
- collection write -> canonical mutations

保留 `notes` 与 `attachments`，但必须改成显式、窄、稳定的深层 modules，不再 alias/spread handlers。

保留 `statusTags`，因为它拥有独立 policy 与 transition semantics，不等同于 generic Zotero tags。

### 11.1 Note read/write ownership

note 的读取与写入采用不同 owner：

```text
library
  getItemNotes
  getNoteDetail
  listNotePayloads
  getNotePayload

notes
  create
  updateContent
  remove
  upsertPayload
```

`library` 是 note read 的唯一 Workflow Host owner。四个 read methods 必须只接受 portable refs，并返回 strict-JSON DTO；不得返回 raw note、attachment 或其他 Zotero host object。

`notes` 是 note write 的唯一 Workflow Host owner。通用 `mutations.preview/execute` 不再重复投影 `note.*` operations，避免形成两套公开写入协议。`notes` 内部接入与其他 canonical mutations 相同的 mutation authority，并复用统一的：

- operation identity 与 retry/idempotency 机制；
- expected revision / CAS 并发检查；
- Host-issued mutation receipt；
- stable error taxonomy；
- cancellation 与 commit boundary；
- failure compensation、`unknown` outcome 与 stale handling。

`notes.create` 使用显式的 placement discriminated union 表达 top-level 与 child note，不使用一组可以互相冲突的 optional `libraryId`、`parentRef`、`collectionRefs`。`notes.updateContent`、`notes.remove` 不允许 caller 持有 raw note 后自行 `saveTx()` 或 `eraseTx()`。

`notes.upsertPayload` 是 payload 写入的高层 operation。payload attachment 的创建、anchor 更新、旧 attachment 清理、幂等判断和失败补偿全部属于该 deep module，workflow 不得自行编排这些低层步骤。

manifest request/result aliases 固定为：

```ts
type NoteDetailOptionsDto = {
  format: "html" | "text";
};

type NotePayloadOptionsDto = {
  payloadType: string;
};

type LogicalNotePayloadDto = {
  payloadType: string;
  noteKind: string;
  schemaVersion: string;
  format: "json" | "markdown" | "text";
  value: JsonValue;
};

type NoteCreateRequestDto = {
  operationId: string;
  placement:
    | {
        kind: "top_level";
        libraryId?: number;
        collectionRefs?: PortableCollectionRef[];
      }
    | {
        kind: "child";
        parentRef: PortableItemRef;
      };
  content: NoteContentInput;
  initialTags?: string[];
};

type NoteUpdateContentRequestDto = {
  operationId: string;
  noteRef: PortableItemRef;
  content: NoteContentInput;
  expectedRevision?: string;
};

type NoteRemoveRequestDto = {
  operationId: string;
  noteRef: PortableItemRef;
  disposition: RemovalDisposition;
  expectedRevision?: string;
};

type NoteRemovalResultDto = {
  noteRef: PortableItemRef;
  outcome: RemovalOutcome;
};

type NotePayloadUpsertRequestDto = {
  operationId: string;
  noteRef: PortableItemRef;
  expectedRevision?: string;
  payload: LogicalNotePayloadDto;
};

type NotePayloadUpsertResultDto = {
  note: NoteSummaryDto;
  payload: NotePayloadSummaryDto;
  outcome: "created" | "replaced" | "unchanged";
};
```

`images.prepareForNoteEmbedding` 继续作为纯转换能力保留。它不修改 Zotero library；其文件读取仍必须通过 `runtimePersistence` 选择的 adapter。prepared image 通过 Host-managed temporary ref 绑定到 `notes.create/updateContent` 的原子 content write，不允许携带 raw host object。

删除与迁移要求：

- 删除 workflow-facing `handlers.note` spread；
- 删除 `parents.addNote`；
- 删除 raw `notes.importEmbeddedImage`；
- 删除 builtin workflows 中的 `getNote()`、`getNotes()`、`getAttachments()`、`setNote()`、`saveTx()`、`eraseTx()`；
- 删除 note mutation 对 `host.items.*` 和 raw `attachmentItem` 的依赖；
- payload 与 embedded-image caller 迁移到上述高层 operations。

现有 note read pagination 还存在 limit/cursor 步长不一致的风险。v12 必须让内部 broker 与 adapter 共用同一个分页上限事实源；内部枚举必须按实际返回的 page boundary 或 broker continuation token 前进，不能按请求值猜测步长。该分页机制不进入 Workflow Host projection。

### 11.2 Note 与 payload 的完整结果读取契约

v12 不向 workflow 暴露 note/payload 读取的 pagination、offset、cursor 或 chunk 拼接。普通调用统一返回完整逻辑结果：

```ts
type NoteSummaryDto = {
  ref: PortableItemRef;
  parentRef: PortableItemRef | null;
  title: string;
  textExcerpt: string;
  textLength: number;
  htmlLength: number;
  revision: string;
};

type NoteDetailDto = {
  ref: PortableItemRef;
  parentRef: PortableItemRef | null;
  title: string;
  format: "html" | "text";
  content: string;
  revision: string;
};

library.getItemNotes(
  parentRef: PortableItemRef,
): Promise<NoteSummaryDto[]>;

library.getNoteDetail(
  noteRef: PortableItemRef,
  options: {
    format: "html" | "text";
  },
): Promise<NoteDetailDto>;

library.listNotePayloads(
  noteRef: PortableItemRef,
): Promise<NotePayloadSummaryDto[]>;

library.getNotePayload(
  noteRef: PortableItemRef,
  options: {
    payloadType: string;
  },
): Promise<NotePayloadValueDto>;
```

调用方不需要理解或编排底层 pagination。Host implementation 可以在内部分页枚举、分块解码或流式读取，但不能把这些机制投影到 Workflow Host interface。

完整性规则：

- 成功时返回完整结果；
- 超出总量 budget 时返回稳定的 `resource_limited`，不得返回截断、部分或带 continuation token 的成功结果；
- 读取期间内容发生变化时，由 Host 在有界次数内重新读取；无法获得一致结果时返回 `conflict`，details reason 为 `concurrent_modification`；
- parent ref 不存在、目标类型错误或任何 child note 无法读取时明确失败，不得静默返回空列表或遗漏条目；
- note/payload 不存在、目标不是 note 或内容提取失败必须返回 stable error，不能伪装成空内容。

宽松的 v12 初始 hard limits：

- 单个普通 note 最多 50,000 字符；
- 单个 decoded payload 最多 1 MiB；
- 单个 parent 最多返回 500 条 child-note summaries；
- note summary excerpt 默认最多 800 字符，Host 不向 caller 暴露调整该值的分页参数。

这些上限是异常数据保护，不是普通读取的分页协议。未来若出现超过该范围的真实业务需求，应设计独立的 export/streaming deep operation，不在普通 note read members 上增加 cursor/chunk mode。

`getNoteDetail.options.format` 与 `getNotePayload.options.payloadType` 均为必填。未知 format 必须拒绝，不得静默回退为 `text`；未指定 payload type 时不得默认选择第一个 payload；同一 note 中存在多个同 type payload 时返回 `conflict`，details reason 为 `ambiguous_state`。

所有 DTO 都是 strict JSON，不包含 raw item、raw attachment、native error、宿主对象、本地 path 或内部读取状态。

### 11.3 Payload provenance 与健康状态

Workflow Host 不向 workflow 暴露 payload attachment 的底层读写过程，但会暴露有限、portable 的 storage provenance 与 health 信息，用于诊断、迁移和修复：

```ts
type NotePayloadSummaryDto = {
  payloadType: string;
  noteKind: string;
  version: string;
  format: "json" | "markdown" | "text";
  encoding: string;
  estimatedBytes: number;
  source:
    | { kind: "inline" }
    | {
        kind: "embedded_attachment";
        attachmentRef: PortableItemRef;
      };
  state: "available" | "stale" | "missing" | "invalid";
  issues: NotePayloadIssueDto[];
};

type NotePayloadIssueDto =
  | { code: "anchor_stale"; retryable: true }
  | { code: "attachment_missing"; retryable: false }
  | { code: "attachment_unreadable"; retryable: true }
  | { code: "content_invalid"; retryable: false };
```

字段语义：

- `source` 表达当前 payload 的物理来源，但不要求 workflow 根据来源选择读取 adapter；
- `attachmentRef` 只用于 portable identity、诊断和受控修复，不提供直接修改 payload attachment 的授权；
- `state` 区分正常可读、引用过期、附件缺失和内容无效；
- `issues` 只允许上述四个 stable variants，不把内部异常文案、native cause 或 stack 当作契约；`state` 与 issue 必须一致，`available` 的 issues 固定为空数组；
- 不暴露本地 path、HTML selector、内部 anchor、encoded raw block 或 raw attachment；
- 正常读取仍按 logical `payloadType` 进行，caller 不得提交 storage location 作为读取或写入选择参数。

即使 summary 返回 `attachmentRef`，payload 写入与修复仍必须通过 `notes.upsertPayload` 等 note deep operations。workflow 不得通过 generic attachment mutation 绕过 note anchor、幂等判断、revision、receipt 和失败补偿。

`getNotePayload` 的成功结果统一为：

```ts
type NotePayloadValueDto = {
  summary: NotePayloadSummaryDto;
  value: JsonValue;
};
```

返回语义：

- JSON payload 的 `value` 是解析后的 strict JSON value；
- Markdown/text payload 的 `value` 是字符串，字符串本身属于 `JsonValue`；
- logical type、format、version、source 与 health 统一来自 `summary`；
- 不同时返回 `payload`、`markdown`、`content`、`decodedText` 或 encoded raw block 等重叠表示；
- 只有 `summary.state === "available"` 才能成功返回 value；
- `missing`、`stale`、`invalid` 分别返回 stable error，不能包装成 value 缺失的成功结果；
- decoded result 超过 1 MiB 时返回 `resource_limited`，不得截断。

普通 caller 只需消费 `value`。需要诊断、迁移或解释格式时再读取 `summary`，不要求所有 caller 理解 payload storage implementation。

### 11.4 Note 创建契约

note 创建只使用一个 public member。top-level 与 child 的差异由 placement discriminated union 表达，共享输入和返回值只定义一次：

```ts
notes.create({
  operationId: string;
  placement:
    | {
        kind: "top_level";
        libraryId?: number;
        collectionRefs?: PortableCollectionRef[];
      }
    | {
        kind: "child";
        parentRef: PortableItemRef;
      };
  content: NoteContentInput;
  initialTags?: string[];
}): Promise<MutationExecutionResult<{
  note: NoteSummaryDto;
}>>;
```

创建语义：

- `top_level` 未指定 `libraryId` 时使用 user library；
- 只有 `top_level` placement 可以指定 `collectionRefs`；所有 collections 必须存在、active 且与目标 library 相同；
- `child` placement 必须提供 `parentRef`，library 由 parent 决定，不能另行指定 library 或 collections；
- `initialTags` 与 note 创建属于同一次 operation，不能让 caller 在创建后另行编排初始 tag mutation；
- `operationId` 必填；同一 operation 的安全重试不得重复创建 note；
- `text` 由 Host 安全转换为 note HTML，`html` 由 Host 统一校验与规范化；
- 空内容、超过 50,000 字符、无效 parent、无效或跨库 collection 必须在 commit 前失败；
- 不接受独立 `title`。Zotero note title 由 note content 派生，Host 不提供会被静默忽略的假能力；
- 成功只返回 portable `NoteSummaryDto` 与 Host-issued receipt，不返回 raw note。

不采用将 `libraryId`、`parentRef`、`collectionRefs` 全部放在同一层的 optional-field request。该结构会允许冲突或无意义组合，并迫使 implementation 与每个 caller 重复推断 placement。

### 11.5 Note 正文更新契约

v12 不暴露含义宽泛的 `notes.update`。note-specific write 收紧为完整正文替换：

```ts
notes.updateContent({
  operationId: string;
  noteRef: PortableItemRef;
  content: NoteContentInput;
  expectedRevision?: string;
}): Promise<MutationExecutionResult<{
  note: NoteSummaryDto;
}>>;
```

`NoteSummaryDto` 与 `NoteDetailDto` 都包含 Host-issued opaque `revision: string`。caller 不能解析或生成 revision，只能把 read result 中的值原样传回。

更新语义：

- `operationId` 必填，负责 retry/idempotency；
- `expectedRevision` 可选，负责 compare-and-swap concurrency protection；
- 基于旧正文计算新正文的 caller 应传 `expectedRevision`；若读取后 note 已变化，返回 `conflict`，details reason 为 `revision_mismatch`，不得覆盖新内容；
- caller 明确要求 unconditional replace 时可以省略 `expectedRevision`；
- 只支持完整正文替换，不加入 HTML boundary 含糊的 append 或局部 patch mode；
- `text` 与 `html` 使用与 create 相同的转换、校验、规范化和 50,000 字符 hard limit；
- 目标不存在、不是 note、已删除或 revision 不匹配时必须在 commit 前失败；
- 成功返回新 revision 对应的 portable summary 与 Host-issued receipt。

note content 以外的 tag、collection、relation、attachment 等状态由各自 owner 管理，不得逐步塞回 `notes.updateContent` 形成 generic patch escape hatch。

### 11.6 Note 删除契约

`notes.remove` 使用一个 member，并通过必填 disposition 明确区分可恢复删除与永久删除：

```ts
notes.remove({
  operationId: string;
  noteRef: PortableItemRef;
  disposition: "trash" | "permanent";
  expectedRevision?: string;
}): Promise<MutationExecutionResult<{
  noteRef: PortableItemRef;
  outcome:
    | "trashed"
    | "permanently_deleted"
    | "already_trashed"
    | "already_absent";
}>>;
```

删除语义：

- `trash` 将 active note 移入 Zotero trash，可由用户恢复；
- `permanent` 永久删除 active 或 already-trashed note；
- `disposition` 没有默认值，caller 必须明确表达破坏程度；
- `expectedRevision` 可选，传入时对删除执行 compare-and-swap，避免误删读取后已被修改的 note；
- `operationId` 必填，同一 operation 的重试不得重复执行或改变原 outcome；
- 对 already-trashed note 再执行 `trash` 返回 `already_trashed`；
- 对不存在的 note 再执行删除返回 `already_absent`；
- `already_trashed` 与 `already_absent` 是幂等成功结果，但 receipt 必须表达 `unchanged`，不得声称产生了新 mutation；
- receipt 覆盖 note tombstone、parent 以及实际受影响的 payload/image attachment refs；
- embedded payload/image attachments 的清理与结果确认由 `notes` deep module 负责，caller 不得自行遍历并删除；
- 若 Host 无法确认删除是否 commit，返回 `unknown` mutation outcome，不得声称成功。

该设计取代当前含义不透明、直接调用 `eraseTx()` 的 handler `notes.remove`，同时补齐 Zotero trash 能力。

### 11.7 Payload upsert 契约

`notes.upsertPayload` 只接受 logical payload。caller 不选择 encoding、inline/attachment storage 或底层写入步骤：

```ts
notes.upsertPayload({
  operationId: string;
  noteRef: PortableItemRef;
  expectedRevision?: string;
  payload: LogicalNotePayloadDto;
}): Promise<MutationExecutionResult<{
  note: NoteSummaryDto;
  payload: NotePayloadSummaryDto;
  outcome: "created" | "replaced" | "unchanged";
}>>;
```

caller 只声明 payload identity、kind、schema version、logical format 与 value。Host 负责：

- 校验 logical value 与 1 MiB decoded hard limit；
- `markdown`/`text` format 只接受 string value；
- 计算 canonical payload hash；
- 根据 Host policy 选择 inline 或 embedded attachment；
- 选择 encoding；
- staging 新 attachment、更新 note anchor/content、清理旧 attachment；
- 推进 note 与受影响 items 的 revisions；
- 签发覆盖 note、新旧 attachments 的统一 receipt。

outcome 与冲突语义：

- 不存在对应 `payloadType` 时返回 `created`；
- 已有 logical content 与 schema identity 完全一致时返回 `unchanged`，不得重写 note 或 attachment；
- logical content 或 schema identity 不同时返回 `replaced`；
- 同一 note 中存在多个相同 `payloadType` 时返回 `conflict`，details reason 为 `ambiguous_state`，不得自动挑选或删除可能有价值的数据；
- `expectedRevision` 可选，传入时执行 CAS；
- 相同 `operationId` 重试返回原 operation 结果，不重复创建 attachment。

caller 不得传入 `encoding`、`source`、`attachmentRef` 或 storage preference。具体存储决策属于 `notes` deep module，不能成为 workflow policy。

若新 attachment 已创建而 note 更新失败，Host 必须尝试删除新 attachment，并保留原始失败为主错误。若 note 已更新但旧 attachment 清理无法确认，结果只能是 `repair_required` 或 `unknown`，不能返回完整成功。

### 11.8 Embedded image 与 content write 的原子边界

v12 不提供独立的 `notes.replaceEmbeddedImage` 或 raw `notes.importEmbeddedImage`。普通 embedded image 作为 note content 的一部分，由 `notes.create` 或 `notes.updateContent` 在一次 operation 中 materialize：

```ts
type NoteContentInput = {
  format: "html" | "text";
  value: string;
  embeddedImages?: Array<{
    slot: string;
    preparedImage: PreparedNoteImageRef;
    altText?: string;
  }>;
};
```

正文引用 stable logical `slot`，不引用 Zotero `attachmentKey`。Host 负责：

1. 在 commit 前校验正文、slot bindings、prepared images、总 byte budget、MIME 与 dimensions；
2. 为新图片创建 staged embedded attachments；
3. 将 logical slots materialize 为 Zotero note image references；
4. 一次提交完整 note content；
5. 清理被替换或不再引用的旧 plugin-managed image attachments；
6. 签发覆盖 note 与全部相关 attachments 的统一 receipt。

slot 与 binding 规则：

- 每个 slot 在一次 content input 中只能声明一次；
- duplicate slot、缺失 binding、未被正文引用的 binding 或非法 slot identifier 在写入前失败；
- `PreparedNoteImageRef` 是 Host-managed、operation-consumable temporary ref，不是 local path、Blob、raw bytes、raw attachment 或 Zotero key；
- caller 不解析 ref，也不自行读取或清理 staged image；
- `images.prepareForNoteEmbedding` 只做 bounded image conversion，不写 Zotero library；
- `text` content 不接受 embedded-image slots，带图片的内容必须明确使用 `html`。

失败语义：

- 任一图片 staging 失败时不修改 note，并清理本 operation 已创建的 staged attachments；
- attachments 已创建但 note content commit 失败时尝试删除全部新 attachments，并保留 note commit failure 为主错误；
- note 已 commit 但旧 attachment cleanup 无法确认时返回 `repair_required` 或 `unknown`，不能返回 atomic success；
- 同一 `operationId` 重试不得重复创建图片 attachments；
- receipt 必须表达每个 created/reused/removed/cleanup-unknown attachment ref。

该 seam 覆盖现有 representative image、score image、literature bundle 与 embedded payload caller 的普通图片写入需求。payload 自有 attachment 仍由 `notes.upsertPayload` 管理，不混入普通 content image bindings。

### 11.9 Prepared note image contract 与生命周期

`images.prepareForNoteEmbedding` 接受 portable source union，返回 workflow-run scoped managed ref 与 bounded metadata：

```ts
images.prepareForNoteEmbedding({
  source:
    | { kind: "file"; path: string }
    | { kind: "resource"; resourceRef: ResourceRef }
    | {
        kind: "base64";
        data: string;
        mimeType?: string;
      };
  options?: {
    maxLongEdge?: number;
    targetBytes?: number;
    hardMaxBytes?: number;
    outputFormat?: "auto" | "jpeg" | "png";
  };
}): Promise<{
  ref: PreparedNoteImageRef;
  mimeType: "image/jpeg" | "image/png";
  width: number;
  height: number;
  bytes: number;
  sha256: string;
}>;
```

manifest aliases：

```ts
type PreparedNoteImageRef = {
  kind: "prepared_note_image";
  id: string;
};

type PrepareNoteImageRequestDto = {
  source:
    | { kind: "file"; path: string }
    | { kind: "resource"; resourceRef: ResourceRef }
    | { kind: "base64"; data: string; mimeType?: string };
  options?: {
    maxLongEdge?: number;
    targetBytes?: number;
    hardMaxBytes?: number;
    outputFormat?: "auto" | "jpeg" | "png";
  };
};

type PreparedNoteImageDto = {
  ref: PreparedNoteImageRef;
  mimeType: "image/jpeg" | "image/png";
  width: number;
  height: number;
  bytes: number;
  sha256: string;
};
```

source 与 output 约束：

- `file` 读取必须晚绑定到 `runtimePersistence` 的 runtime adapter；
- `resource` 只接受当前 Host 可解析的 managed `ResourceRef`；
- `base64` 是 strict-JSON inline source，不接受 Blob、native stream、raw typed array 或 host object；
- decode 前先校验 encoded/decoded input size、declared/detected MIME 与 image signature；
- output 只允许经过验证的 JPEG 或 PNG；caller 不接触 prepared temp path 或 raw buffer。

生命周期：

- `PreparedNoteImageRef` 只在当前 workflow run 内有效；
- ref 可以在同一 run 内绑定到一次或多次 note content writes；
- ref 不得跨 run 持久化，也不能作为长期 workflow state；
- workflow run terminal 时 Host 自动清理所有 prepared images；
- `notes.create/updateContent` 失败不要求 caller 手工释放 ref；
- 相同 `operationId` replay 可以复用原 prepared content，但不得重复创建 Zotero attachments；
- expired ref 返回 `not_found` 且 details kind 为 `prepared_image`；foreign-run 或 forged ref 返回 `invalid_ref` 且 details kind 为 `prepared_image`；
- 不投影 workflow-facing `releasePreparedImage`，lifetime 与 cleanup 由 Host 持有。

caller 可以在绝对 hard limits 内调整压缩策略，不能绕过 Host resource policy：

- 单个输入图片 decoded size 最大 32 MiB；
- `maxLongEdge` 最大 8,192 pixels；
- `hardMaxBytes` 最大 8 MiB；
- 单个 workflow run 的 live prepared images 总量最大 64 MiB；
- options 必须满足 `targetBytes <= hardMaxBytes`；
- 超限统一返回 `resource_limited`，不得先执行无界 decode 再检查。

这些是 absolute safety bounds，不把 caller 锁定在当前 720px、180 KiB target、320 KiB hard cap 的默认策略内。Host 保留根据 source format、尺寸与质量目标选择具体 encoder 参数的责任。

### 11.10 普通 attachment ownership 与创建契约

普通 attachment 采用与 notes 相同的单一公开 owner 原则：

```text
library
  attachment reads

attachments
  create
  updateMetadata
  replaceFile
  move
  remove

notes internal adapters
  payload / embedded-image attachments
```

v12 不在通用 `mutations.preview/execute` 中重复投影 `item.attachFile`。`attachments` 内部仍接入统一 mutation authority、revision、receipt、idempotency 与 error model，但普通 attachment 的 workflow-facing write 只有 `attachments` 一条路径。

现有多个浅层创建方法合并为单一 discriminated-union operation：

```ts
attachments.create({
  operationId: string;
  placement:
    | {
        kind: "top_level";
        libraryId?: number;
        collectionRefs?: PortableCollectionRef[];
      }
    | {
        kind: "child";
        parentRef: PortableItemRef;
      };
  source:
    | {
        kind: "stored_file";
        main: StoredFileInput;
        companions?: CompanionFileInput[];
      }
    | {
        kind: "linked_file";
        path: string;
      }
    | {
        kind: "linked_url";
        url: string;
      }
    | {
        kind: "stored_url";
        url: string;
      };
  metadata?: {
    title?: string;
    contentType?: string;
    charset?: string;
    originalUrl?: string;
  };
}): Promise<MutationExecutionResult<{
  attachment: AttachmentDetailDto;
}>>;
```

manifest aliases 复用同一 placement/source/removal facts：

```ts
type AttachmentPlacementDto =
  | {
      kind: "top_level";
      libraryId?: number;
      collectionRefs?: PortableCollectionRef[];
    }
  | {
      kind: "child";
      parentRef: PortableItemRef;
    };

type AttachmentSourceDto =
  | {
      kind: "stored_file";
      main: StoredFileInput;
      companions?: CompanionFileInput[];
    }
  | { kind: "linked_file"; path: string }
  | { kind: "linked_url"; url: string }
  | { kind: "stored_url"; url: string };

type AttachmentCreateRequestDto = {
  operationId: string;
  placement: AttachmentPlacementDto;
  source: AttachmentSourceDto;
  metadata?: {
    title?: string;
    contentType?: string;
    charset?: string;
    originalUrl?: string;
  };
};

type AttachmentUpdateMetadataRequestDto = {
  operationId: string;
  attachmentRef: PortableItemRef;
  expectedRevision?: string;
  patch: {
    title?: string | null;
    url?: string | null;
    contentType?: string | null;
    charset?: string | null;
  };
};

type AttachmentReplaceFileRequestDto = {
  operationId: string;
  attachmentRef: PortableItemRef;
  expectedRevision?: string;
  source:
    | {
        kind: "stored_file";
        main: StoredFileInput;
        companions?: CompanionFileInput[];
      }
    | { kind: "linked_file"; path: string };
};

type AttachmentReplaceFileResultDto = {
  attachment: AttachmentDetailDto;
  outcome: "replaced" | "unchanged";
};

type AttachmentMoveRequestDto = {
  operationId: string;
  attachmentRef: PortableItemRef;
  expectedRevision?: string;
  placement:
    | {
        kind: "top_level";
        collectionRefs?: PortableCollectionRef[];
      }
    | {
        kind: "child";
        parentRef: PortableItemRef;
      };
};

type AttachmentMoveResultDto = {
  attachment: AttachmentDetailDto;
  outcome: "moved" | "unchanged";
};

type AttachmentRemoveRequestDto = {
  operationId: string;
  attachmentRef: PortableItemRef;
  disposition: RemovalDisposition;
  expectedRevision?: string;
};

type AttachmentRemovalResultDto = {
  attachmentRef: PortableItemRef;
  outcome: RemovalOutcome;
};
```

placement 语义：

- `top_level` 未指定 `libraryId` 时使用 user library，并且只有该 variant 可以指定 `collectionRefs`；
- `child` 必须提供 parent，library 由 parent 决定，不能另行指定 library 或 collections；
- Host 校验目标 library、parent、collections、attachment mode 与 Zotero library capability 的组合是否合法；
- 不用同层 optional `libraryId`、`parentRef`、`collectionRefs` 让 caller 或 implementation 猜 placement。

source 语义：

- `stored_file` 把 source 与 companions 导入 Zotero managed storage；
- `linked_file` 只建立对现有 local file 的 Zotero link，不复制内容；
- `linked_url` 只建立 URL attachment，不声称远程内容已经下载或 snapshot 已物化；
- `stored_url` 下载 URL content/snapshot 并发布到 Zotero managed storage；
- caller 必须明确 source kind，Host 不根据 path/URL 字符串猜 link mode；
- `WorkflowFileRef` 与 companion DTO 使用 §11.16 已冻结的 `local_path | resource` discriminated union；不得是 raw File、native stream 或 Zotero object。

删除与迁移清单：

- 删除 workflow-facing `handlers.attachment` spread；
- 删除公开 `createFromPath`、`importStoredFromPath`、`createFromUrl` 与 standalone `importStoredFile`；
- 删除 v12 public `mutations.item.attachFile`；
- 上述能力统一迁移到 `attachments.create` 的 source variants；
- 所有 raw attachment return、`getFilePathAsync()`、`.key` 与 `host.items.get/getByLibraryAndKey` caller 改用 DTO/ref；
- note payload 与 content image attachments 不允许作为 ordinary `attachments` write target，继续由 `notes` internal adapters 独占。

`attachments.create` 只返回 strict-JSON `AttachmentDetailDto` 与 Host-issued receipt，不返回 raw attachment、native path handle 或 Zotero item。

### 11.11 Attachment read DTO 与 locality

`library.getItemAttachments` 向 Workflow Host caller 返回完整 attachment DTO 数组，不暴露 pagination：

```ts
library.getItemAttachments(
  parentRef: PortableItemRef,
): Promise<AttachmentDetailDto[]>;

type AttachmentLinkMode =
  | "stored_file"
  | "stored_url"
  | "linked_file"
  | "linked_url"
  | "embedded_image";

type AttachmentDetailDto = {
  ref: PortableItemRef;
  parentRef: PortableItemRef | null;
  revision: string;
  title: string;
  filename: string | null;
  contentType: string | null;
  charset: string | null;
  url: string | null;
  linkMode: AttachmentLinkMode;
  role:
    | "ordinary"
    | "note_image"
    | "note_payload";
  file:
    | {
        state: "available";
        path: string;
        sizeBytes: number;
        modifiedAt: string | null;
      }
    | {
        state: "missing";
      }
    | {
        state: "not_applicable";
      };
};
```

读取语义：

- 成功返回 parent 的完整 attachment 列表，不让 caller 循环底层 page cursor；
- 单个 parent 最多返回 500 个 attachments，超出时整体返回 `resource_limited`，不得截断；
- 任一 attachment 无法序列化时整体失败，不静默遗漏；
- `file.state` 明确区分 local file available、应存在但 missing、以及 link mode 本来不适用 local file；
- `linkMode` 使用稳定 semantic enum，不暴露 Zotero numeric constants；
- `role` 可以识别普通 attachment、note image 与 note payload，但只提供诊断/read semantics；ordinary attachment writes 必须拒绝后两类 internal roles；
- attachment 的 local-file 可用性只由 `file.state` 表达；不再并列一个重复、开放的 `issues` bag。metadata 或 file state 无法可靠归一化时整个读取失败；
- DTO 不包含 raw item、native error、Zotero storage object 或未分类的 optional bag。

Workflow Host 是 local trusted in-process surface，因此 `file.state === "available"` 时保留 canonical local `path`，满足 MinerU、analysis、deep-reading 与 export callers。caller 对该 path 的文件操作仍必须通过 `host.file`，不能直接选择 Node `fs`、`IOUtils`、`OS.File` 或 Components stream。

Host Bridge/MCP 是独立 remote-locality projections，不得原样投影 `file.path`。它们必须复用统一的 Host Bridge attachment projection，把 local availability 转为 opaque download handle 或 `unavailable`；不得另建第二套 path policy。

不新增重复的 `library.getAttachmentDetail`。单个 attachment 通过通用 `library.getItemDetail(attachmentRef)` 读取；其 attachment variant 必须复用同一个 `AttachmentDetailDto` schema 与 serializer。

### 11.12 Attachment metadata update

v12 删除含义宽泛的 handler `attachments.update`，改为字段白名单明确的 ordinary-attachment metadata operation：

```ts
attachments.updateMetadata({
  operationId: string;
  attachmentRef: PortableItemRef;
  expectedRevision?: string;
  patch: {
    title?: string | null;
    url?: string | null;
    contentType?: string | null;
    charset?: string | null;
  };
}): Promise<MutationExecutionResult<{
  attachment: AttachmentDetailDto;
}>>;
```

更新语义：

- patch 至少包含一个字段；未出现字段保持不变，显式 `null` 只清除允许清除的字段；
- title、URL、MIME 与 charset 分别执行稳定的类型、长度与格式校验；
- `expectedRevision` 可选，传入时执行 CAS，冲突返回 `conflict`，details reason 为 `revision_mismatch`；
- `operationId` 必填，retry 不得重复 mutation；
- 只允许 `role === "ordinary"`，note image/payload attachment 必须由 `notes` owner 管理；
- Host 校验 declared `contentType` 与 attachment/link mode 是否允许，不能用 metadata patch 伪装实际文件类型；
- 成功返回新 revision 对应的完整 `AttachmentDetailDto` 与 receipt。

该 member 不修改 file content、link mode、stored/linked 属性、parent、collections、filename 或 local path。文件替换、missing linked-file relocation 与 placement change 有不同的 staging、rollback 和 ownership 语义，不能逐步塞进 metadata patch 形成万能 update escape hatch。

### 11.13 Shared removal contract 与 attachment cleanup

`notes.remove` 与 `attachments.remove` 复用同一套删除 disposition、outcome、idempotency 与 revision 语义：

```ts
type RemovalDisposition = "trash" | "permanent";

type RemovalOutcome =
  | "trashed"
  | "permanently_deleted"
  | "already_trashed"
  | "already_absent";

attachments.remove({
  operationId: string;
  attachmentRef: PortableItemRef;
  disposition: RemovalDisposition;
  expectedRevision?: string;
}): Promise<MutationExecutionResult<{
  attachmentRef: PortableItemRef;
  outcome: RemovalOutcome;
}>>;
```

共享规则：

- disposition 必填，无危险程度不明确的默认值；
- `expectedRevision` 可选，传入时执行 CAS；
- `operationId` 必填，replay 返回原 outcome；
- `already_trashed` / `already_absent` 是 unchanged 幂等成功；
- 无法确认 commit 时返回 `unknown` mutation outcome。

attachment-specific cleanup：

- 只允许 ordinary attachment；note image/payload attachments 继续由 `notes` owner 连同 anchor/content 一起处理；
- `trash` 不删除 attachment 之外的用户源文件；
- permanent stored-attachment deletion 同时清理 Zotero managed file；
- permanent linked-file deletion 只删除 Zotero record，绝不能删除用户的 external linked file；
- linked URL 没有 local file cleanup；
- managed-file cleanup 无法确认时返回 `repair_required` 或 `unknown`，不能声称完整永久删除成功；
- receipt 记录 attachment tombstone revision、parent revision 与 managed-file cleanup outcome。

共享类型和执行骨架只能有一个事实源；notes 与 attachments 不复制一套同名但行为逐渐漂移的 removal model。

### 11.14 Attachment file replacement 与 linked-file relocation

普通 file-backed attachment 使用一个 `attachments.replaceFile` member。source variant 必须与目标当前 link mode 匹配，该 operation 不执行隐式 link-mode conversion：

```ts
attachments.replaceFile({
  operationId: string;
  attachmentRef: PortableItemRef;
  expectedRevision?: string;
  source:
    | {
        kind: "stored_file";
        main: StoredFileInput;
        companions?: CompanionFileInput[];
      }
    | {
        kind: "linked_file";
        path: string;
      };
}): Promise<MutationExecutionResult<{
  attachment: AttachmentDetailDto;
  outcome: "replaced" | "unchanged";
}>>;
```

mode constraints：

- stored-file/stored-URL targets 只接受 `stored_file` source；
- linked-file targets 只接受 `linked_file` source；
- 不允许通过该 member 在 stored 与 linked 之间转换；
- linked-URL attachment 没有 file content，不适用该 member，URL metadata 由 `attachments.updateMetadata` 修改；
- note image/payload attachment 必须拒绝。

stored replacement 必须：

1. 在创建或修改 Zotero state 前校验 source main file 与全部 companion inputs；
2. 将完整集合复制到 managed staging；
3. 校验 entry count、total bytes、filename、path traversal、duplicate target 与 symlink policy；
4. 原子切换 attachment managed content；
5. commit 成功后清理旧 managed content；
6. cleanup 无法确认时返回 `repair_required` 或 `unknown`，不能声称完整成功。

linked-file relocation 必须先确认新 path 存在、是 regular readable file，并进行 canonicalization。它只更新 Zotero link，不复制新文件，也绝不删除或修改旧 path/new path 对应的 external files。

共同语义：

- content hash/完整 companion set 相同，或 linked canonical path 相同时返回 `unchanged`；
- `expectedRevision` 可选，传入时执行 CAS；
- `operationId` 必填，replay 不得重复 staging、swap 或 cleanup；
- filename、MIME 等从实际 source 重新识别并保持 DTO 一致；display title 的显式改变仍由 `updateMetadata` 负责；
- 所有 filesystem adapter 由 `runtimePersistence` 按调用晚绑定；
- 成功只返回完整 DTO 与 Host-issued receipt。

### 11.15 Attachment placement move

普通 attachment 通过 `attachments.move` 改变 Zotero parent/collection placement，不暴露 raw `parentID` 或 collection IDs：

```ts
attachments.move({
  operationId: string;
  attachmentRef: PortableItemRef;
  expectedRevision?: string;
  placement:
    | {
        kind: "top_level";
        collectionRefs?: PortableCollectionRef[];
      }
    | {
        kind: "child";
        parentRef: PortableItemRef;
      };
}): Promise<MutationExecutionResult<{
  attachment: AttachmentDetailDto;
  outcome: "moved" | "unchanged";
}>>;
```

placement semantics：

- attachment 始终留在原 library，不支持跨-library move；
- `top_level` 可以同时指定同 library collections；
- `child` parent 必须 active 且与 attachment 同 library；
- child attachment 不能同时保有 collection membership，Host 在同一 transaction 中更新 parent 与 collections；
- placement 与 collection set 完全相同时返回 `unchanged`；
- 保持 attachment key/identity，不能用 remove + recreate 实现，以免破坏 annotations、relations 或其他引用；
- `expectedRevision` 可选，传入时执行 CAS；
- receipt 覆盖 attachment、old/new parent 与 collection membership 的实际 revision changes；
- 只允许 ordinary attachment，note image/payload attachment 不得独立移动；
- 不改变 link mode，也不移动 linked-file 指向的 external file。

`attachments.move` 表达 Zotero placement mutation；`file.move` 表达 filesystem mutation。两者 namespace 与 receipt semantics 不同，不得互相代替。

### 11.16 Stored attachment file input 与 staging

stored create 与 stored replacement 复用同一套 portable file source 和 companion schema：

```ts
type WorkflowFileRef =
  | {
      kind: "local_path";
      path: string;
    }
  | {
      kind: "resource";
      resourceRef: ResourceRef;
    };

type StoredFileInput = {
  source: WorkflowFileRef;
  targetFilename?: string;
};

type CompanionFileInput = {
  source: WorkflowFileRef;
  targetRelativePath: string;
};
```

`stored_file` source variant 使用：

```ts
{
  kind: "stored_file";
  main: StoredFileInput;
  companions?: CompanionFileInput[];
}
```

source semantics：

- `local_path` 允许 local trusted workflow 导入已有文件；
- `resource` 允许导入由 Host 物化、接收或管理的 `ResourceRef`；
- 不接受 Blob、native stream、raw file handle、raw bytes 或 Zotero storage object；
- `targetFilename` 省略时使用 source filename；
- caller 不得指定 Zotero storage directory、attachment key 或 managed temp path；
- linked-file source 仍使用 canonical external local path，不经过 stored-file staging。

companion target constraints：

- target 只能是 attachment storage root 下的 relative path；
- 禁止 absolute path、`..`、empty segment、NUL、root escape 与 symlink；
- 检查 normalized path 与 case-folded path duplicate，避免跨平台覆盖；
- main 与 companion target 不能冲突；
- source 必须存在、可读并符合 regular-file/resource type policy。

严格执行顺序：

1. 解析 main 与全部 companion source；
2. 完成存在性、类型、entry count、total bytes 与 target-path 校验；
3. 将完整文件集合复制到 Host-managed staging；
4. 对 staging 结果再次校验；
5. 之后才允许创建或修改 Zotero attachment；
6. publish/copy 失败时删除新 attachment 或恢复旧 managed content；
7. compensation 也失败时返回 `repair_required`，并保留最初 publish failure 为 primary error。

stored create 与 replace 必须调用同一个 staging deep module，不得分别实现 companion validation、copy 或 cleanup policy。

### 11.17 Stored URL attachment

`attachments.create.source` 固定支持四个互不重叠的 source variants：

```text
stored_file  -> 复制 caller 已持有的 file/resource 到 Zotero managed storage
linked_file  -> 引用 external local file，不复制
linked_url   -> 保存 remote URL，不下载内容
stored_url   -> 下载 remote content/snapshot 到 Zotero managed storage
```

`stored_url` 的 public input 是：

```ts
{
  kind: "stored_url";
  url: string;
}
```

download 与 publish 约束：

- 只接受规范化后的 `http`/`https` URL；
- 使用 Zotero/plugin runtime 的 network adapter，不引入 Node-only network API；
- redirect count、connect timeout、total timeout 与 downloaded bytes 必须有 Host hard limits；
- 支持 workflow cancellation，cancel 后清理 temp download 与 staging；
- download、content validation 与 snapshot materialization 全部完成后才发布成功 attachment；
- 已创建 Zotero item 后发生 publish failure 时必须尝试删除 item，并保留原始 failure；
- 最终 DTO `linkMode` 为 `stored_url`，`url` 保留 original source identity；
- caller 不得提供任意 cookie、Authorization header、native channel 或 Zotero session object；
- authenticated resource 应先通过专用 network/resource capability 获得 `ResourceRef`，再使用 `stored_file`；
- 相同 `operationId` replay 不得重复 download 或创建多个 attachments。

`stored_url` 与 `linked_url` 不进行基于 URL/content 的隐式互换；caller 必须明确选择是否把 remote content 纳入 Zotero managed storage。

## 12. Item metadata 与 creators

### 12.0 Identifier metadata translation owner

v12 保留独立的 `metadata` nested module，并且 exact member set 只有：

```ts
metadata: {
  translateIdentifier(
    input: {
      type: "DOI" | "ISBN" | "arXiv" | "PMID";
      value: string;
    },
    control?: WorkflowCallControl,
  ): Promise<MetadataLookupResultDto>;
}
```

该 module 归 Zotero Host Capability Broker 持有语义，由 Workflow Host 使用 member-level `Pick` 和显式对象字面量投影。它封装 Zotero `Translate.Search` 晚绑定、identifier 类型差异、translator 调用、bounded candidate handling、canonical DTO serialization 与 stable failure semantics；不会创建 Zotero item、保存 attachment 或写入 library。

只有一个现有 production caller 不构成删除理由。删除该 module 会迫使 workflow 重新实现 Zotero translator orchestration，因此通过 deletion test，并为 caller 提供足够 depth。

v12 consumer migration 必须删除 literature metadata curator 中直接访问 `runtime.zotero.Translate.Search` 的 fallback 以及重复的 translator summary normalization。不得保留 raw Zotero fallback、开放的 `type: string`、optional identifier input 或整个 broker `metadata` domain alias。

candidate selection 的职责固定如下：

- caller 必须显式提供 closed `type`，Host 不自动猜 DOI/ISBN/arXiv/PMID 类型；
- Host 接受 bounded non-empty `value` 的裸 identifier、明确的标准前缀或标准 provider URL，并按 identifier type 规范化请求值；
- Host 不从 citation、段落或任意文本中模糊提取 identifier，不接受一次请求中的多个 identifiers；
- ISBN 的格式与 checksum 由 Host 校验；无效、含糊或超限输入返回 stable `invalid_request`；
- 结果 evidence 返回 normalized identifier，caller 不再自行维护一套 normalization；
- Host 在 hard limit 内检查 Zotero translator 返回的全部 candidates；
- Host 使用对应 identifier 字段执行 exact semantic match，不把 translator 返回的第一个 item 自动视为成功；
- 恰好一个 identifier match 返回 `outcome: "matched"` 和单个 canonical item DTO；
- 多个 identifier matches 返回 `outcome: "ambiguous"` 和 bounded canonical candidate DTO 列表，不暗中选择 preferred candidate；
- 没有 identifier match 返回 `outcome: "not_found"`，其 closed reason 为 `no_translator`、`no_candidate` 或 `identifier_mismatch`；不把 mismatch candidate 伪装为成功；
- title、creators、date 等书目信息是否满足具体 workflow 的 short-circuit/readiness policy，仍由 caller 判断，不进入通用 metadata Host semantics。

`matched`、`ambiguous` 与 `not_found` 都是已完成 lookup 的正常返回值，不通过 exception 表达。异常只用于调用没有正常完成的情形：

- `invalid_request`：identifier、checksum 或参数不合法；
- `unavailable`：Zotero runtime 或 Translate capability 不可用；
- `resource_limited`：translator、candidate、字段或 response budget 超限；
- `execution_failed`：translator 执行失败；
- `canceled`：调用在完成前被取消。

translator exception 不得降级为 `not_found`；空 translator list 不得伪装为 runtime unavailable；caller 只对 stable error 的 `retryable` 语义决定是否重试，不能对所有 negative lookup 自动重试。

三个正常 outcome 共用 exact provenance：

```ts
type MetadataTranslationEvidenceDto = {
  normalizedIdentifier: string;
  candidateCount: number;
  matchingCandidateCount: number;
  translators: Array<{
    id: string;
    label: string;
  }>;
};
```

normal result union 固定为：

```ts
type MetadataLookupRequestDto = {
  type: "DOI" | "ISBN" | "arXiv" | "PMID";
  value: string;
};

type MetadataLookupResultDto =
  | {
      outcome: "matched";
      item: PortableRegularItemDto;
      evidence: MetadataTranslationEvidenceDto;
    }
  | {
      outcome: "ambiguous";
      candidates: PortableRegularItemDto[];
      evidence: MetadataTranslationEvidenceDto;
    }
  | {
      outcome: "not_found";
      reason: "no_translator" | "no_candidate" | "identifier_mismatch";
      evidence: MetadataTranslationEvidenceDto;
    };
```

`matched` 只返回一个 canonical portable record；`ambiguous.candidates` 只包含 exact identifier matches，不包含 mismatch candidates。三个分支的 evidence 字段完全相同且必填，不增加 optional diagnostics、raw translator result、native item 或 provenance bag。

- `candidateCount` 是 Host 实际检查的 translator candidates 数量；
- `matchingCandidateCount` 是 identifier exact matches 数量；
- `translators` 只提供 stable identity 与展示 label，不传播 raw translator；
- evidence 在 `matched`、`ambiguous`、`not_found` 中都存在，空集合用 `[]`，不得省略；
- 删除当前 `priority`、numeric/string `translatorType` 与开放式 `diagnostics[]`；
- translator list、label 与 counts 必须受 hard budget 约束；超限返回 `resource_limited`，不得静默截断。

`translateIdentifier` 是一次完成的 bounded lookup。公共输入只含 `type` 与 `value`，不提供 `limit`、`cursor`、`includeDiagnostics` 或其他 caller-controlled resource knobs。Host 必须在一次调用内检查完整的 bounded translator result；达到固定 hard limit 时整体失败，不返回 truncated page/partial candidate list，也不要求 caller 理解或循环 Zotero translator batches。

exact hard budgets 固定为：

| Resource | Limit |
| --- | ---: |
| input `value` | 2,048 characters |
| participating translators | 32 |
| translator id | 128 characters |
| translator label | 256 characters |
| translator candidates examined | 64 |
| ambiguous candidates returned | 64 |
| serialized normal result | 4 MiB |

input length 超限返回 `invalid_request`；translator/candidate/result budget 超限返回 `resource_limited`。其他 item 字段复用 canonical item DTO 的唯一预算，不在 metadata module 重复定义。错误详情只报告受控的 `resource/limit/observed`，不得携带被截断的原始数据。

因此，broker、workflow fallback 与 tests 不得再保留 `[0]`、`find()` 或其他彼此不同的隐式 candidate selection。normalization 只消除无歧义的包装和格式差异，不能把 metadata module 扩张为通用 identifier extraction module。per-type normalization table 在 final OpenSpec 中按这里的 closed request/result 落成，并接受一致性审阅；不能改变 outcome、candidate inclusion 或 evidence shape。

### 12.1 Creator DTO 唯一事实源

v12 删除 summary string creators 与 optional-field metadata creators 两套不一致表示。library reads、metadata translation 与 item create/update 统一使用：

```ts
type CreatorDto =
  | {
      representation: "two_field";
      creatorType: string;
      firstName: string;
      lastName: string;
    }
  | {
      representation: "single_field";
      creatorType: string;
      name: string;
    };
```

`single_field` 不被 Host 武断解释为 organization；Zotero 单字段 creator 也可能是应整体保留的人名。

统一语义：

- `library.listItems`、`library.getItemDetail`、metadata translation 与 item create/update 复用同一个 schema/validator/serializer；
- array order 即 Zotero creator order；
- `creatorType` 使用稳定 Zotero key，不返回 localized label；
- `two_field` 至少有一个非空 name component；
- `single_field.name` 必须非空；
- 不允许同时提交 `name` 与 `firstName/lastName`；
- read 返回完整 creator list，不再静默截断到前 10 个；
- 每 item 最多 100 个 creators，超出时整体返回 `resource_limited`，不得返回残缺 creator list；
- write 必须校验 creator type 是否适用于目标 item type；
- raw Zotero creator、`fieldMode` numeric constant 与本地化 role label 不进入 DTO。

creator 规则、mapping 和 validation 只能有一个事实源；translator、library 与 mutation adapters 不得各自维护转换分支。

### 12.2 Item detail discriminated union

`library.getItemDetail` 不返回把所有 Zotero item categories 混在一起的 optional-field bag，而是返回显式判别联合：

```ts
type ItemDetailDto =
  | {
      kind: "regular";
      item: RegularItemDetailDto;
    }
  | {
      kind: "note";
      item: NoteSummaryDto;
    }
  | {
      kind: "attachment";
      item: AttachmentDetailDto;
    }
  | {
      kind: "annotation";
      item: AnnotationDetailDto;
    };

library.getItemDetail(
  ref: PortableItemRef,
): Promise<ItemDetailDto>;
```

分支语义：

- `regular` 承载 bibliographic fields、structured creators、tags、collections、relations 与 child counts；
- `note` 复用 `NoteSummaryDto`，不在 generic detail 中隐式读取全文；正文继续由 `library.getNoteDetail` 按明确 format 读取；
- `attachment` 复用唯一 `AttachmentDetailDto` serializer/schema；
- `annotation` 复用唯一 `AnnotationDetailDto` serializer/schema；
- `library.listItems` 继续使用跨 category 的轻量 `ItemSummaryDto`；
- caller 通过 `kind` narrowing，不根据 `itemType` string 或 optional fields 猜 shape；
- 新增 Zotero item category 必须显式扩展 union、conformance tests 与 projection，不得静默落入现有 branch。

不增加平行的 `library.getAttachmentDetail`、`library.getAnnotationDetail` generic lookup aliases。只有需要专门内容参数的读取保留独立 deep member，例如 `getNoteDetail(format)`。

### 12.3 Item summary discriminated union

`library.listItems` 返回轻量的 category-aware union，不给不适用的类别填充假空值：

```ts
type ItemSummaryDto =
  | RegularItemSummaryDto
  | NoteItemSummaryDto
  | AttachmentItemSummaryDto
  | AnnotationItemSummaryDto;

type ItemSummaryBaseDto = {
  ref: PortableItemRef;
  kind: "regular" | "note" | "attachment" | "annotation";
  itemType: string;
  title: string;
  parentRef: PortableItemRef | null;
  state: "active" | "trashed";
  revision: string;
  tags: string[];
  collectionRefs: PortableCollectionRef[];
};

type RegularItemSummaryDto = ItemSummaryBaseDto & {
  kind: "regular";
  creators: CreatorDto[];
  date: string;
  year: string | null;
  publicationTitle: string;
};

type NoteItemSummaryDto = ItemSummaryBaseDto & {
  kind: "note";
  textExcerpt: string;
  textLength: number;
  htmlLength: number;
};

type AttachmentItemSummaryDto = ItemSummaryBaseDto & {
  kind: "attachment";
  filename: string | null;
  contentType: string | null;
  linkMode: AttachmentLinkMode;
  fileState: "available" | "missing" | "not_applicable";
};

type AnnotationItemSummaryDto = ItemSummaryBaseDto & {
  kind: "annotation";
  annotationType: string;
  pageLabel: string | null;
  textExcerpt: string;
};
```

summary 语义：

- base 只包含所有 Zotero item categories 都能稳定表达的 identity、kind、type、title、parent、state、revision、tags 与 collections；
- category-specific fields 只进入相应 variant；
- 不用 empty string/array 表示字段对当前 kind 不适用；
- note summary 不读取完整 note content；
- attachment summary 不读取 file bytes，也不暴露 local path；
- annotation summary 不物化完整 comment/image；
- caller 仍接收一个 `ItemSummaryDto[]`，使用 `kind` 进行 type narrowing；
- list 与 detail branch 必须复用字段 serializer/validator，不维护含义不同的重复映射。

现有 `id/key/libraryId`、numeric/string collection IDs 与 `{id,key}` parent bag 统一替换为 portable item/collection refs。read failure 不再把 creators、tags、collections 或 parent 静默降为空值；如果成功结果不能保证完整性，应整体返回 stable error。

### 12.4 Regular item detail

regular-item detail 扩展 lightweight summary，并只增加完整 bibliographic record 所需信息：

```ts
type RegularItemDetailDto = RegularItemSummaryDto & {
  fields: Record<string, string>;
  relatedRefs: PortableItemRef[];
  childCounts: {
    notes: number;
    attachments: number;
    annotations: number;
  };
  createdAt: string;
  modifiedAt: string;
};
```

字段语义：

- `fields` key 使用 Zotero stable field names；
- values 统一为 strings，不混入来源不明的 boolean/number；
- 只返回当前 `itemType` 合法且非空的 fields；
- creators 只由 `CreatorDto[]` 表达，不重复塞入 fields；
- 常用 `title`、`date`、`publicationTitle` 可以同时出现在 summary 与 fields，但必须由同一个 serializer/read result 派生，禁止两次独立读取导致漂移；
- tags、collections、parent、state 与 revision 复用 summary base；
- `relatedRefs` 返回完整 portable refs，不返回 bare keys；
- related item missing、cross-library 或无法解析时整体失败，不静默丢失；
- `childCounts` 只计数，不自动加载 children；
- `createdAt`/`modifiedAt` 使用 canonical timestamp strings，无效 host timestamp 明确失败。

fields、relations、child counts 或 timestamp 任何一项读取失败时，整个 detail 失败；不得以 empty map、empty array、zero 或 empty string 伪装完整成功。

### 12.5 Regular item create

regular item creation 归 canonical mutation surface，不重新引入 raw/safe-looking `items` namespace：

```ts
mutations.execute({
  operation: "item.create";
  operationId: string;
  libraryId?: number;
  itemType: string;
  fields: Record<string, string>;
  creators?: CreatorDto[];
  initialTags?: string[];
  collectionRefs?: PortableCollectionRef[];
  initialRelatedRefs?: PortableItemRef[];
}): Promise<MutationExecutionResult<{
  item: RegularItemDetailDto;
}>>;
```

创建语义：

- 未指定 `libraryId` 时使用 user library；
- 只创建 top-level regular item，note 与 attachment 使用各自 deep module；
- `itemType` 使用稳定 Zotero key，并在任何 write 前验证；
- `fields` 只接受 strings，unknown 或不适用于目标 item type 的 field 明确失败；
- creators 使用唯一 `CreatorDto` 和 creator-type validator；
- initial tags、collections 与 directed related refs 是同一 create operation 的 initial state；
- collections/related targets 必须 active 且与目标 library 相同；
- tags、collections、creators、relations 的完整预校验必须发生在创建 Zotero item 之前；
- 已创建 item 后 initial-state commit 失败时必须尝试删除新 item；
- compensation 失败返回 `repair_required`，并保留 initial-state failure 为 primary error；
- `operationId` 必填，相同 ID replay 不得创建第二个 item；
- 成功返回完整 regular detail 与统一 receipt。

directed related targets 作为 relation evidence 进入 receipt，但只有新 source item 被写入时，target refs 不得被错误标为发生了 mutation。

不在 create input 中加入 notes、attachments、raw Zotero JSON 或 handler objects。把 initial tags/collections/relations 纳入 create 是为了原子形成 caller 声明的初始 regular-item state，不要求 caller 再拼接多次 mutation。

### 12.6 Regular item metadata update

v12 用 `item.updateMetadata` 统一 fields 与 creators update，并删除 legacy `item.updateFields` name/alias：

```ts
mutations.execute({
  operation: "item.updateMetadata";
  operationId: string;
  itemRef: PortableItemRef;
  expectedRevision?: string;
  patch: {
    fields?: Record<string, string | null>;
    creators?: CreatorDto[];
  };
}): Promise<MutationExecutionResult<{
  item: RegularItemDetailDto;
}>>;
```

patch semantics：

- field string value 表示 set/replace；
- field 显式 `null` 表示 clear；
- field 不出现表示保持不变；
- `creators` 不出现表示保持不变，empty array 表示清除全部 creators；
- creators 只做 ordered full-list replacement，不增加顺序含糊的 add/remove patch；
- patch 必须包含 fields 或 creators，且规范化后至少能形成合法 request。

operation boundaries：

- 只允许 active regular item；
- fields 与 creator types 按当前 item type 完整预校验；
- tags、collections、relations 使用各自 canonical operations，不重复进入 metadata patch；
- item type conversion 不通过该 member 完成；
- `expectedRevision` 可选，传入时执行 CAS；
- `operationId` 必填，支持 idempotent replay；
- normalized target state 与 current state 相同时返回 `unchanged` receipt，不调用 `saveTx()`；
- 成功返回新 revision 对应的完整 regular detail 与 receipt。

`item.updateFields` 不作为 v12 alias 保留，避免相同 fields mutation 拥有两个 public names。

### 12.7 Regular item type conversion

item type conversion 不属于 metadata patch。v12 增加必须先 preview 的独立 canonical operation：

```ts
mutations.preview({
  operation: "item.changeType";
  itemRef: PortableItemRef;
  targetItemType: string;
  incompatibleData:
    | "reject"
    | "move_to_extra"
    | "drop";
});

mutations.execute({
  operation: "item.changeType";
  operationId: string;
  itemRef: PortableItemRef;
  expectedRevision: string;
  targetItemType: string;
  incompatibleData:
    | "reject"
    | "move_to_extra"
    | "drop";
  previewToken: string;
});
```

preview 必须列出：

- preserved fields/creators；
- Host/Zotero schema mapping 后的 remapped data；
- 将移动到 `extra` 的 data；
- 将被删除的 incompatible fields/creators；
- target item type 与 source revision。

policy semantics：

- `reject`：存在任何不兼容的 non-empty data 时拒绝 execute；
- `move_to_extra`：把可序列化的旧字段信息保留到 Zotero `extra`；
- `drop`：caller 明确授权删除 preview 精确列出的 incompatible data；
- Host 的 Zotero schema adapter 是 field/creator-type mapping 的唯一事实源，caller 不提交 mapping table。

execute constraints：

- preview 是强制前置，不能直接 execute；
- `previewToken` opaque 且绑定 operation input、item ref、source revision 与 preview result；
- preview 后 item 变化时 token 失效并返回 `conflict`，details reason 为 `revision_mismatch`；
- `expectedRevision` 必填；
- source/target 相同时返回 `unchanged`；
- 只适用于 active regular item；不能借此转换成 note、attachment 或 annotation；
- 成功返回完整 `RegularItemDetailDto` 与 Host-issued receipt。

### 12.8 Regular item removal 与 child cascade

regular item removal 复用 shared removal contract，但 permanent deletion 因 children/managed resources 必须强制 preview：

```ts
mutations.execute({
  operation: "item.remove";
  operationId: string;
  itemRef: PortableItemRef;
  disposition: RemovalDisposition;
  expectedRevision?: string;
  childPolicy?: "reject_if_present" | "cascade";
  previewToken?: string;
}): Promise<MutationExecutionResult<{
  itemRef: PortableItemRef;
  outcome: RemovalOutcome;
}>>;
```

trash semantics：

- `trash` 可以直接 execute，`childPolicy` 与 `previewToken` 不适用；
- 使用 Zotero native parent/child trash semantics；
- receipt 必须记录实际变为 trashed 的 parent/child refs，不能只记录 request target。

permanent semantics：

- `permanent` 必须先 `mutations.preview(item.remove)`；
- preview 列出 child notes、ordinary attachments、note-internal attachments、annotations、managed files 与已知 relations；
- execute 必须携带绑定相同 parent revision、child set 与 cleanup plan 的 opaque `previewToken`；
- `childPolicy` 必填；`reject_if_present` 在存在任何 child 时拒绝，`cascade` 只授权删除 preview 精确列出的 children；
- preview 后 parent、children 或 cleanup plan 变化时 token 失效；
- linked-file records 可以删除，但 external linked files 绝不删除；
- managed-file cleanup 失败返回 `repair_required` 或 `unknown`；
- note payload/image attachments 由 notes cleanup adapter 处理，但由 parent-removal orchestration 调用，workflow 不自行清理。

already-trashed/absent 使用 shared idempotent outcomes。receipt 覆盖 parent/child tombstones、managed cleanup 与 relation invalidation evidence。

该 operation 只适用于 regular item；note 与 ordinary attachment 继续通过各自 module 的 `remove`，防止绕过 domain-specific cleanup。

### 12.9 Annotation detail 与完整 listing

annotation read 使用明确的 top-level item 与 carrier attachment identity，不返回裸 parent IDs：

```ts
type AnnotationDetailDto = {
  ref: PortableItemRef;
  itemRef: PortableItemRef;
  attachmentRef: PortableItemRef;
  revision: string;
  annotationType: string;
  text: string;
  comment: string;
  color: string | null;
  location: {
    pageIndex: number | null;
    pageLabel: string | null;
    sortIndex: string;
    position: JsonObject | null;
  };
  tags: string[];
  createdAt: string;
  modifiedAt: string;
};

library.listAnnotations(
  ref: PortableItemRef,
): Promise<AnnotationDetailDto[]>;
```

identity 与 content 语义：

- `itemRef` 指向 top-level bibliographic item；
- `attachmentRef` 指向实际承载 annotation 的 PDF/EPUB attachment；
- 输入 regular item 时 Host 内部遍历其 attachments 并返回全部 annotations；
- 输入 attachment 时只返回该 attachment 的 annotations；
- `position` 是经过 schema normalization 与 strict-JSON validation 的 location data，不是 raw Zotero object；
- text/comment 返回完整值，单字段最大 50,000 chars，超出整体失败，不静默截断；
- image annotation 不物化或导出 image file。

完整性与 ordering：

- caller 不处理 pagination 或 attachment traversal；
- 单个 input 最多返回 5,000 annotations，超出返回 `resource_limited`；
- 任一 attachment/annotation read failure 使整个 operation 失败，不静默遗漏；
- canonical order 使用 Zotero annotation `sortIndex`，portable ref 作为 stable tie-break；
- invalid/missing top-level or carrier identity 明确失败；
- DTO timestamps、tags、revision 使用与其他 item DTO 相同的 serializer/validator。

v12 不增加 annotation export 或 annotation mutation。已确认删除 annotation export 的决定保持不变；若未来出现真实 mutation 需求，必须先定义位置 schema、document revision 与 re-anchoring semantics。

### 12.10 Bibliography deep-module ownership

Zotero native bibliography rendering 是独立、可复用的 Host capability，不归 `items` raw handler，也不降为 `researchBundles` 私有 helper：

```text
bibliography
  resolve available formats
  render bibliography content from portable item refs

researchBundles
  select bundle papers and decide that references.bib is an artifact

archive
  package files

resources
  deliver outputs
```

v12 固定保留独立 top-level `bibliography` deep module，初始 members：

```text
bibliography.listFormats
bibliography.render
```

ownership constraints：

- bibliography 接受 portable item refs，在 Host 内解析 Zotero items 并调用 native export translator；
- 不接收或返回 raw `Zotero.Item`、translator object 或 numeric translator implementation constants；
- `render` 只返回完整 content 与 stable format/warning DTO，不直接选择 output path 或写 archive；
- `researchBundles` 可以消费该 member 生成 `references.bib`，但不复制 native translator adapter；
- bundle 决定 artifact filename/manifest，archive 负责 zip，resources 负责 output delivery；
- 其他 internal/workflow components 可以直接复用 bibliography，不必伪装成 research bundle caller；
- format availability、fallback、limits、cancellation 与 errors 由 bibliography contract 明确，不把 translator quirks 泄漏给 caller。

删除 workflow-facing raw `items.exportText`。任何 legacy caller 必须先转成 portable refs，再调用 `bibliography.render`。

### 12.11 Bibliography format 与 render contract

bibliography format 使用 Host-issued stable ref，不要求 workflow 硬编码 Zotero translator UUID、numeric type 或 extension implementation name：

```ts
type BibliographyFormatRef = {
  id: string;
};

type BibliographyFormatDto = {
  ref: BibliographyFormatRef;
  label: string;
  fileExtension: string;
  contentType: string;
  availability: "available" | "unavailable";
  optionsSchema: JsonObject | null;
};

bibliography.listFormats(): Promise<BibliographyFormatDto[]>;
```

render contract：

```ts
type BibliographyRenderRequestDto = {
  itemRefs: PortableItemRef[];
  formatPreference: BibliographyFormatRef[];
  formatOptions?: JsonObject;
};

type BibliographyRenderResultDto = {
  content: string;
  requestedFormats: BibliographyFormatRef[];
  usedFormat: BibliographyFormatDto;
  fallbackUsed: boolean;
  issues: StableIssueDto[];
};

bibliography.render(
  input: BibliographyRenderRequestDto,
): Promise<BibliographyRenderResultDto>;
```

format resolution：

- `formatPreference` 是 caller 明确声明的 ordered preference；
- Host 选择第一个 available format；
- Host 不得自动加入 caller 未声明的 fallback；
- 全部不可用时返回 `unavailable`，details reason 为 `capability`，details kind 为 `bibliography_format`；
- `usedFormat` 记录实际 renderer；`fallbackUsed` 是 requested/used refs 派生的便捷字段，不成为第二事实源；
- `listFormats` 报告当前 runtime availability，stable ref 不因 optional extension 未安装而消失，可以返回 `unavailable`。

options 与 rendering：

- `formatOptions` 必须是 strict JSON，并按实际 selected format 的 `optionsSchema` 校验；
- unknown/invalid option 拒绝，不把 arbitrary bag 直接透传 translator；
- input ref order 即 rendering order，Host 不排序或去重；
- duplicate refs 明确拒绝，避免意外重复 entries；
- 任一 ref missing、非 regular item 或读取失败时整体失败；
- input 最多 10,000 items，完整 output 最大 64 MiB；
- timeout、cancellation 或 output limit 返回整体失败，不返回 partial bibliography。

translator raw object、internal UUID/native constants、native error 与 local path 不进入 DTO。format registry、option schemas 与 translator adapter 是 bibliography module 内部唯一事实源。

### 12.12 Portable regular-item schema

v12 不把 Zotero `toJSON()/fromJSON(strict:false)` 当作公开 portability contract，而是定义自有、版本化、library-neutral DTO：

```ts
type PortableRegularItemDto = {
  schema: "zotero-agents.portable-regular-item.v1";
  itemType: string;
  fields: Record<string, string>;
  creators: CreatorDto[];
  tags: string[];
};

library.exportPortableItems(
  itemRefs: PortableItemRef[],
): Promise<PortableRegularItemDto[]>;
```

export semantics：

- output order 与 input refs 一致；
- 只接受 regular items；
- 任一 item missing/invalid/read failure 使整体失败；
- fields、creators、tags 复用唯一 validators/serializers；
- 不调用后再薄包装 raw Zotero `toJSON()`；
- 单次最多 10,000 items，完整 strict-JSON result 最大 64 MiB，超限整体失败。

portable DTO 明确不包含：

- item/library ref、key、numeric ID、revision 或 Zotero version；
- created/modified timestamps；
- collections、relations、parent；
- notes、attachments、annotations；
- raw Zotero JSON、unknown fields bag 或 native object。

这些 identity/topology/children 依赖 source/target library 与 bundle graph，必须由 bundle manifest 或对应 Host operations 明确表达，不能混进单个 portable metadata record。

import 不新增 `createFromJson` 或 `createFromPortable`。caller 把 portable DTO 的 itemType/fields/creators/tags 交给已确认的 canonical `item.create`，collections/relations 由目标 manifest 显式提供。由此 item creation 仍只有一个事实源。

v12 删除 raw `items.exportPortableJson`、`items.createFromJson` 及 aliases。

### 12.13 Research bundle 与 workflow-format ownership

`researchBundles` 是 Zotero research-paper graph materialization/import deep module，不拥有具体 zip、directory layout 或 manifest schema：

```text
researchBundles
  materializePapers
  importPapers

bibliography
  render

archive
  create / extract

resources
  publish / materialize

workflow
  manifest schema、bundle version、directory layout、artifact names
```

exact interface boundary：

```ts
researchBundles.materializePapers({
  paperRefs: PortableItemRef[];
  missingFilePolicy:
    | "require_complete"
    | "record_missing";
}): Promise<{
  papers: MaterializedPaperDto[];
  completeness: "complete" | "incomplete";
  issues: StableIssueDto[];
}>;

researchBundles.importPapers({
  operationId: string;
  libraryId?: number;
  papers: ImportPaperGraphDto[];
}): Promise<ImportPapersResultDto>;
```

manifest aliases：

```ts
type MaterializePapersRequestDto = {
  paperRefs: PortableItemRef[];
  missingFilePolicy: "require_complete" | "record_missing";
};

type MaterializePapersResultDto = {
  papers: MaterializedPaperDto[];
  completeness: "complete" | "incomplete";
  issues: StableIssueDto[];
};
```

`materializePapers` owns：

- portable regular-item metadata；
- paper relations/topology；
- child notes；
- ordinary attachments；
- annotation metadata；
- attachment file resources；
- complete portable identity mapping required by the graph。

`importPapers` owns：

- canonical item/notes/attachments operations 的 composition；
- parent/child/relations reconstruction；
- operation receipts、idempotency 与 conflict policy；
- cancellation、failure compensation 与 rollback；
- graph-level result/report，不返回 raw Zotero items。

logical note/attachment import DTO 固定为：

```ts
type ImportNoteDto = {
  noteId: string;
  content: {
    format: "html" | "text";
    value: string;
    embeddedImages?: Array<{
      slot: string;
      resourceRef: ResourceRef;
      altText?: string;
    }>;
  };
  tags: string[];
  payloads: LogicalNotePayloadDto[];
};

type ImportAttachmentDto = {
  attachmentId: string;
  source:
    | {
        kind: "stored_file";
        main: {
          resourceRef: ResourceRef;
          targetFilename?: string;
        };
        companions?: Array<{
          resourceRef: ResourceRef;
          targetRelativePath: string;
        }>;
      }
    | { kind: "linked_url"; url: string }
    | { kind: "stored_url"; url: string };
  metadata?: {
    title?: string;
    contentType?: string;
    charset?: string;
    originalUrl?: string;
  };
};
```

`noteId` 与 `attachmentId` 只在所属 paper node 内唯一，用于 result mapping，不成为 Zotero key。bundle import 不创建指向解压临时路径的 `linked_file`；有 bytes 的 bundle attachment 必须以 `ResourceRef` 导入 stored storage，只有显式 URL attachment 使用 `linked_url/stored_url`。annotation materialization 仍可作为 bundle data 输出，但 v12 没有 annotation write contract，因此 `ImportPaperGraphDto` 不接受 annotations，也不能静默声称恢复了 annotations。

`importPapers` 是 v12 必备成员，不再作为可延期 placeholder。三个集成相关分支当前均没有该成员的 production type、implementation、caller 或 test，但现有 bundle import 直接组合 v11 raw `items/parents/attachments` domains；在删除这些 escape hatches 后，需要这个 Host-owned graph-import seam 才能迁移现有 builtin workflow。

该 module 只有在集中持有 graph validation、explicit create/existing mapping、dependency scheduling、idempotency/revision/receipt、node-level partial success、attachment staging、compensation 与 repair reporting 时才有足够 depth。不得实现成依次调用低层 create/import members 的薄 wrapper，也不得为了减小首轮改动保留旧 raw domains 作为过渡。

现有 `literature.ingest` 是单篇检索导入能力，不能改名或 alias 成 `researchBundles.importPapers`。两者是否复用 private graph-write implementation，在 implementation design 中按共同 invariants 决定；公开 semantics 继续分离。

`researchBundles` explicitly does not own：

- zip creation/extraction；
- bundle root/path naming；
- manifest serialization/schema/version；
- `references.bib` filename/content policy；
- output picker 或 remote delivery。

workflow 使用 `materializePapers -> bibliography.render -> manifest composition -> archive.writeZipAtomic -> resources.publishOutput` 定义具体 export format；import 反向组合 `archive.withExtractedZip`、resources 与 `importPapers`。

该边界让具体 bundle 保持 workflow-owned business format，同时把所有 direct Zotero graph read/write、raw item resolution 和 rollback orchestration 收回 Host。

### 12.14 Materialized attachment resources

`researchBundles.materializePapers` 不返回 live attachment paths。所有可用 file content 都固定为当前 workflow run 内的 immutable, content-verified `ResourceRef`：

```ts
type MaterializedAttachmentFileDto =
  | {
      state: "available";
      resourceRef: ResourceRef;
      filename: string;
      contentType: string | null;
      sizeBytes: number;
      sha256: string;
    }
  | {
      state: "missing";
      issue: StableIssueDto;
    }
  | {
      state: "not_applicable";
    };

type MaterializedAttachmentDto = {
  sourceRef: PortableItemRef;
  metadata: AttachmentDetailDto;
  file: MaterializedAttachmentFileDto;
};
```

resource semantics：

- `AttachmentDetailDto.file.path` 表示普通 local read 时 Zotero 当前指向的位置；
- materialized `ResourceRef` 表示 Host 已固定的 immutable content snapshot，供 archive/publish composition 使用；
- materialization 完成后 source file 变化或删除，不得改变本次 export 读取的 bytes；
- stored file、linked file 与 stored URL 的可用 content 统一表示为 resource；
- directory snapshot/companions 作为受控 resource tree，不向 workflow 泄漏内部 paths；
- resource metadata 包含 verified byte size/hash，archive 可以校验但不能原地修改；
- ref 只在当前 workflow run 有效，run terminal 后 Host 自动清理；
- forged、expired 或 foreign-run refs 稳定失败；
- researchBundles 只建立稳定 content snapshot，不复制 archive zip 或 resources publish 逻辑。

note payload/image attachments 作为 note materialization 的 internal resource bindings，不在 ordinary attachment list 中重复出现。

### 12.15 Materialization completeness policy

missing file handling 由 caller 必须明确选择，不存在隐式默认值：

```ts
researchBundles.materializePapers({
  paperRefs: PortableItemRef[];
  missingFilePolicy:
    | "require_complete"
    | "record_missing";
}): Promise<{
  papers: MaterializedPaperDto[];
  completeness: "complete" | "incomplete";
  issues: StableIssueDto[];
}>;
```

`require_complete`：

- 任一应存在的 attachment file missing/unreadable 时整体失败；
- 清理本次已经创建的全部 materialized resources；
- 不返回 partial paper graph。

`record_missing`：

- 保留 paper/attachment metadata 与其他 available resources；
- missing file 使用 `{ state: "missing", issue }` 明确表达；
- 顶层结果必须是 `completeness: "incomplete"`；
- workflow 可以把 issues 写入自己的 manifest，但不能把结果声明为 complete bundle。

共同规则：

- `not_applicable` 不计为 missing；
- actual missing、permission/unreadable 与 read failure 使用不同 stable issue codes；
- file 在 snapshot 期间变化时 Host 有界重试，无法取得一致版本时返回 `conflict`，details reason 为 `concurrent_modification`；
- 同一 paper 的 metadata revision 与 resource snapshot 必须来自同一 consistent read window；
- workflow cancellation 是整体 canceled outcome，不能作为正常 `record_missing` incomplete success 返回；
- policy 必填，caller 必须明确知道自己接受的 completeness level。

### 12.16 Materialized paper source graph

`MaterializedPaperDto` 是 current-run source graph，不是可以直接长期保存或跨库导入的 archive manifest schema：

```ts
type MaterializedPaperDto = {
  source: {
    ref: PortableItemRef;
    revision: string;
  };
  item: PortableRegularItemDto;
  collectionRefs: PortableCollectionRef[];
  relatedRefs: PortableItemRef[];
  notes: MaterializedNoteDto[];
  attachments: MaterializedAttachmentDto[];
  annotations: AnnotationDetailDto[];
  issues: StableIssueDto[];
};
```

其中 logical note 的 exact shape 为：

```ts
type MaterializedNoteDto = {
  source: {
    ref: PortableItemRef;
    revision: string;
  };
  content: {
    format: "html" | "text";
    value: string;
    embeddedImages: Array<{
      slot: string;
      resourceRef: ResourceRef;
      altText: string | null;
      mimeType: "image/jpeg" | "image/png";
      sizeBytes: number;
      sha256: string;
    }>;
  };
  tags: string[];
  payloads: LogicalNotePayloadDto[];
};
```

source-graph semantics：

- `source.ref/revision` 用于 runtime identity、consistent-read verification、diagnostics 与 user feedback；
- input paper order 即 output paper order；
- notes、attachments、annotations 使用各自 canonical stable ordering；
- `relatedRefs` 表示 source item 的 directed outgoing relations；
- 指向未选择 item 的 relation 仍保留在 source graph，由 workflow 决定映射为 external relation 或忽略；
- `collectionRefs` 保留 source topology evidence，但不是 portable target-library identity；
- `MaterializedNoteDto` 使用 normalized content、logical embedded-image bindings 与 logical payload values，不保留 attachment key/raw anchor。

workflow manifest responsibility：

- 把 source refs 映射成 bundle-local IDs；
- 决定 collection/relation 的 portable representation；
- 在 run terminal 前消费所有 `ResourceRef`；
- 不把 library ID/key 或 run-scoped ResourceRef 当作跨库 durable identity；
- Host 不替 workflow规定 manifest node IDs、directory names 或 serialization。

`record_missing` 只容忍明确的 file missing/unreadable 情况。paper metadata、note content、topology 或 annotation read failure 仍使 materialization 整体失败，不能降为普通 incomplete bundle。

### 12.17 Import target mapping ownership

`researchBundles.importPapers` 不按 DOI、ISBN、title、creator、citation key 或 file hash 自动猜 existing Zotero item。workflow 必须为每个 graph node 显式选择 create 或 existing target：

```ts
type ImportPaperGraphDto =
  | {
      graphId: string;
      target: {
        kind: "create";
      };
      item: PortableRegularItemDto;
      collectionRefs: PortableCollectionRef[];
      notes: ImportNoteDto[];
      attachments: ImportAttachmentDto[];
      relatedGraphIds: string[];
      relatedExistingRefs: PortableItemRef[];
    }
  | {
      graphId: string;
      target: {
        kind: "existing";
        itemRef: PortableItemRef;
        expectedRevision: string;
      };
    };
```

top-level request 固定为：

```ts
type ImportPapersRequestDto = {
  operationId: string;
  libraryId?: number;
  papers: ImportPaperGraphDto[];
};
```

`libraryId` 省略时解析为 user library，并在 result 中返回 resolved value。create collections、existing targets 与 `relatedExistingRefs` 必须全部属于该 target library；同一 request 不支持跨 library import。

mapping semantics：

- `graphId` 只在当前 request 内有效，用于表达 imported papers 之间的 topology；
- `create` 明确要求新建 item；
- `existing` 表示 workflow 已完成 matching，并提供 target ref 与 mandatory revision；
- Host 只验证 target existence、regular-item kind、library、revision 与 duplicate claims；
- bundle-local IDs 到 `graphId` 的转换归 workflow；
- graph 内关系使用 `relatedGraphIds`，指向 target library 既有 items 的关系使用 `relatedExistingRefs`；
- unresolved bundle relation 必须在调用 Host 前由 workflow 明确拒绝或忽略，Host 不接收 ambiguous identifier；
- 同一 existing target 不得被一个 request 的多个 graph nodes 占用。

删除含义宽泛的 top-level `conflictPolicy`。create/reuse intent 位于每个 node 的 target。

### 12.18 Existing import target 只复用不修改

v12 中 `existing` target 的语义固定为 reuse unchanged：

- existing node 不允许携带 portable item、collections、notes 或 attachments；
- existing node 不允许声明 outgoing relations；created node 可以把 existing graph node/ref 作为 relation target；
- Host 不更新 existing item 的 metadata、tags、collections 或 children；
- existing node 只作为 graph 中已经存在的 identity 参与 relation reconstruction；
- mandatory `expectedRevision` 保证 workflow matching 后 target 没有变化；
- create node 才携带完整 import content；
- 类型层面禁止“caller 传入但 Host 静默忽略”的字段；
- 不加入含义不清的 `merge`、`merge_missing` 或 `replace_all_children`；
- workflow 若要更新 existing item，必须显式调用 `item.updateMetadata`、`notes.*`、`attachments.*` 等 owners。

未来若有真实需求对 existing paper graph 做 atomic update，应定义独立 `researchBundles.updatePaperGraph`，并先解决 child matching、preview、data-loss policy 与 rollback；不得改变 v12 `existing` 的 reuse-only 语义。

### 12.19 Import partial-success boundary

`researchBundles.importPapers` 保留 partial success，不强制整个 request all-or-rollback。但“每个 paper 独立”只适用于没有未满足 graph dependency 的节点；Host 不得把缺失 caller 声明关系的 paper 标为 committed。

已固定的最低语义：

- 完整 request 必须先完成 graph shape、refs、resource availability 与 target-library 预校验；
- 对 create nodes 构造 directed dependency graph；`A.relatedGraphIds` 包含 `B` 表示 A 的 commit 依赖 B target 成功可用；existing target 是预校验后的 dependency anchor，不加入 create rollback group；
- Host 对 create graph 计算 strongly connected components。无环单 node 是普通 consistency unit；互相可达的循环 nodes 构成最小 atomic consistency group；不得为实现方便把整个 request 或整个弱连通分量扩大成单一事务；
- Host 按 component condensation DAG 的依赖顺序执行。A 只有在它依赖的 B 已 committed，并且 A 的 parent、children、attachments、notes 与全部 outgoing relations 达到声明状态后，才能标为 committed；
- A 依赖的 B 失败时，A 不得启动最终写入；若 A 已因同一循环组的 staged/two-phase execution 产生 state，则必须随该组补偿。返回稳定 dependency failure evidence，不能把 relation 静默丢弃；
- A 自身失败不回滚只被 A 依赖、但不反向依赖 A 的已 committed B；没有依赖受损的其他 components 可以继续，因此 partial success 只跨真正独立的 consistency groups 发生；
- 循环组中任一 node 无法达到声明状态时，Host 必须补偿该组全部已创建 state；组内不能出现 committed 与 rolled-back 混合结果；
- 单 node 或循环组失败时，Host 负责回滚该 consistency group 已创建的 state；不得把半成品标为 success；
- 已 committed 的独立 consistency groups 可以保留，不因后续无反向依赖的 group 失败而强制删除；
- rollback 完整成功的失败节点标为 rolled back；补偿无法确认时标为 repair required，并列出可能残留的 portable refs/resources；
- existing nodes 始终 reuse unchanged；
- top-level result 必须明确区分 complete、partial、failed、canceled 与 repair-required outcomes，并逐 paper 列出 committed/failed/rolled-back/repair-required status；
- partial success 不是静默忽略失败；failure evidence 与 receipts 必须完整返回；
- retry/idempotency 必须按 operation 与 graph node identity 防止已 committed paper 被重复创建。

relation late-binding 必须遵守上述 dependency order：先获得并确认 target identity，再写 source outgoing relation，最后确认 source/group commit。Host 可以使用原生 transaction 或 staged writes 实现，但公开正确性只认 confirmed final graph；无法确认时返回 `unknown`/`repair_required`，不能伪造逻辑原子性。

取消后不再启动新 consistency group；当前 active group 必须完成补偿或返回 repair-required，已经 committed 的独立 groups 保留。exact per-paper/group result fields、deterministic tie-breaking 与 bounded concurrency 属于由上述语义机械推出的 contract authoring，在集中 surface/spec draft 中闭合，不再逐项 grilling。

`importPapers` 明确不支持 process restart 后的 resume、operation replay 或 automatic recovery；重启后的新调用必须 fresh-read Zotero state，并由 caller 显式选择 create/existing targets。

exact result schema 固定为：

```ts
type ImportPaperResultDto =
  | {
      graphId: string;
      outcome: "reused";
      itemRef: PortableItemRef;
      revision: string;
    }
  | {
      graphId: string;
      outcome: "committed";
      consistencyGroupId: string;
      itemRef: PortableItemRef;
      revision: string;
      noteRefs: Array<{ noteId: string; ref: PortableItemRef }>;
      attachmentRefs: Array<{
        attachmentId: string;
        ref: PortableItemRef;
      }>;
      receiptId: string;
    }
  | {
      graphId: string;
      outcome: "failed";
      consistencyGroupId: string;
      attemptId: string;
    }
  | {
      graphId: string;
      outcome: "rolled_back";
      consistencyGroupId: string;
      attemptId: string;
    }
  | {
      graphId: string;
      outcome: "repair_required";
      consistencyGroupId: string;
      attemptId: string;
    }
  | {
      graphId: string;
      outcome: "not_started";
      reason: "canceled" | "dependency_failed";
      blockingGraphIds: string[];
    };

type ImportPapersResultDto = {
  schema: "zotero-agents.research-import.v1";
  operationId: string;
  libraryId: number;
  outcome:
    | "complete"
    | "partial"
    | "failed"
    | "canceled"
    | "repair_required";
  papers: ImportPaperResultDto[];
  receipts: MutationReceipt[];
  attempts: MutationAttemptReport[];
  counts: {
    requested: number;
    reused: number;
    committed: number;
    failed: number;
    rolledBack: number;
    repairRequired: number;
    notStarted: number;
  };
};
```

`papers` 保持 input order；每个 input `graphId` 恰有一行。一个 committed SCC consistency group 共用同一 `receiptId`，receipt `changes` 覆盖该组全部实际 writes；不同 independent committed groups 可以有不同 receipts，但全部 receipt 的 `operationId` 等于 top-level operation ID，`operation` 等于 `researchBundles.importPapers`。`failed/rolled_back/repair_required` row 通过 `attemptId` 引用唯一的 `MutationAttemptReport`，不复制其中的 error/recovery evidence。`receipts/attempts` 只包含 `papers` 实际引用的 canonical evidence，按 consistency-group execution order 排列，不复制 evidence。

top-level outcome precedence：任一 `repair_required` row -> `repair_required`；否则 accepted cancellation 留下 `not_started/canceled` rows -> `canceled`；否则全部 rows 为 `committed/reused` -> `complete`；至少一个 success 且至少一个 failed/rolled-back/dependency-failed -> `partial`；没有 success -> `failed`。caller 必须读 per-paper rows，不能把 top-level outcome 当作“是否产生任何 Zotero write”的 boolean。

research bundle hard limits 固定为：每次最多 1,000 papers、每 paper 最多 500 notes 与 500 ordinary attachments、每 note 最多 100 payloads/100 embedded images、create graph 最多 20,000 relation edges、全部 portable metadata serialized 128 MiB、全部 referenced resource bytes 32 GiB。graph IDs/note IDs/attachment IDs 各最多 128 characters。所有 refs、resource availability、counts/bytes 与完整 graph shape 在首个 Zotero write 前预校验；超限整体抛 `resource_limited`，不会形成 partial attempt。

## 13. File、archive 与 resources

### 13.1 `file`

v12 保留：

```text
readText / writeText
readBytes / writeBytes
copy / exists / makeDirectory
materializeWorkflowInputFile
getTempDirectoryPath
pickDirectory / pickFile / pickSaveFile / pickFiles
```

新增真实 caller 所需：

```text
stat / list / move / remove
```

v12 file DTO 与新增 member signatures 固定为：

```ts
type WorkflowFileCopyRequestDto = {
  sourcePath: string;
  targetPath: string;
  overwrite?: boolean;
};

type WorkflowMakeDirectoryRequestDto = {
  path: string;
  recursive?: boolean;
};

type WorkflowInputFileMaterializationRequestDto = {
  key?: string;
  fileName: string;
  content:
    | { kind: "text"; text: string }
    | { kind: "bytes"; bytes: Uint8Array | ArrayBuffer };
};

type WorkflowMaterializedFileDto = {
  path: string;
  sizeBytes: number;
  sha256: string;
};

type FilePickerFilterDto = {
  label: string;
  extensions: string[];
};

type FilePickerRequestDto = {
  title?: string;
  initialDirectory?: string;
  filters?: FilePickerFilterDto[];
};

type SaveFilePickerRequestDto = FilePickerRequestDto & {
  suggestedName?: string;
};

type WorkflowFileStatDto = {
  path: string;
  kind: "file" | "directory" | "other";
  sizeBytes: number | null;
  modifiedAt: string | null;
};

type WorkflowFileListRequestDto = {
  path: string;
  recursive?: boolean;
  maxDepth?: number;
};

type WorkflowFileListEntryDto = {
  relativePath: string;
  kind: "file" | "directory" | "other";
  sizeBytes: number | null;
  modifiedAt: string | null;
};

type WorkflowFileListResultDto = {
  rootPath: string;
  entries: WorkflowFileListEntryDto[];
  totalEntries: number;
  totalFileBytes: number;
};

type WorkflowFileMoveRequestDto = {
  sourcePath: string;
  targetPath: string;
  overwrite?: boolean;
};

type WorkflowFileRemoveRequestDto = {
  path: string;
  recursive?: boolean;
  missing?: "error" | "ignore";
};

type WorkflowFileRemoveResultDto = {
  removed: boolean;
};
```

`materializeWorkflowInputFile` 的 caller scope、workflow/run identity 与 managed root 由 adapter 注入，request 不允许 workflow 自报 `workflowId` 或选择 managed directory。content union 必须恰有一个 branch。picker cancel 正常返回 `null`；`pickFiles` cancel 返回 `null`，合法 empty selection 返回 `[]`。

write/writeBytes 是同目录 temporary + replace 的 atomic write；existing target 会被原子替换。`copy/move.overwrite` 默认 `false`。`makeDirectory.recursive` 默认 `true`。`list.recursive` 默认 `false`，排序固定为 normalized `relativePath` code-point order。remove directory 只有显式 `recursive: true` 才能递归；`missing` 默认 `error`。

约束：

- recursive 操作具备 entry/byte limits；
- read/write/move 支持 cancellation；
- atomic move/write 不能静默退化；
- managed paths 做 root confinement；
- stable error code 不泄漏 native cause；
- workflow 不自行选择 IOUtils、Node fs 或 Zotero.File。

file hard limits 固定为：单次 `readText` 64 MiB、`readBytes` 256 MiB、single write/copy/move 4 GiB、recursive list/remove 100,000 entries、recursive depth 64、单 path 4,096 UTF-16 code units、picker filters 32 组且每组最多 64 个 extensions。limits 在任何无界 allocation/递归前检查；超限返回 `resource_limited`。

`getTempDirectoryPath()` 作为跨平台基础能力保留，但重新固定 ownership：

- 内部 owner 是 `runtimePersistence`；它是 Zotero 7、Zotero 9、Node test runtime 等环境中 temp-path adapter 选择、路径规范化与目录可用性的唯一事实源；
- `src/workflows/hostApi.ts` 只在 `file` namespace 中显式投影该能力，不得直接调用 `Zotero.getTempDirectory()`、`PathUtils`、`IOUtils` 或 Node filesystem；
- workflow-facing member 继续是 `file.getTempDirectoryPath()`，不为单一成员新增浅层 `paths` domain；
- 返回值是可信 in-process workflow 可使用的 normalized absolute path；Host Bridge/MCP 不得把它投影到 remote DTO；
- 该路径是 ephemeral runtime location，不是 durable identity，不保证跨进程或跨启动稳定；
- 获取 temp root 本身不创建 per-run ownership，也不承诺自动追踪和清理 caller 在其中创建的任意文件；需要 managed lifecycle 的场景继续使用 resources、archive callback 或其他 Host-owned capability；
- 运行时不可提供可用 temp directory 时，以稳定 Host error 失败，不泄漏 native cause。

删除无人使用且返回 native object 的 `file.pathToFile`。

`runtimePersistence` 的内部 adapter ownership 不限于 Workflow Host `file` namespace。实施时必须同步迁移 production TypeScript 中语义等价的普通异步文件操作，当前已知范围至少包括：

- workflow/runtime：`loader.ts`、`packageHookBundler.ts`、`zipBundleReader.ts`、`archive.ts`、`workflowInputPlanning.ts`、`workflowRuntime.ts` 与 `workflowExecution/bundleIO.ts`；
- provider/installer/runtime：generic HTTP 与 SkillRunner providers、`builtinWorkflowSync.ts`、SkillRunner runtime/installer modules、`runtimeFileTransfer.ts` 与 `hostBridgeProfileStore.ts`；
- platform/runtime compatibility callers：command/environment resolution、Windows command resolution、ACP transport 与 preferences/runtime persistence callers。

该迁移只收回 adapter selection 与普通 I/O implementation，不把 loader sandbox、provider policy、installer lifecycle、archive safety 或 transfer protocol 并入 `runtimePersistence`。调用方的领域 interface 与结果语义保持由各自 module 持有。

批准的 symbol deletion list 包括：

- 删除 `src/utils/runtimeCompatibility.ts` 的 `runtimeFileExists`、`runtimeReadTextFile` 与 `runtimeRemoveFile` exports；
- 删除或归并 caller-local 的 `IOUtils` / `OS.File` / Node fallback selector；
- 删除只为上述 selector 存在的 shallow helper 与 pass-through test；
- 保留 `runtimePersistence.ts` 文件和现有 semantic operations，不批准为本次迁移删除任何 caller 整文件。

worker、ZIP、script loader、SQLite、bounded Components streaming、reveal/URI、attachment native creation、picker 与 raw diagnostic probe 只按 §4.5 的闭合例外保留。新增例外必须回到方案审阅，写明 owner、native requirement、为何普通 async interface 无法表达，以及对应测试 surface；implementation 不得自行扩大 allowlist。

### 13.2 `archive`

archive 保持独立 module：

```text
measureEntries
writeZipAtomic
withExtractedZip
```

exact archive DTO：

```ts
type WorkflowArchiveEntryDto = {
  name: string;
  content:
    | { kind: "file"; sourcePath: string }
    | { kind: "text"; text: string }
    | { kind: "bytes"; bytes: Uint8Array | ArrayBuffer };
};

type WorkflowArchiveFileIntegrityDto = {
  sizeBytes: number;
  sha256: string;
};

type WorkflowArchiveMeasureRequestDto = {
  entries: WorkflowArchiveEntryDto[];
};

type WorkflowArchiveMeasureResultDto = {
  files: Record<string, WorkflowArchiveFileIntegrityDto>;
  totalEntries: number;
  totalBytes: number;
};

type WorkflowArchiveWriteRequestDto = {
  targetPath: string;
  entries: WorkflowArchiveEntryDto[];
};

type WorkflowArchiveWriteResultDto = WorkflowArchiveMeasureResultDto & {
  targetPath: string;
};

type WorkflowArchiveExtractRequestDto = {
  sourcePath: string;
};

type WorkflowExtractedArchive = Readonly<{
  rootPath: string;
  entries: string[];
  resolvePath(entryName: string): string;
  readText(entryName: string): Promise<string>;
  readBytes(entryName: string): Promise<Uint8Array>;
  measureEntries(
    entryNames: string[],
  ): Promise<WorkflowArchiveMeasureResultDto>;
}>;
```

每个 entry 使用一个显式 content variant，不能同时传 sourcePath/text/bytes。archive hard limits 固定为：20,000 entries、单 entry 2 GiB、总展开或写入 16 GiB、entry name 1,024 UTF-16 code units、目录深度 64。`files` key 使用 normalized archive entry name；duplicate normalized/case-folded path 整体失败。

增加：

- entry count、单项大小、总字节、路径长度 limits；
- cancellation；
- ZIP traversal、duplicate entry、ZIP bomb 防护；
- callback 后自动清理；
- cleanup failure 不覆盖 callback 原错误；
- atomic write 失败保留原 target。

v12 正式保留 archive 的 local-path seam：

- `sourcePath`、`targetPath` 是可信 in-process Workflow Host 的文件组合接口，可直接接收 picker、resources、temp 或其他 `file` capability 产生的路径；
- `WorkflowExtractedArchive.rootPath/resolvePath` 只在 `withExtractedZip()` callback 动态范围内有效；callback settle 后 Host 完成清理，caller 不得继续使用或保存为 durable identity；
- extracted-archive handle 的读取继承外层 `withExtractedZip` 的唯一 `WorkflowCallControl`，inner methods 不接受第二份 signal/control；
- `rootPath/resolvePath` 的保留有真实组合需求：literature bundle 会把解压后的 entry path 直接传给 `attachments.importStoredFile()`；
- archive 必须验证 entry traversal、absolute/drive path、duplicate entry、symlink escape、entry count、单项大小、总展开字节和路径长度；
- `attachments.importStoredFile()` 等接受 archive/local path 的 owner 必须在创建 Zotero attachment 前完成 validation 与 managed staging，不能把 source path 当作 durable storage；
- archive local path 不得进入 Host Bridge/MCP DTO、mutation receipt 或 remote descriptor。

v12 不新增 archive-entry handle、通用 path registry 或与 local-path seam 并行的第二套 archive API。

### 13.3 `resources`

保留：

```text
getInput / getInputs
get
materializeFile
allocateOutput / publishOutput
listOutputs
```

exact resource identity 与 DTO：

```ts
type ResourceRef = {
  kind: "workflow_resource";
  id: string;
};

type WorkflowResourceFileDto = {
  ref: ResourceRef;
  slotId: string;
  path: string;
  displayName: string;
  contentType: string;
  kind: "file" | "archive";
  sizeBytes: number;
  sha256: string;
};

type WorkflowResourceMaterializeFileRequestDto = {
  slotId: string;
  sourcePath: string;
  displayName?: string;
  contentType?: string;
  kind?: "file" | "archive";
};

type WorkflowResourceAllocationRequestDto = {
  slotId: string;
  suggestedName?: string;
  contentType?: string;
};

type WorkflowResourceAllocationDto = {
  allocationId: string;
  slotId: string;
  path: string;
};

type WorkflowResourcePublishRequestDto = {
  allocationId: string;
  slotId: string;
  path: string;
  displayName?: string;
  contentType?: string;
};

type WorkflowResourceOutputDescriptorDto = {
  ref: ResourceRef;
  slotId: string;
  displayName: string;
  contentType: string;
  kind: "file" | "archive";
  sizeBytes: number;
  sha256: string;
  createdAt: string;
  expiresAt: string;
  downloadCommand: string;
};
```

`ResourceRef` 统一替代平行的 `fileId`/resource handle 表示，但不替代 local path；in-process DTO 可以同时含 managed `path`，remote descriptor 必须删除它。`get()` 是 opaque ref 到当前可信 in-process file projection 的唯一解析 seam：它只接受当前 run 的 Host-issued ref，每次读取都重新校验 retained bytes，并拒绝 forged、foreign-run、expired、cleaned 或内容已变化的 ref。`materializeFile()` 是 callback-local path 到 immutable ref 的 composition seam：`sourcePath` 可以来自 `file`、picker 或 `archive.withExtractedZip()` callback，但 Host 必须在调用返回前把当前字节复制到当前 run 的 managed resource scope，校验 manifest-bound slot、kind、content type、extension 与 bytes，并返回新 `ResourceRef`；source path 本身不进入资源 identity，callback settle 后也不再需要有效。`slotId` 必须对应 runtime 已绑定的 input/materialization slot，workflow 不能自报或放宽 slot definition。allocation ID 是 output publish 的 current-run reservation identity；它不是通用 path handle，也不能解析任意 local path。`resources.mode` 删除，调用模式只读顶层 `interactionMode`。

补齐：

- `cardinality`、`maxCount`；
- 输入/输出 `maxBytes`、content type、extension；
- `kind: archive` publish validation；
- atomic output publish；
- run 结束、取消、过期后的 managed cleanup；
- remote descriptor 只返回 opaque handle/download command；
- in-process workflow 可用 Host-issued path，但不得序列化到 Host Bridge/MCP。

`cardinality/maxCount/maxBytes/kind/contentType/extension` 来自已加载并验证的 workflow manifest slot definition，由 trusted runtime 绑定到当前 run；workflow 不在 `allocateOutput/publishOutput` request 中自报或放宽这些约束。absolute Host ceilings 固定为：单 run 输入与输出 slots 各最多 1,000 个 resources，单 resource 最多 16 GiB，单 run 全部 managed resource bytes 最多 32 GiB，slot/display/allocation/ref ID 最多 128 characters，display filename 最多 1,024 UTF-16 code units。manifest 声明的更小限制优先；缺少 slot、超出 cardinality/bytes 或 kind/type/extension 不匹配时整体失败，不发布 partial descriptor。

resources path contract：

- input 的 remote `fileId` 由 Host Bridge 解析为当前可信进程可用的 `WorkflowResourceFile.path`；remote caller 永远看不到该 path；
- `allocateOutput()` 返回的 path 绑定当前 run、slot 与 allocation registry；`publishOutput()` 必须拒绝未分配、跨 run 或 slot 不匹配的路径；
- `materializeFile()` 必须在调用动态范围内读取并固定 `sourcePath` 的字节，返回当前 run 的 managed path 与不可变 `ResourceRef`；不得保存或延迟重读 archive callback-local path；
- `get()` 只解析当前 run 已注册的 input/materialized resource，并在返回 managed path 前复核 size/hash；workflow 不得从 ref ID 推导路径或绕过 owner；
- publish 前验证 manifest 声明的 kind、content type、extension、`maxBytes`、最终 size/hash，并把 publish 作为明确的 finalize boundary；
- publish result/list output descriptor 只包含 strict-JSON opaque identity、display metadata、size/hash、expiry 与 download command，不包含 local path；
- run terminal、cancel、failure 与 expiry 的 lease/physical-file cleanup responsibility 必须明确，descriptor 释放不能被误认为 durable storage；
- resources path 可以传给 `file`、`archive` 与 attachment import 等可信 in-process capabilities，但不能保存为 durable workflow identity。

v12 的边界固定为：in-process Workflow Host 可以组合 local paths，Host Bridge/MCP 只交换 opaque handles。删除完整 opaque `WorkflowPathRef` 迁移计划，不建立 handle registry、archive-entry handle 或平行文件接口。

## 14. Environment、clipboard 与 UI interaction

### 14.1 Environment

v12 新增 closed、同步、非交互 capability：

```ts
type WorkflowEnvironmentInfo = {
  zoteroVersion: string;
  platform: "win32" | "darwin" | "linux" | "unknown";
  locale: string;
};

environment.getInfo(): WorkflowEnvironmentInfo;
```

exact allowlist 只有：

- `zoteroVersion`
- `platform`
- `locale`

语义：

- 每次调用晚绑定读取当前 runtime，不缓存 global、window 或 adapter；
- `zoteroVersion` 是规范化、有长度上限的版本字符串，无法读取或格式异常时返回 `"unknown"`；
- `platform` 复用统一 runtime platform detector，只允许四个闭合值；
- `locale` 复用 workflow localization 的唯一解析路径并规范化为 BCP-47，无法读取时沿用 `"en-US"` fallback；
- 单字段不可用不导致整个调用失败；
- 返回值只含 strict-JSON scalar，不含 `undefined`、raw Zotero/native object、path 或 capability function；
- `environment` 不承担 capability discovery。workflow 应直接调用具名 capability，并根据其稳定结果/错误判断可用性，不能用 platform 字符串猜测。

明确不加入 CPU arch、OS version、timezone、runtime kind、user agent、hostname、username、home/data/temp path、process env、secrets 或 capability flags。

addon identity 继续由 `addon.getConfig()` 提供。其 v12 exact DTO 为：

```ts
type AddonIdentityDto = {
  addonName: string;
  addonRef: string;
  addonVersion: string;
};
```

`addonVersion` 有真实 provenance caller，归 addon owner；不放入 environment。删除 `prefsPrefix`，也不把 `addon.getConfig()` 扩展成完整配置或 runtime dump。

### 14.2 Clipboard

v12 提供完整的纯文本 clipboard module：

```text
clipboard.readText
clipboard.writeText
clipboard.hasText
clipboard.clear
```

exact signatures 以 §3.7 为准：`readText()` 返回 `string | null`，其中 `null` 表示当前 clipboard 没有 text flavor，`""` 表示存在 text flavor 且文本为空；`hasText()` 对后者返回 `true`。`writeText("")` 创建空 text flavor，只有 `clear()` 删除全部 clipboard flavors。

语义：

- 区分无文本与空字符串；
- `clear` 真正清空 clipboard，不用写空字符串模拟；
- read/write 按 UTF-8 bytes 限制；
- cooperative cancellation；
- interactive adapter 执行；
- non-interactive deny adapter；
- 错误 details 不包含 clipboard 内容；
- Node tests 使用内存 adapter，不操作系统 clipboard。

单次 clipboard text hard limit 固定为 16 MiB UTF-8 bytes。`hasText` 不读取或复制完整 payload；`readText/writeText` 在 allocation 前执行可得的 size check，并在读取后复核。超限返回 `resource_limited`，error details 不含长度以外的内容事实。

v12 不承诺 HTML、图片、文件或 generic MIME clipboard；这些能力缺少 Zotero 7/9 跨版本证据与真实 caller。

### 14.3 Editor

v12 只保留：

```ts
type WorkflowEditorRenderer<
  TState extends JsonValue,
  TContext extends JsonValue,
  TResult extends JsonValue,
> = {
  render(input: {
    root: HTMLElement;
    state: TState;
    context: TContext | null;
    patchState(update: (state: TState) => TState): void;
    closeWithAction(actionId: string): void;
    rerender(): void;
  }): void;
  serialize(input: {
    state: TState;
    context: TContext | null;
  }): TResult;
};

type WorkflowEditorAction<
  TState extends JsonValue,
  TContext extends JsonValue,
  TResult extends JsonValue,
> = {
  id: string;
  label: string;
  noClose?: boolean;
  onClick?(input: {
    state: TState;
    context: TContext | null;
    closeWithAction(actionId: string): void;
    rerender(): void;
    serialize(): TResult;
  }): void;
};

type WorkflowEditorSessionRequest<
  TState extends JsonValue,
  TContext extends JsonValue,
  TResult extends JsonValue,
> = {
  title: string;
  initialState: TState;
  context?: TContext;
  renderer: WorkflowEditorRenderer<TState, TContext, TResult>;
  layout?: {
    width?: number;
    height?: number;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    padding?: number;
  };
  labels?: {
    save?: string;
    cancel?: string;
  };
  actions?: WorkflowEditorAction<TState, TContext, TResult>[];
  closeActionId?: string;
  detached?: boolean;
  autoClose?: {
    afterMs: number;
    actionId: string;
  };
};

type WorkflowEditorSessionResult<TResult extends JsonValue> =
  | { outcome: "submitted"; actionId: string; value: TResult }
  | { outcome: "canceled" | "closed" };
```

- active workflows 迁移到 inline renderer；
- 删除公共 `registerRenderer/unregisterRenderer`；
- renderer lifecycle 由 session 持有；
- interactive adapter 执行；
- non-interactive deny adapter；
- renderer missing、dialog unavailable、concurrency 使用稳定错误。

renderer、action callback、DOM root 与 state updater 是 interactive in-process seam，不得进入 Broker、Host Bridge/MCP、durable state 或 editor result。`initialState/context`、serialized result、title/labels/layout/actions 必须闭合且有界；公开 contract 不保留 `rendererId` 或 renderer registry。`detached` 与 `autoClose` 保留，因为 import-notes conflict dialog 与 tag-regulator timeout 是真实 caller；Host 负责 timer cleanup，workflow 不接触 window object。一个 caller scope 同时只允许一个 active session，其他调用按序等待或返回 `conflict/operation_in_progress`，不能创建隐藏并行 dialogs。

### 14.4 Notifications

v12 保留：

```ts
type WorkflowToastRequestDto = {
  text: string;
  type?: "default" | "success" | "error";
};
```

- text length 与 type 严格校验；
- 可见 toast 数量有界；
- fire-and-forget，不返回 ProgressWindow/handle；
- interactive adapter 执行；
- non-interactive deny adapter；
- non-interactive diagnostics 走 logging，不显示本地 UI。

`type` 默认 `default`；text 必须非空且最多 4,096 UTF-16 code units。同一 caller scope 同时最多 5 个可见 toast，超过时返回 `resource_limited`，不静默替换别人的提示。

### 14.5 Logging

v12 只保留：

```ts
type WorkflowRuntimeLogRequestDto = {
  level: "debug" | "info" | "warn" | "error";
  stage: string;
  message: string;
  operation?: string;
  phase?: string;
  details?: JsonObject;
};
```

Host 自动绑定 workflow/run context，并限制 message、details depth/size 与敏感字段。interactive/non-interactive 均可用。

workflow 不能填写 timestamp、workflow/package/run/request/job/backend identity、diagnostic mode、native error、stack、transport URL/path 或 retention policy。`stage/operation/phase` 各最多 128 characters，message 最多 16 KiB UTF-8，details 最大 depth 8、最多 512 keys/nodes、serialized 64 KiB。超限或非 strict JSON 输入返回 `invalid_request`/`resource_limited`；Host 的 secret/path/error sanitizer 在写 log 前仍必须执行。

从公共 interface 删除：

- `recordPerformanceSpanForTests`
- `recordLeakProbeTempArtifactForTests`
- `releaseLeakProbeTempArtifactForTests`

这些能力迁移到内部 harness/probe seam。

### 14.6 删除 `command` 空壳投影

v12 完整删除 workflow-facing `command` domain，不提供 generic command runner 作为替代。

当前实现没有形成可依赖的 capability：

- `WorkflowHostApi.command` 只是 `handlers.command` 的别名；
- `handlers.command.run` 忽略 `commandId`、`args` 与 `context`，始终返回 `undefined`；
- 全库没有 production workflow caller；
- 现有测试只验证这个空函数可以被 `await`，没有锁定任何用户可观察行为。

实施时同步删除：

- `WorkflowHostApi` 类型中的 `command` member；
- `createWorkflowHostApi()` 中的 `command` 投影；
- `handlers.command` 空实现；
- 只覆盖该空实现的无行为价值测试。

不建立可按字符串执行任意宿主命令的 escape hatch。已形成明确语义的动作继续由对应 owner 提供，例如 `notifications`、`editor`、navigation 或插件内部 platform adapter；未来出现新的稳定需求时，应以具名 capability 和 strict-JSON contract 加入其领域 owner。

interactive 与 non-interactive projection 都不包含 `command`。exact-shape conformance 必须锁定该成员不存在，且不得保留 alias、deprecated stub 或运行时 capability fallback。

### 14.7 Context 与 selection snapshot

当前 `context` projection 已经把 Zotero 数据显式序列化，没有向 workflow 泄漏 raw `Zotero.Item`、`Zotero.Collection`、`nsIFile`、window/runtime object 或本地文件路径。collection 的 `path: string[]` 是 collection 名称路径，不是 filesystem path。

v12 保留两个互补成员：

```ts
type WorkflowHostContextApi = {
  getCurrentView(): CurrentViewDto;
  getSelectedItems(
    control?: WorkflowCallControl,
  ): Promise<SelectedItemsSnapshotDto>;
};

type CurrentViewDto = {
  target: "library" | "reader";
  libraryId?: number;
  selectionEmpty: boolean;
  currentItem?: {
    ref: PortableItemRef;
    title?: string;
  };
  currentCollection?: {
    ref: PortableCollectionRef;
    name: string;
  };
};

type SelectedItemsSnapshotDto = {
  capturedAt: string;
  items: Array<{
    ref: PortableItemRef;
    itemType: string;
    title?: string;
    parentRef?: PortableItemRef;
  }>;
};
```

语义边界：

- `getCurrentView()` 是轻量、调用时读取的 UI context snapshot，不内嵌 `selectedItems`；
- `getSelectedItems()` 是唯一 selection seam，一次返回该次调用捕获的完整轻量 snapshot；
- caller 不接触 page cursor；该 member 是 async/cancelable，Host 内部可以分批序列化并让出 UI thread，但不能把 post-hoc slice 宣称为 source-bounded pagination；
- selection 受固定 10,000 items 的宽松 Host hard limit 约束；超过上限时整体返回稳定 `resource_limited` error，不返回 truncated/partial snapshot；
- 10,000 是 contract constant，不是 caller 可调整参数；实现仍须在 Zotero 7/9 上验证 10,000-item serialization 的 allocation/latency evidence，若门禁不通过必须回到方案阶段，不能在实现中静默改值；
- `capturedAt` 只描述该结果的捕获时间，不构成 library revision、selection lock 或后续读取一致性承诺；
- attachment selection 归一化到 parent item 的既有语义必须写入 contract；`parentRef` 只表达必要拓扑，不展开 parent summary；
- `title` 与 collection `name` 只是展示快照，identity 只认 portable ref；
- tags、collections、creators、date/year、publication title 与 collection parent/path 不进入 context DTO；需要权威数据时，caller 使用 ref 调用相应 `library` capability；
- 合法 empty selection 与 Zotero window/context unavailable 必须可区分；后者返回稳定 capability error；
- optional 字段不存在时必须省略，不能在 broker seam 中保留值为 `undefined` 的自有属性；
- 字段名统一为 `libraryId`，删除 `libraryID` 拼写；
- interactive 与 non-interactive 保持相同 member shape；non-interactive adapter 对 UI context 调用 fail-closed；
- 不同时保留 `getSelectionPage`、旧的无界数组返回或兼容 alias。

这一拆分避免 `getCurrentView()` 与 `getSelectedItems()` 重复 materialize 同一份完整 selection，也防止调用方把 summary 中可能截断或过时的 tags/collections 误当作 library 权威状态。

### 14.8 Runtime global、Window 与 picker ownership

`src/utils/runtimeBridge.ts` 与 `src/platform/filePicker.ts` 分别深化，不合并，也不新增第三个 generic runtime facade。

`runtimeBridge` 唯一持有以下通用知识：

- runtime global、`globalThis`、override 与宿主注入对象的候选解析；
- Zotero、addon、toolkit 与 console 等 runtime capability 的位置和有效性；
- global/main/hidden Window candidates 的来源、优先级与 failure isolation；
- 供 caller/diagnostic 使用的受控 shape summary。

`filePicker` 唯一持有以下 picker 语义：

- picker-compatible parent Window policy；
- native picker module 与 toolkit picker adapters；
- filters、single/multi selection、cancel、legitimate empty selection 与结果 normalization；
- interactive runtime unavailable 的稳定失败。

`filePicker` 每次调用从 `runtimeBridge` 获取当前 Window/runtime candidates，再应用 picker policy；不得缓存 parent Window、picker constructor、Chrome module 或 toolkit。`createWorkflowHostApi()` 缓存 projection 不改变该 late-binding 规则。Broker、library query、note payload、context builder 与其他 caller 不再各自实现通用 `resolveZotero` / main-window candidate chain；它们可以保留 owner-specific validation 和已经由 owner 明确持有的 dialog/preferences Window。

批准删除或归并重复的通用 Window/runtime resolvers 与 `filePicker` 自有的平行 candidate chain；不删除 `runtimeBridge.ts` 或 `filePicker.ts`，也不把 picker semantics 移入 Workflow Host composition root。版本差异通过 capability shape 处理，不能按 Zotero 7/9 字符串分派。

### 14.9 Plugin-internal subprocess seam

`src/platform/subprocess.ts` 从 shallow re-export 深化为 plugin-internal process-execution module。它不恢复 workflow-facing `command`，不进入 Workflow Host v12 exact manifest。

该 module 持有：

- modern/legacy Mozilla subprocess module 与 Zotero internal subprocess capability resolution；
- Node 与批准的 Windows hidden/XPCOM one-shot adapters；
- normalized one-shot stdout、stderr、exit、unavailable、timeout 与 bounded termination semantics；
- 供 production 与 test adapters 共用的 execution result seam。

该 module 不持有 command path/search policy、login environment merge、ACP framing/streaming、process-group ownership、bridge singleton/ready lifecycle、installer/dependency-probe domain outcome 或 raw capability diagnostics。这些行为继续留在 §4.5 指定的 owner，调用方只把底层 one-shot execution 委托给 platform subprocess seam。

批准的 symbol deletion list 为：

- 删除 `src/platform/subprocess.ts` 当前两行 re-export implementation，但保留并深化该文件；
- 从 `src/utils/runtimeCompatibility.ts` 删除 `getMozillaSubprocessModule` export，并将 runtime module resolution 收回 `platform/subprocess.ts`；
- 删除 caller-local 的等价 one-shot adapter selector 与 normalization；
- 删除只验证 re-export、fallback 调用顺序或无用户可观察行为的测试。

raw diagnostic probe 可以继续逐 adapter 收集证据，但不得成为 production dispatch SSOT。一个同时吸收 one-shot、streaming、ACP protocol、process control 与所有领域 outcome 的万能 process interface 被明确拒绝，因为其 interface 会接近全部 implementation，无法形成 depth。

## 15. Preferences、addon 与 status tags

### 15.1 Preferences 不投影给 workflow

已确认采用两层结构：

```text
插件内部 prefs module
  可保持较完整、typed 的 preference 能力

Workflow Host API v12
  不投影 prefs/settings
```

workflow 需要的状态通过领域 module 获得：

- tag vocabulary/staging/promotion -> `synthesis.tags`
- Git/WebDAV credentials -> 对应插件内部 module，不向 workflow 返回 secret
- invocation configuration -> workflow input/manifest
- 新 durable workflow state -> 只有形成明确领域语义后才新增专用 capability

v12 删除顶层 `prefs`，不新增 generic `settings`，也不保留 alias。

`addon.getConfig()` 删除 `prefsPrefix`，只保留已经固定的 `addonName/addonRef/addonVersion` identity DTO。

### 15.2 Status tags

v12 保留：

```ts
type StatusTagKey =
  | "need-metadata-curation"
  | "need-fulltext"
  | "need-markdown"
  | "need-analysis"
  | "need-deep-reading";

type StatusTagValue =
  | "status:need-metadata-curation"
  | "status:need-fulltext"
  | "status:need-markdown"
  | "status:need-analysis"
  | "status:need-deep-reading";

type StatusTagPolicyDto = Record<StatusTagKey, StatusTagValue>;

type StatusTagTransitionRequestDto = {
  operationId: string;
  itemRef: PortableItemRef;
  expectedRevision?: string;
  add?: StatusTagKey[];
  remove?: StatusTagKey[];
};

type StatusTagTransitionResultDto = {
  itemRef: PortableItemRef;
  added: StatusTagValue[];
  removed: StatusTagValue[];
  unchanged: StatusTagValue[];
  revision: string;
};
```

并加固：

- item 只接受 portable ref；
- 输入数量有界；
- unknown key、conflict、item missing 使用稳定错误；
- warning 不泄漏 native error；
- interactive/non-interactive 均可用；
- 不并入 generic tag mutations。

`add` 与 `remove` 至少一项非空，同一 key 不能同时出现；每组去重后最多 16 项。该 specialized write 接入 canonical mutation authority，因此 `operationId` 必填、`expectedRevision` 执行可选 CAS，并返回统一 `MutationExecutionResult` 与 receipt。`unchanged` 只列 caller 请求但 current state 已满足的 policy tags；不返回开放 warning bag。status policy 的 key/tag mapping 只有上述一份 closed SSOT。

ownership 与现有 caller migration 同步固定：reserved status policy 与 Zotero read/write semantics 归 Broker/canonical mutation authority，`hostApi.ts` 只显式投影 `getPolicy/transition`，不得继续直接调用 raw tag handlers。v12 把 add/remove 作为一个可验证 mutation boundary；不会沿用当前实现“add 与 remove 分别尝试，再把失败放进 `warnings[]`”的 partial-write 语义。

现有 MinerU、metadata curator、deep reading、search ingest 与 literature analysis callers 必须改为读取统一 envelope：`committed/unchanged` 分支消费 `result`；`failed/canceled/unknown/repair_required` 分支把 closed `attempt` 映射成各 workflow 自己的 partial/diagnostic result。不得继续读取 `statusTransition.warnings`，也不得因为删除 warning bag 而把 transition failure 静默当作成功。这个迁移改变的是失败表达与原子性，不删除 caller 现有“主产物成功但状态清理失败时报告 partial”的产品语义。

## 16. 明确拒绝或延期的设计

### 16.1 已拒绝

- 把 Workflow Host 作为 Host Bridge/MCP 的统一 facade。
- 继续把 full-library traversal 归给 tag-auditor。
- caller 自行循环 page cursor。
- 一次返回全量 traversal array。
- 使用 async iterator 作为第一版 traversal lifetime。
- generic `page/read/traverse(kind)` dispatcher。
- 保留 v2-v11 compatibility 或 `items.getAll` fallback。
- 删除成员后仍声称 contract 为 v11。
- 把 ordinary `listItems`/`traverseItems` 冒充 snapshot consistency，或把 full snapshot feed 扩张为 incremental change-log protocol。
- audit conflict 后自动重扫整个 library。
- partial ledger publish。
- 用 Synthesis operation status 充当 ledger readiness。
- 把 `library.readinessAudit` 作为 Zotero library capability。
- annotation export 进入基础 library read。
- related-item mutation自动双向。
- generic prefs/settings 投影给 workflow。
- generic command runner 或无行为的 `command` placeholder。
- 使用 `Zotero.version`、backend/provider/product 字符串或 agent family 选择 runtime adapter implementation；兼容分派只允许按调用 feature detection。
- 把 filesystem、runtime globals、Window、picker 与 subprocess 合并成一个 generic runtime facade。
- 把 one-shot、streaming、ACP protocol、process-group lifecycle 与所有领域 outcome 合并成万能 process runner。
- 在 §4.5 批准的 native workload 例外之外保留 caller-local `IOUtils`、`OS.File`、Node filesystem 或 subprocess selector。
- 在 current-view DTO 中内嵌完整 selection，或把 selection summary 当作权威 library detail。
- 向 workflow 暴露 selection cursor、分页版与完整快照版两套并行接口。
- 在可信 in-process Workflow Host 内为 file/archive/resources 再建立一套 opaque path registry 或平行 handle API。
- 把 local filesystem path 投影到 Host Bridge/MCP、remote descriptor、mutation receipt 或 durable workflow identity。
- HTML/image/file/generic MIME clipboard。
- public raw `Zotero.Item`、`Zotero.Collection`、`nsIFile`、Components、IOUtils 或 Node fs。
- 把 legacy TypeScript `SynthesisService` 重新作为 production Workflow Host owner。

### 16.2 已延期

- symmetric related-item high-level operation。
- `item.restore`、`notes.restore`、`attachments.restore` 的跨 owner 恢复契约。
- collection tree/detail/children API。
- clipboard typed MIME。
- Host Bridge/MCP 对新增 Workflow Host members 的 exposure；必须单独审查。
- legacy TypeScript `SynthesisService` 的最终删除；需要独立 deletion list 与 harness migration。

## 17. Stable error taxonomy

### 17.1 唯一公共错误结构

v12 的 Workflow Host、broker、file/archive/resources、Synthesis facade 与 UI deny adapters 共享一个 closed public taxonomy：

```ts
type WorkflowHostErrorCode =
  | "invalid_request"
  | "invalid_ref"
  | "not_found"
  | "unsupported_operation"
  | "interaction_required"
  | "permission_denied"
  | "resource_limited"
  | "conflict"
  | "unavailable"
  | "canceled"
  | "execution_failed";

type WorkflowHostErrorData = {
  [K in WorkflowHostErrorCode]: {
    schema: "zotero-agents.workflow-host-error.v1";
    code: K;
    retryable: boolean;
    details: WorkflowHostErrorDetailsByCode[K];
  };
}[WorkflowHostErrorCode];
```

`WorkflowHostErrorData` 是公开、可序列化的结构契约。JS/TS 内部可以使用 Error subclass 和安全的人类可读 message，但 caller 不得按 message、class name 或 stack 分支；message 也不得自动进入 remote details、receipt 或 attempt evidence。

error code union、per-code details schema、strict-JSON validation 与安全 normalization helpers 由一个 projection-neutral、contract-only module 持有。它不拥有 Zotero、filesystem、Synthesis、UI、authorization 或 transport behavior，也不形成新的 runtime service/adapter chain。

owner 与依赖方向固定为：

- `ZoteroHostCapabilityError` 继续是 Broker Zotero capability semantics 的 canonical runtime exception class，并符合共享 contract；
- file、archive、resources、Synthesis facade 等 owner 在各自 implementation locality 使用同一个 contract/factory，不各自定义近似枚举或 open-string error bag；
- Workflow Host adapter 只组合和投影统一 public DTO，不在 `hostApi.ts` 保存 code mapping、details allowlist 或 catch/switch SSOT；
- Host Bridge 的 authorization、permission、exposure 与 transport failures 仍由 Host Bridge adapter 持有；可以映射到 transport contract，但不能反向改变 Broker/Workflow Host taxonomy；
- neutral contract module 不能 import Broker、Workflow Host projection、Host Bridge、runtime adapter 或 Synthesis implementation。

因此，`WorkflowHostErrorData` 是该 neutral contract 在 Workflow Host v12 的公开 schema identity，不是其定义权来源；Broker 也不能因为提供 canonical Zotero exception class 而成为所有非 Zotero owner 的错误事实源。

### 17.2 Code 含义

- `invalid_request`：字段、格式、组合、schema 或 operation input 非法；
- `invalid_ref`：portable ref 的结构或 kind 非法；不回显 raw ref；
- `not_found`：ref 合法但 item、note、attachment、collection、resource 等目标不存在；对象种类放在 `details.kind`；
- `unsupported_operation`：不属于 v12 closed operation/member contract；
- `interaction_required`：当前 adapter 为 non-interactive，但该 member 需要 picker、editor、navigation 或 clipboard UI；
- `permission_denied`：authorization、安全策略或宿主权限明确拒绝；
- `resource_limited`：entries、bytes、depth、count、path length 或其他固定预算超限；
- `conflict`：revision mismatch、concurrent modification、idempotency conflict 或 operation in progress；
- `unavailable`：runtime、capability、filesystem、navigation 或 adapter 当前不可用；
- `canceled`：尚未进入 process-local accepted attempt 的无状态/只读调用已确认取消；
- `execution_failed`：调用已明确失败，且没有更准确的 stable category。

不增加 `item_not_found/note_not_found/collection_not_found` 等 domain-specific top-level code；统一使用 `not_found + details.kind`。不根据 error prose、backend product、provider ID 或 command name 动态生成 code。

### 17.3 Closed details 与敏感信息

`details` 必须按 `code` 使用 closed schema：

- `invalid_request`：bounded `reason`，以及可选的受控 `field/operation`；
- `invalid_ref`：`kind` 与受控 ref-shape reason；
- `not_found`：`kind`，以及必要时的 bounded opaque key；
- `unsupported_operation`：只允许 v12 closed operation/member name；
- `interaction_required`：被 deny 的 closed host member name；
- `resource_limited`：`resource/limit` 与可选 finite `observed`；
- `conflict`：`reason` 只允许 `revision_mismatch/concurrent_modification/idempotency_conflict/operation_in_progress/ambiguous_state`；
- `unavailable`：`reason` 只允许 `runtime/capability/filesystem/navigation/adapter`；
- `execution_failed`：只允许 bounded `phase/recovery/affectedCount/residualCount`；
- `permission_denied/canceled` 只带恢复所必需的 bounded reason/context。

exact details mapping：

```ts
type WorkflowHostTargetKind =
  | "library"
  | "item"
  | "note"
  | "attachment"
  | "annotation"
  | "collection"
  | "resource"
  | "prepared_image"
  | "bibliography_format"
  | "workflow_input"
  | "archive_entry";

type WorkflowInteractionMember =
  | "context.getCurrentView"
  | "context.getSelectedItems"
  | "navigation.openItem"
  | "navigation.openNote"
  | "navigation.openCollection"
  | "navigation.openSelection"
  | "file.pickDirectory"
  | "file.pickFile"
  | "file.pickSaveFile"
  | "file.pickFiles"
  | "clipboard.readText"
  | "clipboard.writeText"
  | "clipboard.hasText"
  | "clipboard.clear"
  | "editor.openSession"
  | "notifications.toast";

type WorkflowHostErrorDetailsByCode = {
  invalid_request: {
    reason:
      | "missing_field"
      | "invalid_type"
      | "invalid_value"
      | "invalid_combination"
      | "invalid_schema"
      | "invalid_format"
      | "duplicate_value"
      | "checksum_failed"
      | "unsafe_path"
      | "unsupported_value";
    field?: string;
    operation?: MutationReceiptOperation;
  };
  invalid_ref: {
    kind: WorkflowHostTargetKind;
    reason:
      | "invalid_shape"
      | "invalid_library_id"
      | "invalid_key"
      | "wrong_kind"
      | "foreign_scope"
      | "expired"
      | "forged";
  };
  not_found: {
    kind: WorkflowHostTargetKind;
    opaqueKey?: string;
  };
  unsupported_operation: {
    memberOrOperation: string;
  };
  interaction_required: {
    member: WorkflowInteractionMember;
  };
  permission_denied: {
    reason: "host_permission" | "security_policy" | "authorization";
    kind?: WorkflowHostTargetKind;
  };
  resource_limited: {
    resource:
      | "items"
      | "entries"
      | "bytes"
      | "characters"
      | "depth"
      | "pages"
      | "duration_ms"
      | "path_length"
      | "translators"
      | "candidates"
      | "response_bytes"
      | "selection";
    limit: number;
    observed?: number;
  };
  conflict: {
    reason:
      | "revision_mismatch"
      | "concurrent_modification"
      | "idempotency_conflict"
      | "operation_in_progress"
      | "ambiguous_state";
    kind?: WorkflowHostTargetKind;
  };
  unavailable: {
    reason: "runtime" | "capability" | "filesystem" | "navigation" | "adapter";
    kind?: WorkflowHostTargetKind;
  };
  canceled: {
    reason: "caller_signal" | "host_shutdown";
  };
  execution_failed: {
    phase:
      | "validation"
      | "read"
      | "staging"
      | "write"
      | "commit"
      | "verification"
      | "cleanup"
      | "adapter";
    recovery:
      | "none"
      | "retry_same_operation"
      | "refresh_and_retry_new_operation"
      | "reconcile"
      | "manual_repair";
    affectedCount?: number;
    residualCount?: number;
  };
};
```

`unsupported_operation.memberOrOperation` 只保存 caller 提交的 sanitized bounded token，帮助定位它试图调用的 member/operation；unknown token 天然不属于 exact manifest，因此不能拿该字段做 capability lookup、fuzzy alias 或 dispatch fallback。`field`、`opaqueKey` 与该 token 都有 128-character 上限并经过 sanitizer。

所有字符串和集合有长度/数量上限，数值必须 finite。details 不得包含 raw ref、native cause、stack、宿主对象、本地绝对路径、clipboard/content payload、secret 或未经清洗的原始错误文案。

### 17.4 Throw 与 returned outcome 的边界

- 无状态读取、输入验证或 operation 尚未被接受时，可以抛 stable error；
- mutation 一旦完成 process-local operation reservation/acceptance，后续失败必须返回 structured attempt，不再只抛异常；
- mutation 保持已确认的 `committed/unchanged/failed/canceled/unknown/repair_required` result union；
- `unknown` 表示最终提交状态无法确认，必须 reconcile，禁止盲目 replay；
- `repair_required` 表示已经确认存在补偿残留，需要 repair/reconcile；
- `unknown` 与 `repair_required` 不再作为 top-level error code，避免与 operation outcome 重复表达；
- accepted mutation 的 `canceled` 是 attempt outcome；只有尚未进入 process-local accepted attempt 的无状态/只读调用才抛 `code: "canceled"`；
- partial success 是 research bundle、batch 等领域 result，由逐项 outcome/receipt 表达，不能压成 thrown exception；
- unexpected facade/runtime failure 仍映射为 stable error，但不得丢失当前调用已经形成的 structured attempt evidence。

### 17.5 Retry 与 transport projection

`retryable` 只是 transport hint，不是恢复语义的唯一事实源：

- `invalid_request/invalid_ref/not_found/unsupported_operation/interaction_required/permission_denied/resource_limited/canceled` 固定为 `false`；
- `conflict` 默认 `false`，caller 按 reason fresh-read、等待或更换 operation ID；
- `unknown/repair_required` 是 outcome，必须按 attempt 的 `recovery` 处理，不能盲目 replay；
- `unavailable/execution_failed` 只有在 owner 明确证明 same-operation retry safe，并给出 `recovery: "retry_same_operation"` 时才能为 `true`。

Host Bridge 保持自己的 transport envelope、HTTP/category/state-change/safe-action 语义；MCP 保持 tool-result envelope。但二者必须通过集中 adapter 从同一 stable taxonomy 投影，不得重新解析 prose 或把 transport code 反向定义成 broker/Workflow Host code。JSON-RPC invalid-params 只用于 MCP 请求自身非法，不用于包装 Zotero/runtime failure。

public Workflow Host 删除 `requiresConfirmation`；authorization、permission prompt 与 exposure 继续由 Host Bridge/MCP adapter 负责。

## 18. 测试与治理原则

实施必须采用 TDD，并优先修改/扩展现有稳定行为测试。interface 是测试面，禁止围绕 implementation 顺序、完整错误文案或内部 schema 写脆弱测试。

至少需要以下门禁：

1. v12 exact top-level 与 nested member conformance。
2. interactive/non-interactive 两个 projections 的相同 shape 与 deny behavior。
3. workflow consumer 静态扫描，禁止 raw escape hatches。
4. `WorkflowHostApi.items` 不存在。
5. `items.getAll`、raw handler aliases、prefs、test-only logging members 不存在。
6. `command` 在两种 projection 中都不存在，且无 alias、stub 或 generic fallback。
7. current view 不内嵌 selection，selection snapshot 完整或以 `resource_limited` 整体失败，且 UI unavailable 不等同于 empty selection。
8. context/selection DTO 为 strict JSON、只含 portable refs，不含 raw host object、本地路径、rich authoritative metadata 或显式 `undefined` 字段。
9. Broker 新增成员不会自动进入 Workflow Host。
10. traversal 验证 ordering、opaque cursor、serial callback、budgets、cancel、late-settle 与 failure。
11. tag summary 读取失败/截断 fail-closed。
12. tag audit active ledger、staging、conflict、empty library、cancel、cleanup、promotion invariants。
13. mutation receipt replay、unknown outcome、revision CAS 与 observer fallback。
14. file/archive/resources 的 limits、atomicity、cleanup 与 scope confinement。
15. archive callback path 在 callback settle 后失效；resource output path 不能跨 run/slot 发布；所有 remote/durable descriptors 均不含 local path。
16. `environment.getInfo()` 只有三个固定字段和闭合 platform enum；`addon.getConfig()` 只有三个 identity 字段，且不含 `prefsPrefix`。
17. 所有 public errors 只使用 11 个 closed codes 与 code-specific details；禁止 prose-derived code、native cause、path/secret 泄漏和完整 message 断言。
18. throw 与 returned outcome 边界、mutation `unknown/repair_required` recovery、集中 Host Bridge/MCP projection。
19. Node/test adapters fail-closed，不默认调用真实 Zotero runtime。
20. 11 个 execute requests/results 与 3 个 preview requests/plans 穷尽映射；open operation、open warning、optional-field mega bag 无法通过 contract。
21. `statusTags.transition` 由 Broker/canonical authority 原子执行，不返回 legacy `warnings[]`；现有 callers 对 attempt 分支保留 domain partial diagnostics。
22. `researchBundles.importPapers` 验证 dependency DAG、SCC atomic group、independent partial success、receipt/attempt reference SSOT、cancel 与 repair precedence。
23. Synthesis projection 只有 4 groups/14 members，新增 wire contracts 与 canonical package/Rust sidecar parity，flat aliases 与 raw callbacks 不存在。
24. manifest AST 指标固定为 23/21/87，所有可达 noncanonical public types 有唯一 declaration，禁止 duplicate declaration 与 unresolved alias。
25. production TypeScript 的普通异步文件操作不在批准例外之外直接选择 `IOUtils`、`OS.File` 或 Node adapter；AST/import governance 只允许 `runtimePersistence` owner 与 §4.5 的闭合 native workload allowlist。
26. `runtimePersistence` interface 测试覆盖 strict/tolerant failure、adapter unavailable、Unicode-safe append、atomic operation 与 per-call late binding；同一 cached caller 在两次调用间更换 runtime globals 时，第二次必须使用新 adapter。
27. `platform/subprocess` interface 测试覆盖 normalized stdout/stderr/exit、unavailable、timeout、bounded termination 与 Windows hidden one-shot execution；ACP transport、bridge、installer 和 dependency probe 继续从各自可观察 outcome 测试 lifecycle，不锁定底层 fallback 调用顺序。
28. `runtimeBridge` 与 `filePicker` interface 测试覆盖 override、candidate completeness、hidden-window failure isolation、live/closed parent、native/toolkit adapters、filters、cancel、empty/multi selection 与 per-call late binding；不得精确断言 native import URL、toolkit constructor 参数数组或内部 candidate traversal 顺序。

迁移完成后，删除只覆盖 `runtimeCompatibility` filesystem helpers、`platform/subprocess.ts` re-export 或 caller-local adapter selector 的测试；相同行为由 deep module interface 测试替代。architecture governance 可以使用 AST/import ownership 检查，不得退化为对完整源码文案、错误文案或大段 snapshot 的静态断言。

## 19. 已确认的实施方案

本节记录已经落地的 OpenSpec implementation topology 与后续代码执行顺序。它不授权提交、分支切换、Git 历史改写或发布。

### 19.1 集成与固定 baseline

当前已核实并固定：

- `dev` 与 `origin/dev`：`4dbddc24e884921262c559428bf851db5eadf2d7`；
- `dev-refactor` 与 `origin/dev-refactor`：`57325c375e4896df2e8e5016241b7d80fd8cb878`；
- `dev-refactor` 是 `dev` 的祖先，`dev` 已包含目标集成结果；
- Workflow Host v12 唯一实现 baseline `B`：`4dbddc24e884921262c559428bf851db5eadf2d7`；
- `B` 已写入九个 change 的 proposal、design 与 tasks，未以 branch name 或浮动 ref 代替；
- 当前未提交改动不属于 `B`，本轮仅新增 OpenSpec 工件并更新本 ADR，没有把这些改动纳入 baseline。

代码实施前不需要重做旧 integration merge。执行者必须从 `B` 核对 production evidence；如在包含既有未提交改动的工作区继续，需逐文件保护用户改动，不能用 reset、checkout 或覆盖式操作清理工作区。

### 19.2 OpenSpec implementation topology

不再把全部 v12 工作塞入单一 mega change。设计阶段由本工件统一持有完整 member manifest、跨模块不变量、删除清单、依赖顺序与最终切换条件；实施阶段按 deep-module seam 拆为可独立审阅、测试和归因的 vertical OpenSpec changes。

切片已按以下 exact change names 落地；每个目录均包含 proposal、delta specs、design 与文件级 tasks：

1. `01-establish-workflow-host-v12-contract-foundation`：projection-neutral error contract、portable refs、strict JSON DTO、closed unions、call control 与 Broker/adapter ownership rules。
2. `02-deepen-workflow-host-runtime-adaptation-v12`：production-wide ordinary async filesystem closure、批准的 native workload allowlist、`runtimeBridge`/`filePicker` owner convergence、per-call late binding 与 adapter governance；不改变 v12 public member manifest。
3. `02p-consolidate-platform-subprocess-one-shot-seam`：plugin-internal subprocess companion，深化 `src/platform/subprocess.ts`、迁移 one-shot callers，并保留 ACP/bridge/domain lifecycle ownership。
4. `03-add-workflow-host-library-live-reads`：常规 item/collection/annotation/note/attachment reads、bounded pages、traversal 与 completion evidence；不得冒充 stable snapshot。
5. `04-add-workflow-host-library-snapshot-feed`：Broker snapshot session、Workflow callback projection、Host Bridge paged projection、CLI/Hermes transactional refresh 与 agent-facing surface gates。
6. `05-establish-workflow-host-mutation-authority`：process-local operation registry、CAS/revision、三类高风险 preview、receipt/attempt、notes、attachments、managed staging、compensation 与 repair outcome。
7. `06-establish-workflow-host-research-product-io`：Research Bundle graph import/export、file/archive/resources 与相关 materialization/import seam；各 nested module 分别接受 deep-module 审阅。
8. `07-add-workflow-host-synthesis-facade`：grouped Workflow projection、tag-audit run contract、atomic promotion、regulation acknowledgement；lease/fencing/cleanup/telemetry 留在 Synthesis internal spec。
9. `harden-workflow-host-api-v12`：迁移全部 consumers，建立 exact `WorkflowHostApi` projection 与 contract identity，删除 v11/raw escape hatches，并一次性启用 `version: 12`。

`02p` 可以与 v12 领域切片并行，不阻塞 public contract 或 atomic activation；但“Zotero 版本相关 runtime adapter 已完全收敛”的总体完成条件仍要求该 companion change 通过 §18/§19.5 门禁。

依赖关系为：contract foundation 先行；runtime host adaptation deepening 可以与 library、snapshot、mutation 和 Synthesis 切片并行，但必须在 research product I/O 与 atomic v12 activation 前完成；atomic v12 activation 依赖全部七个前置 v12 slices 完成并通过门禁。Platform subprocess companion 不在 public v12 activation dependency chain 中，不能因此把 subprocess 成员加入 Workflow Host manifest。切片完成只表示对应 owner capability 可用，不得提前投影残缺的 `version: 12`，也不得对外发布多个 shape 不一致的 v12。

最终 activation change 使用：

```text
harden-workflow-host-api-v12
```

它负责完整 public contract、version identity、closed member map、consumer migration、批准删除清单与 package guard 的原子一致，但不重复承载已经由前置切片验证的内部实现任务。计划包含：

```text
openspec/changes/harden-workflow-host-api-v12/proposal.md
openspec/changes/harden-workflow-host-api-v12/design.md
openspec/changes/harden-workflow-host-api-v12/tasks.md
openspec/changes/harden-workflow-host-api-v12/specs/workflow-host-api-v12/spec.md
```

各 vertical change 只为实际发生语义变化的 owner capability 增加 delta specs；没有语义变化的历史 spec 不做机械改写。已落地的 capability 范围以各 change 的 `specs/*/spec.md` 为准，包括：

```text
zotero-host-capability-broker
zotero-host-broker-capability-api
selection-context
workflow-resource-bindings
research-bundle-workflow
research-bundle-readable-product
synthesis-layer-integration
synthesis-tag-vocabulary
```

设计硬化完成前，本工件是完整 v12 manifest 的唯一事实源。最终 activation change 中的 `workflow-host-api-v12` 承接为完整 public contract 的 canonical spec；其他 vertical delta specs 只记录各 owner 被 v12 修改的领域不变量，不能复制整份 member map 形成第二事实源。

### 19.3 计划变更文件与范围

最终 exact file list 必须在 baseline `B` 上由 OpenSpec tasks 固定。按当前证据，计划修改至少包括：

Contract 与 composition：

```text
src/workflows/types.ts
src/workflows/hostApi.ts
src/workflows/workflowHostContract.ts
```

Owner 与 adapter：

```text
src/modules/zoteroHostCapabilityBroker.ts
src/modules/runtimePersistence.ts
src/utils/runtimeCompatibility.ts
src/utils/runtimeBridge.ts
src/platform/filePicker.ts
src/platform/subprocess.ts
src/platform/command.ts
src/platform/env.ts
src/workflows/archive.ts
src/workflows/workflowInputMaterialization.ts
src/modules/hostBridgeWorkflowResources.ts
src/modules/synthesisClient/workflowHostClient.ts
src/handlers/index.ts
```

Runtime host adaptation 的 ordinary-I/O migration 当前至少涉及：

```text
src/workflows/loader.ts
src/workflows/packageHookBundler.ts
src/workflows/zipBundleReader.ts
src/workflows/workflowInputPlanning.ts
src/modules/workflowRuntime.ts
src/modules/workflowExecution/bundleIO.ts
src/modules/builtinWorkflowSync.ts
src/modules/skillRunnerLocalRuntimeManager.ts
src/modules/skillRunnerReleaseInstaller.ts
src/modules/runtimeFileTransfer.ts
src/modules/hostBridgeProfileStore.ts
src/providers/generic-http/provider.ts
src/providers/skillrunner/client.ts
src/modules/windowsCommandResolution.ts
src/modules/synthesis/gitExecutableResolver.ts
src/modules/acpTransport.ts
```

Runtime/window/picker resolver consolidation 当前至少涉及 `src/modules/acpContextBuilder.ts`、`src/workflows/workflowNoteImagePreparation.ts`、`src/modules/selectionSample.ts`、Broker/library/note-payload callers 与 UI hosts。owner 自己持有的 dialog/preferences Window 和 raw diagnostic candidate enumeration 不在删除范围。

Platform subprocess companion 的 one-shot migration 当前至少涉及：

```text
src/modules/acpRuntimeDependencyWrapper.ts
src/modules/skillRunnerLocalRuntimeManager.ts
src/modules/skillRunnerCtlBridge.ts
src/modules/hostBridgeCliInstaller.ts
src/modules/hostBridgeCliInstallPrompt.ts
src/platform/command.ts
src/platform/env.ts
```

`src/modules/acpTransport.ts`、`src/modules/acpWebSocketBridgeService.ts` 与 `src/modules/acpBackendRefreshCacheDiagnostic.ts` 可能需要适配新的 internal seam，但其 streaming/bridge/diagnostic ownership 不迁入 `platform/subprocess.ts`。

在 `dev-refactor` baseline 上还会按 Synthesis/full-snapshot vertical slices触及以下 families；它们不能被上面的 TypeScript 主干清单漏掉：

```text
packages/synthesis-contracts/src/**
native/synthesis-sidecar/crates/synthesis-application/**
native/synthesis-sidecar/crates/synthesis-repository/**
src/modules/synthesisClient/**
src/modules/hostBridgeCapabilityRegistry.ts
src/modules/zoteroMcpProtocol.ts
cli/zotero-bridge/**
profiles/hermes/zotero-librarian/**
```

Consumer migration：

```text
workflows_builtin/literature-workbench-package/**
workflows_builtin/synthesis-layer/**
workflows_builtin/workflow-debug-probe/**
workflows_builtin/mineru/**
```

Tests 以扩展或重写现有稳定行为测试为主，重点包括：

```text
test/core/102-zotero-host-broker-capability-api.test.ts
test/core/108-runtime-persistence-governance.test.ts
test/core/52-runtime-bridge.test.ts
test/core/164-runtime-platform-services.test.ts
test/core/165-runtime-platform-services.zotero.test.ts
test/core/90-workflow-host-api-file-picker.test.ts
test/core/90-workflow-note-image-preparation.test.ts
test/core/90-workflow-stored-attachment-import.test.ts
test/core/91-workflow-host-api-archive.test.ts
test/core/129-synthesis-layer-integration.test.ts
test/core/140-synthesis-tag-vocabulary.test.ts
test/core/174-workflow-archive-zotero-runtime.test.ts
test/core/98-acp-transport.test.ts
test/node/core/74-skillrunner-ctl-bridge.test.ts
test/node/core/130-zotero9-compatibility.test.ts
test/node/core/187-workflow-host-contract-governance.test.ts
```

删除范围以已确认的 member/symbol deletion list 为准。除既有 v12 public member deletions 外，本轮新增批准删除 `runtimeCompatibility.runtimeFileExists/runtimeReadTextFile/runtimeRemoveFile/getMozillaSubprocessModule`、`platform/subprocess.ts` 的 re-export implementation、caller-local 等价 adapter selectors 与只覆盖这些 shallow implementation 的测试。当前没有批准整文件删除；不得为清理方便扩大到无关模块。baseline `B` 上若发现新的平行 selector，必须按 §4.5 分类为 ordinary operation 或批准 native workload，不能在 tasks 中临时增加第三类。

### 19.4 TDD 与切片完成顺序

1. 先完成 contract foundation；测试锁定 neutral contract、Broker ownership、portable JSON boundary 与 fail-closed adapter，不提前实例化残缺的 public v12 facade。
2. 启动 runtime host adaptation deepening：先在 `runtimePersistence`、`runtimeBridge` 与 `filePicker` interface 写失败测试和 governance allowlist，再迁移普通 I/O 与通用 resolver callers。该切片可与 library/snapshot/mutation/Synthesis 并行，但 research product I/O 不得在旧 adapter selector 上继续扩张。
3. 按 §19.2 分别完成 library live reads、full-library snapshot feed、mutation authority、research product I/O 与 Synthesis facade。每个切片必须在自身 owner seam 上获得稳定测试与明确完成证据，失败可归因到该切片；research product I/O 开始实质实现前，runtime host adaptation 必须已提供可用 seam。
4. Platform subprocess companion 在 baseline `B` 后独立采用 TDD：先锁定 normalized one-shot outcome，再迁移 callers；它可以与 v12 领域切片并行，不得改变 Workflow Host exact manifest，也不得为了复用而搬走 ACP/bridge/domain lifecycle。
5. 七个前置 v12 slices 全部完成后，再开始 atomic v12 activation：先建立 exact surface/contract identity 的失败测试，然后一次性组合完整 facade、迁移 consumers、删除旧成员与 raw escape hatch。
6. 同步 package guard、canonical spec、受影响 owner delta specs 与直接受影响文档。
7. 运行 §19.5 final gates，并用 OpenSpec verification 核对本工件、proposal/design/spec/tasks 与实现 parity；runtime adapter 总体完成报告还必须单独确认 subprocess companion 状态。

每个 vertical change 都先修改或扩展能代表稳定外部行为的现有测试，再实现通过。不得新增只锁定完整 message、字段顺序、内部调用顺序、临时对象布局或大段 snapshot 的测试。不得为了让某个切片暂时通过而引入 v11 alias、新的 raw escape hatch、兼容分支或第二份 member manifest。

### 19.5 验证矩阵

Integration baseline gates：

```text
npm run test:node:core
npm run test:node:workflow
npm run test:synthesis:invariants
npm run check:builtin-workflow-manifest
npm run build
```

实施期间按领域运行 §18 的 targeted invariants。最终至少运行：

```text
npm run test:node:core
npm run test:node:workflow
npm run test:zotero:core
npm run test:zotero:workflow
npm run test:synthesis:invariants
npm run check:builtin-workflow-manifest
npm run lint:check
npm run build
npm run test:gate:pr
```

验证结果必须逐命令记录 pass/fail/not-run 与原因。任何因环境缺失而未运行的命令都不能记为通过；失败必须先区分 integration baseline failure、v12 regression 与既有不相关 failure。

Runtime host adaptation deepening 的切片完成证据必须包括：

- `runtimePersistence` strict/tolerant、atomic、Unicode、adapter unavailable 与 per-call late-binding tests 通过；
- `runtimeBridge`/`filePicker` candidate、parent、fallback、cancel 与 per-call late-binding tests 通过；
- production TypeScript ordinary-I/O 与通用 runtime/window resolver governance scan 的 unauthorized count 为零；
- 每个 native workload allowlist entry 都能映射到 §4.5 的 owner 和稳定测试，不存在临时例外。

Platform subprocess companion 的完成证据必须包括：

- normalized one-shot stdout/stderr/exit/unavailable/timeout/termination tests 通过；
- Windows hidden/XPCOM 与 Node/Mozilla production adapters 有对应 interface evidence；
- ACP transport、bridge、SkillRunner、installer 与 dependency probe 的既有可观察 lifecycle/outcome tests 通过；
- `runtimeCompatibility.getMozillaSubprocessModule`、shallow re-export 与 caller-local 等价 selector 已删除，raw diagnostic probe 未成为 dispatch SSOT。

除 §5.9 明确批准的 full-library snapshot vertical slice 会深化既有 Host Bridge `library.sync_snapshot` projection 外，Host Bridge/MCP 对其他新增 v12 members 的 exposure 仍然延期，不自动随 Workflow Host projection 发布。若实施触及三个 agent-facing semantic surfaces，必须另行固定其 baseline、materialized metrics 与批准删除清单，并执行 semantic parity、厚度与 review-mirror 门禁。

### 19.6 Contract closure ledger

集中式 contract authoring 已闭合以下内容：

- §3.7 冻结 23 个 top-level keys、21 个 nested modules 与 87 个 callable members；机械 AST 计数与正文指标一致；
- exact manifest 可达的 205 个 contract type references 均能在本工件找到定义，或明确来自 `packages/synthesis-contracts` canonical package；没有 unresolved noncanonical type；
- 11 个 generic execute operations、3 个 mandatory preview operations、全部 specialized mutation receipt discriminants、request/result maps 与三种 exact preview plans 已闭合；
- `researchBundles.importPapers` 的 per-paper result、SCC consistency group、dependency scheduling、late relation binding、partial success、receipts/attempts、cancellation/compensation、outcome precedence 与 limits 已闭合；
- 11 个 shared error codes、code-specific details、throw/outcome boundary 与 sensitive-data rules 已闭合；nonfatal diagnostics 使用各领域 closed unions，Synthesis internal telemetry 除外；
- traversal、snapshot、notes、images、attachments、mutation registry/preview token、metadata、bibliography、research graph、file/archive/resources、clipboard、selection、logging 与 Synthesis 新 members 的 public budgets/lifetimes 已闭合；
- interactive/non-interactive shape、UI deny behavior、strict JSON 与 trusted in-process exception list 已闭合；
- v11/raw surface 删除清单、无兼容硬切换与延期清单已闭合；
- production-wide ordinary async filesystem closure、闭合 native workload allowlist、feature-detection-only dispatch 与 per-call late binding 已闭合；
- `runtimeBridge`/`filePicker` 分离 ownership、`platform/subprocess` one-shot ownership、保留在 ACP/bridge/domain callers 的 lifecycle 以及新增 symbol deletion list 已闭合；
- runtime host adaptation v12 前置切片与 platform subprocess companion 的依赖和总体完成条件已闭合。

以下 private implementation facts 仍需在逐 change TDD 实施中机械落定，不是 public contract gap：

- canonical package 中最终 import path、symbol placement 与 private helper 分拆；
- Broker、Rust sidecar、repository 与 runtime adapter 的 private implementation mechanism；
- 每个 tasks 文件所列候选范围在实现后形成的 exact modified/added/deleted file list；
- Host Bridge agent-facing materialized baseline metrics。`04-add-workflow-host-library-snapshot-feed` 已将固定 baseline、空删除清单、四类计数与相对厚度门禁写入执行任务。

继续延期且不进入 v12 exact surface：symmetric related-item high-level operation、item/note/attachment restore、collection tree/detail/children、typed MIME clipboard、legacy TypeScript `SynthesisService` 最终删除，以及除 full-library snapshot 之外的 Host Bridge/MCP 新 member exposure。

### 19.7 最终架构审阅

#### 19.7.1 Deep module、locality 与 leverage

| 审阅单位 | 隐藏的复杂度与 locality | 对 caller 的 leverage | 结论 |
| --- | --- | --- | --- |
| `WorkflowHostApiV12` | 只持有 closed composition、projection、variant 与 contract identity；行为留在 owner | 一个稳定入口发现 21 个具名 capability modules | 顶层有意保持浅；不冒充单体 deep module |
| Broker + `library` | 集中 Zotero ref resolution、完整 serialization、分页、traversal、snapshot、revision 与读取错误 | caller 不接触 raw item、cursor loop 或 Zotero 版本差异 | deep，locality/leverage 充分 |
| `mutations` + `notes/attachments/statusTags` | 集中 reservation、CAS、preview、receipt、staging、compensation、verification 与 repair | caller 只声明目标状态并处理一个统一 outcome envelope | deep；specialized modules 复用 authority，不复制 lifecycle |
| `researchBundles` | 集中 graph validation、target mapping、SCC scheduling、child/resource staging、partial success 与 repair evidence | workflow 保留 format/manifest policy，不编排 Zotero graph write | deep；这是 raw domains 删除后最重要的高层 seam |
| `synthesis` grouped facade | Rust applications/repository/native RPC 保持内部；tag audit callback 隐藏 durable run/promotion/cleanup | workflow 按四个领域分组调用，不理解 sidecar transport | facade 本身薄，但投影到既有 deep owner，边界正确 |
| `file/archive/resources` | runtime adapter、atomic write、ZIP safety、run-scoped allocation/publish 与 cleanup 各有 owner | workflow 可组合本地可信 paths，同时不承担跨平台与 lifecycle 细节 | 三个相关但不重叠的 deep modules |
| `runtimePersistence` + approved native internal seams | 集中普通跨运行时异步 I/O adapter selection；worker、ZIP、SQLite、streaming 等 native workloads 只在闭合 owner-private seams 中存在 | production caller 复用语义操作，不理解 `IOUtils`、`OS.File` 或 Node selection | deep；SSOT 扩展到 production-wide ordinary I/O，native exception 不污染 interface |
| `runtimeBridge` + `filePicker` | runtime/global/Window candidate knowledge 与 picker semantics 分属两个有向依赖的 owners，并保持按调用晚绑定 | caller 不缓存或重复解析 Zotero/runtime/Window/picker shape | 两个 deep modules；不合并成 generic runtime facade |
| `platform/subprocess` | 集中宿主 module resolution、one-shot adapters 与 execution-result normalization；streaming/protocol/process ownership 留在领域 owner | command、installer、probe 与 SkillRunner 复用执行 seam，不学习 Zotero 7/9 subprocess shape | deep；interface 小于 implementation，不吸收 ACP/bridge lifecycle |
| addon/environment/context/navigation/clipboard/editor/notifications/logging | 每项语义较小，主要隔离 runtime/UI 与 variant behavior | 提供一致、可测试、fail-closed 的基础 capability | leaf adapters 较薄是正常结果，不应人为合并成 generic utility bag |

总体结论：方案形成的是“closed composition root + 多个领域 deep modules”，不是一个巨型 deep module。locality 的关键事实源已经唯一化：Zotero semantics 在 Broker，普通跨运行时异步 filesystem selection 在 `runtimePersistence`，runtime/global/Window resolution 在 `runtimeBridge`，picker semantics 在 `filePicker`，one-shot process execution 在 `platform/subprocess`，Synthesis durable semantics 在 Rust sidecar，remote locality/authorization 在 Host Bridge，public member identity 在 code-native manifest。leverage 足够高，尤其是完整读取、mutation authority、Research Bundle、tag audit 与 runtime adaptation 都把多步正确性从 caller 收回 owner。

实施时有五个不可放松的条件：`hostApi.ts` 不能重新吸收领域实现；`researchBundles.importPapers` 不能退化成顺序调用低层 members 的薄 wrapper；`runtimePersistence` 不能暴露 native object 来换取 caller migration；`runtimeBridge`/`filePicker` 必须按调用晚绑定；`platform/subprocess` 不能吸收 ACP/bridge/domain lifecycle。违反任一条件都会让当前 locality 结论失效。

#### 19.7.2 一致性与自洽性

审阅结论为通过。集中闭合中已经消除以下 drift：

- Synthesis 三个新增 wire contracts 已在各自 owner 章节冻结；
- Research Bundle composition 统一使用 manifest 中的 `archive.writeZipAtomic/withExtractedZip` 与 `resources.publishOutput`；
- status tag 当前的 partial `warnings[]` 迁移为统一 mutation envelope，同时保留 workflow 的 partial diagnostic 产品语义；
- preview `operation` 收紧为 `MutationPreviewOperation`，删除无独立语义的开放 warning bag，并补全三个 exact plans；
- Research Bundle failed rows 只按 `attemptId` 引用 canonical attempt，不复制第二份 error evidence；
- note payload diagnostic 使用 closed union；attachment file state 删除重复 issues bag；
- `context.getSelectedItems` 改为 async/cancelable，与 10,000-item hard limit 和 UI responsiveness 要求一致；
- callback-scoped tag-audit/archive handles 继承外层 control，不允许 caller 创建第二套 cancellation channel；
- public `MetadataLookupResultDto`、`AttachmentLinkMode`、shared refs 与 error spelling 已统一；
- runtime filesystem ownership 已从 Workflow Host caller 扩展到 production-wide ordinary async I/O，同时以闭合 allowlist 保留真正需要 native object/threading/streaming 语义的 internal seams；
- runtime/global/Window 与 picker ownership 已分离，subprocess one-shot execution 与 ACP/bridge lifecycle 也已分离；不存在新的 generic runtime/process facade。

以下看似不同的行为是明确的 projection 差异，不是矛盾：Workflow snapshot 使用 callback 隐藏分页，Host Bridge snapshot 使用 opaque cursor；Workflow attachment DTO 在可信进程内可含 local path，Host Bridge/MCP 必须删除 path；mutation registry 是 process-local，Synthesis tag-audit ledger 是 durable。当前 `dev` 已包含 `dev-refactor` 集成结果；后续实现风险来自跨 change 的并发编辑、当前脏工作区保护和 owner parity，不能用来改变已经冻结的 owner/seam。

#### 19.7.3 过度设计审阅

方案规模很大，但没有发现应从 v12 删除的已批准 capability。87 个 callable members 看起来很宽，实际被 21 个 coherent namespaces 分隔，其中大量是现有基础能力的固化与去 raw 化；把它们删除会重新迫使 caller 使用 handler、Zotero object、filesystem/runtime 或 sidecar transport。复杂部分也有对应需求：Hermes 完整索引需要 stable snapshot；tag audit 需要 durable promotion correctness；Research Bundle raw-domain migration 需要 graph import；stored attachment 需要 managed staging/compensation。

本轮已经主动去掉或拒绝了容易演化成过度设计的部分：

- 不建立 persistent mutation ledger、跨进程 replay/resume 或 public epoch；
- 不把 snapshot 扩张为 incremental change log/tombstone feed；
- 不提供 runtime capability catalog、proxy/spread projection 或 compatibility aliases；
- 不建立 opaque path registry、archive-entry handle 或第二套 file API；
- 不为全部 writes 增加 informational preview，只保留三类确有 data-loss 风险的 mandatory preview；
- 不把 Synthesis lease/fencing/heartbeat/telemetry 暴露给 workflow；
- 不加入 speculative restore、collection tree、typed clipboard 或 generic command runner；
- 不为版本适配建立按 `Zotero.version` 分派的 class hierarchy、runtime capability catalog 或万能 host facade；
- 不把 native workload 例外硬压进普通 filesystem interface，也不把 streaming/process lifecycle 硬压进 one-shot subprocess interface。

剩余的过度设计风险主要在实施方式，不在 public contract：若为每个 namespace 新建一层无行为 wrapper、复制 validators/mappings、把八个 v12 vertical slices 与 subprocess companion 同时铺开但不完成任何一条端到端路径，都会制造新复杂度。§19.2 的 vertical topology、SSOT、明确依赖与 atomic activation 正是防止这种情况的执行门禁。

#### 19.7.4 预期改动面

只读 inventory 在当前两个预集成 refs 上得到：`dev` 有 135 个文件命中 Workflow Host/direct consumer/snapshot 相关符号，其中 74 个位于 OpenSpec；`dev-refactor` 有 126 个命中文件，其中 67 个位于 OpenSpec。该数字只是已有 footprint，不等于计划逐文件修改数；它说明当前行为已经分散到 contract、owner、workflow、test、Host Bridge 与 specs。

原 Workflow Host v12 范围曾估计会修改或新增约 80–135 个 unique files，代码与测试 churn 约 37k–67k lines。加入 production-wide runtime host adaptation 与 subprocess companion 后，该数字已经不能代表完整范围；两个新切片与既有 v12 文件有显著重叠，不能把各自清单机械相加。baseline `B` 固定后必须重新计算 combined unique-file/churn estimate，§19.3 的当前清单只作为已知下限。范围的主要来源如下：

| 区域 | 预期改动强度 | 主要原因 |
| --- | --- | --- |
| contract、Broker、composition、runtime adapters | 高 | exact v12 type、explicit projection、error/JSON boundary、owner migration |
| library live reads + full snapshot | 高 | Broker session、Workflow callback、Host Bridge/CLI/Hermes transaction 同步变化 |
| mutation、notes、attachments、status tags | 很高 | canonical authority、request maps、receipt/attempt、staging/compensation、consumer migration |
| Research Bundle | 很高 | materialization、graph import、SCC partial success、resource mapping、现有 bundle workflow 重写 |
| Synthesis facade/tag audit | 高 | canonical contracts、TS client、Rust application/repository/schema、grouped callers |
| file/archive/resources/UI leaf capabilities | 中 | exact DTO、late-bound adapters、limits、cleanup 与 variant behavior |
| runtime host adaptation | 高 | production-wide ordinary-I/O migration、native exception governance、runtime/window/picker resolver convergence 与 late-binding tests |
| platform subprocess companion | 中到高 | one-shot adapter consolidation、Windows hidden execution、caller migration 与 lifecycle ownership preservation |
| builtin workflows 与 tests | 高 | v12 hard cut，无 compatibility path，现有 raw/status warning callers必须迁移 |
| OpenSpec、docs、Host Bridge surfaces | 中到高 | 八个 v12 vertical changes、一个 subprocess companion、final canonical spec、snapshot semantic-surface gates |

不会新增 mutation durable DB migration；Synthesis tag-audit staging/active-ledger 深化可能需要 sidecar SQLite schema migration。Zotero 用户库本身不做格式迁移。最大风险集中在 dev/dev-refactor integration、Host Bridge snapshot parity、Research Bundle compensation、Rust/TypeScript Synthesis contract parity 与 production-wide runtime adapter migration，因此不能用一个 mega implementation change 承载；八个 v12 vertical changes 加一个可并行 subprocess companion 是与依赖关系相称的最小治理结构。

## 20. 当前停止点

Workflow Host v12 方案已经完成 implementation-readiness contract closure、最终审阅与九个 OpenSpec changes 的工件落地。exact surface 已在 final activation delta spec 中冻结；production runtime filesystem、runtime/window/picker 与 subprocess ownership 也已分配到对应 changes。没有剩余 public member、DTO、error、lifetime、partial-success 或 runtime adapter owner 决策等待讨论。

本轮已授权并完成 OpenSpec proposal、delta specs、design 与 tasks 的创建，尚未执行 production/test code。以下事项仍未获授权：

- merge、fast-forward、commit、branch switch 或其他 Git 写操作；
- 修改 production/test code 或将 tasks 标记为已完成；
- 运行发布流程。

开始代码实施时，从 `01-establish-workflow-host-v12-contract-foundation` 的 TDD tasks 起步；`02`、`02p` 与后续领域线按 §19.2 的依赖关系推进，最后执行 `harden-workflow-host-api-v12`。若 `B` 上的 production evidence 与本工件或 delta specs 的 public semantics 发生真实冲突，必须回到【制定方案】说明冲突，不能在 implementation 中自行改 contract。
