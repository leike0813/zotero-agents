# Sistema Hook

훅은 Workflow의 확장 가능성 지점입니다. Workflow 실행의 여러 단계에서 플러그인의 Workflow Runtime이 해당 훅 스크립트를 호출하여 JavaScript로 실행 흐름에 개입하고 제어할 수 있습니다.

하나의 Workflow에는 최대 **3개의 훅**을 포함할 수 있으며, 이 중 `applyResult`는 유일하게 필수인 훅입니다.

> **입력 필터링에 관한 참고사항:** 기존 `filterInputs` 훅은 선언적 `validateSelection` 메커니즘으로 대체되었습니다. `workflow.json`에서 `validateSelection`을 사용하면 JavaScript를 작성하지 않고도 입력 제약을 정의할 수 있습니다. 자세한 내용은 [매니페스트 파일 작성](#doc/workflows%2Fcustom%2Fmanifest#selection-validation)을 참조하세요.

## 훅 스크립트 구조

각 훅 스크립트는 이름을 가진 함수를 내보내는 `.mjs`(ES Module) 파일입니다:

```js
// hooks/buildRequest.mjs
export function buildRequest({ selectionContext, manifest, executionOptions, runtime }) {
  // 구현 로직
  return requestSpec;
}
```

## 런타임 컨텍스트 (runtime)

모든 훅은 Zotero와 다양한 도구에 직접 접근할 수 있는 `runtime` 파라미터를 받습니다.

```js
runtime = {
  zotero,           // Zotero 전역 객체
  handlers,         // 저수준 데이터 처리 핸들러
  hostApi,          // 고수준 호스트 API (권장)
  helpers,          // 훅 보조 유틸리티 함수
  addon,            // 플러그인 설정

  workflowId,       // 현재 Workflow ID
  workflowRootDir,  // workflow.json이 포함된 디렉터리의 절대 경로
  workflowSourceKind, // "official" | "dev-local" | "user" | ""
  packageId,        // 소유 패키지 ID (Workflow 패키지 내에서만 사용 가능)
  packageRootDir,   // 패키지 루트 디렉터리의 절대 경로

  hostApiVersion,   // 호스트 API 버전 번호
  hookName,         // 현재 훅 이름: "buildRequest" | "applyResult" | ""
  debugMode,        // 디버그 모드 여부

  fetch,            // 전역 fetch (사용 가능한 경우)
  Buffer,           // Node.js Buffer (사용 가능한 경우)
  btoa,             // Base64 인코딩 (사용 가능한 경우)
  atob,             // Base64 디코딩 (사용 가능한 경우)
  TextEncoder,      // 텍스트 인코더 (사용 가능한 경우)
  TextDecoder,      // 텍스트 디코더 (사용 가능한 경우)
  FileReader,       // 파일 리더 (사용 가능한 경우)
  navigator,        // Navigator 객체 (사용 가능한 경우)
}
```

**모범 사례:** `runtime.hostApi`(고수준 API)를 우선 사용하고, `hostApi`가 요구를 충족하지 못하는 경우에만 `runtime.handlers` 또는 `runtime.zotero`를 사용하세요.

## 1. buildRequest — 요청 구축

`workflow.json`의 선언적 `request`만으로는 복잡한 요청을 기술하기에 부족할 때, `buildRequest`를 사용하여 요청 페이로드를 동적으로 구성합니다.

**시그니처:**

```ts
function buildRequest({
  selectionContext,  // 필터링된 선택 컨텍스트
  manifest,         // workflow.json
  executionOptions, // { workflowParams, providerOptions }
  runtime,          // 런타임 컨텍스트
}): unknown
```

**선언적 요청과의 관계:** `buildRequest`는 `workflow.json`의 `request` 필드와 상호 배타적입니다. 둘 다 존재하면 `buildRequest`가 우선합니다.

**예시: pass-through 요청**

```js
export function buildRequest({ selectionContext, executionOptions, runtime }) {
  return {
    kind: "pass-through.run.v1",
    selectionContext,
    parameter: executionOptions?.workflowParams || {},
  };
}
```

**예시: 다단계 시퀀스 요청**

```js
export async function buildRequest({ selectionContext, executionOptions, runtime }) {
  const sourcePath = resolveAttachmentPath(selectionContext, runtime);
  const language = executionOptions?.workflowParams?.language || "en-US";

  return {
    kind: "skillrunner.sequence.v1",
    sequence: {
      steps: [
        {
          id: "step1",
          skill_id: "my-analysis-skill",
          mode: "auto",
          workspace: "new",
          parameter: { language, source_path: sourcePath },
        },
        {
          id: "step2",
          skill_id: "my-enrichment-skill",
          mode: "auto",
          workspace: "reuse-workflow",
          handoff: {
            bindings: [
              {
                kind: "value",
                source: "output_field_name",
                target: "/input/field_name",
                step: "step1",
              },
            ],
          },
        },
      ],
    },
  };
}
```

## 2. normalizeSettings — 파라미터 정규화

설정이 저장되기 전 또는 실행되기 전에 파라미터를 정규화합니다.

**시그니처:** 이 훅은 단계에 따라 서로 다른 파라미터를 받습니다:

```ts
function normalizeSettings(args: {
  // persisted 단계: 파라미터가 환경설정에 저장될 때
  phase: "persisted";
  workflowId: string;
  manifest: WorkflowManifest;
  previous: { backendId?, workflowParams?, providerOptions? };
  incoming: { backendId?, workflowParams?, providerOptions? };
  merged: { backendId?, workflowParams?, providerOptions? };
} | {
  // execution 단계: 실행 전
  phase: "execution";
  workflowId: string;
  manifest: WorkflowManifest;
  rawWorkflowParams: Record<string, unknown>;
  normalizedWorkflowParams: Record<string, unknown>;
}): unknown
```

**사용 사례:**

- 파라미터 간 교차 검증 (예: 옵션 A가 특정 값으로 설정되면 옵션 B의 기본값이 변경되어야 하는 경우)
- 파라미터 다운그레이드 처리 (예: 이전 파라미터를 새 버전으로 마이그레이션)
- 실행 전 유효하지 않은 값 정리

## 3. applyResult — 결과 처리 (필수)

이것은 Workflow의 **유일하게 필수인 훅**으로, 백엔드의 실행 결과를 Zotero에 기록하는 역할을 합니다.

**시그니처:**

```ts
function applyResult({
  parent,           // 부모 Zotero 항목
  bundleReader,     // 결과 번들 리더
  resultContext,    // 구조화된 결과 컨텍스트
  sequenceStep,     // 시퀀스 단계 메타데이터 (시퀀스 실행 시 존재)
  productStorage,   // 아티팩트 저장 API
  request,          // 전송된 원본 요청
  runResult,        // 실행 결과 메타데이터
  manifest,         // workflow.json
  runtime,          // 런타임 컨텍스트
}): unknown

// sequenceStep 형태:
// {
//   id: string;           // 단계 ID
//   index: number;        // 시퀀스 내 0부터 시작하는 인덱스
//   workflowId: string;   // 이 단계의 하위 Workflow ID
//   skillId: string;      // 이 단계에서 실행된 Skill ID
//   finalStep: boolean;   // 마지막 단계인지 여부
//   phase: "sequence-step";
// }
```

**bundleReader 사용:**

```js
// 아티팩트 ZIP 번들의 파일 읽기
const digestMd = await bundleReader.readText("artifacts/digest.md");

// 추출된 아티팩트 디렉터리의 경로 가져오기
const extractedDir = await bundleReader.getExtractedDir();
```

**예시: 번들에서 노트 작성**

```js
export async function applyResult({ parent, bundleReader, runtime }) {
  if (!parent) return { applied: false };

  const parentItem = runtime.helpers.resolveItemRef(parent);
  const digestMd = await bundleReader.readText("artifacts/digest.md");

  const htmlContent = runtime.helpers.toHtmlNote("Paper Digest", digestMd);
  const newNote = await runtime.hostApi.mutations.execute({
    operation: "note.createChild",
    parentItem: parentItem.getField("id"),
    data: { content: htmlContent },
  });

  return { applied: true, noteId: newNote.id };
}
```

**예시: 번들에서 디스크로 파일 추출 (MinerU 스타일)**

```js
export async function applyResult({ parent, bundleReader, runtime }) {
  if (!parent) return { applied: false };

  const extractedDir = await bundleReader.getExtractedDir();
  const { file } = runtime.hostApi;

  const mdContent = await bundleReader.readText("full.md");
  const targetPath = `/path/to/output.md`;
  await file.writeText(targetPath, mdContent);

  return { applied: true, output_path: targetPath };
}
```

## 훅 헬퍼 함수 (helpers)

`runtime.helpers`는 보조 함수 모음을 제공합니다:

| 함수 | 설명 |
|------|------|
| `getAttachmentParentId(entry)` | 첨부파일의 부모 항목 ID 가져오기 |
| `getAttachmentFilePath(entry)` | 첨부파일의 로컬 파일 경로 가져오기 |
| `getAttachmentFileName(entry)` | 첨부파일 이름 가져오기 |
| `getAttachmentFileStem(entry)` | 첨부파일 이름 가져오기 (확장자 제외) |
| `getAttachmentDateAdded(entry)` | 첨부파일의 `dateAdded` 타임스탬프 가져오기 |
| `basenameOrFallback(path, fallback)` | 기본 이름 추출 또는 대체 문자열 반환 |
| `isMarkdownAttachment(entry)` | Markdown 첨부파일인지 확인 |
| `isPdfAttachment(entry)` | PDF 첨부파일인지 확인 |
| `pickEarliestPdfAttachment(entries)` | 첨부파일 목록에서 가장 오래된 PDF 선택 |
| `cloneSelectionContext(ctx)` | 선택 컨텍스트의 깊은 복사 |
| `withFilteredAttachments(ctx, items)` | 컨텍스트에서 지정된 첨부파일만 유지 |
| `resolveItemRef(ref)` | 항목 참조를 Zotero.Item으로 해석 |
| `toHtmlNote(title, body)` | Markdown을 HTML 노트 콘텐츠로 변환 |
| `normalizeReferenceAuthors(value)` | 참조 저자 목록 정규화 |
| `normalizeReferenceEntry(entry, index)` | 단일 참조 항목 정규화 |
| `normalizeReferencesArray(value)` | 참조 배열 정규화 |
| `normalizeReferencesPayload(payload)` | 참조 페이로드 객체 정규화 |
| `replacePayloadReferences(payload, refs)` | 페이로드의 참조 교체 |
| `resolveReferenceSource(entry)` | 참조의 source 필드 해석 |
| `renderReferenceLocator(entry)` | volume/issue/pages 로케이터 문자열 렌더링 |
| `renderReferencesTable(references)` | 참조를 HTML 테이블로 렌더링 |

## 다음 단계

- [선택 컨텍스트](#doc/workflows%2Fcustom%2Fselection-context) — selectionContext의 상세 구조
- [호스트 API 레퍼런스](#doc/workflows%2Fcustom%2Fhost-api) — 완전한 API 레퍼런스
- [패키징 및 배포](#doc/workflows%2Fcustom%2Fpackaging) — Workflow를 패키징하고 배포하는 방법
