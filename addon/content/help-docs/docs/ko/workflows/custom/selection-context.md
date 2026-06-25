# 선택 컨텍스트

사용자가 Zotero에서 항목을 선택하면, 플러그인은 사용자가 선택한 것과 각 선택 항목이 어떤 타입에 속하는지 설명하는 구조화된 **선택 컨텍스트(SelectionContext)** 를 구축합니다. 이 컨텍스트는 `buildRequest` 훅의 입력 기반 역할을 합니다.

## 선택 타입

선택된 항목 타입의 조합에 따라, `selectionContext.selectionType`은 다음 값 중 하나를 반환합니다:

| 타입 | 설명 |
|------|------|
| `"parent"` | 선택된 모든 항목이 부모 항목(최상위 항목) |
| `"child"` | 선택된 모든 항목이 자식 항목(최상위가 아닌 항목) |
| `"attachment"` | 선택된 모든 항목이 첨부파일 |
| `"note"` | 선택된 모든 항목이 노트 |
| `"mixed"` | 선택된 항목이 여러 타입의 혼합 |
| `"none"` | 선택된 항목 없음 |

## 컨텍스트 구조

```ts
selectionContext = {
  selectionType: "parent",       // 선택 타입
  items: {
    parents: [ /* 부모 항목 목록 */ ],
    children: [ /* 자식 항목 목록 */ ],
    attachments: [ /* 첨부파일 목록 */ ],
    notes: [ /* 노트 목록 */ ],
  },
  summary: {
    parentCount: 2,
    childCount: 0,
    attachmentCount: 0,
    noteCount: 0,
  },
  warnings: [],                  // 경고 메시지
  sampledAt: "2026-01-15T...",   // 컨텍스트 생성 시각
}
```

각 타입의 항목은 풍부한 컨텍스트 정보를 포함합니다.

### 부모 항목 (ParentContext)

부모 항목은 Zotero 라이브러리의 최상위 항목입니다(예: 저널 기사, 책, 웹 페이지 등). 각 부모 항목 컨텍스트는 다음을 포함합니다:

```ts
{
  item: Zotero.Item,         // 항목 객체
  id: number,                // 항목 ID
  title: string,             // 제목
  attachments: [             // 이 항목의 자식 첨부파일
    { type, filePath, mimeType, dateAdded, ... }
  ],
  notes: [                   // 이 항목의 자식 노트
    { id, content, ... }
  ],
  tags: string[],            // 태그 목록
  collections: string[],     // 포함된 컬렉션
  children: [                // 기타 자식 항목
    { id, type, ... }
  ],
}
```

### 첨부파일 (AttachmentContext)

첨부파일은 항목의 파일 첨부입니다(PDF, Markdown 등). 각 첨부파일 컨텍스트는 다음을 포함합니다:

```ts
{
  item: Zotero.Item,         // 첨부파일 항목 객체
  id: number,                // 항목 ID
  filePath: string,          // 로컬 파일 경로
  fileName: string,          // 파일명
  mimeType: string,          // MIME 타입 (예: "application/pdf")
  dateAdded: Date,           // 추가된 날짜
  parentItem: {              // 소유 부모 항목
    id: number,
    key: string,
    libraryID: number,
  },
  tags: string[],
  collections: string[],
}
```

### 노트 (NoteContext)

```ts
{
  item: Zotero.Item,
  id: number,
  content: string,           // 노트 내용 (HTML)
  parentItem: { id, key, libraryID },
  tags: string[],
}
```

## 훅에서 선택 컨텍스트 사용

### 선택된 첨부파일 가져오기

```js
export function filterInputs({ selectionContext, runtime }) {
  const attachments = selectionContext.items.attachments;

  for (const attachment of attachments) {
    const filePath = runtime.helpers.getAttachmentFilePath(attachment);
    const fileName = runtime.helpers.getAttachmentFileName(attachment);
    // 첨부파일 처리
  }

  return selectionContext;
}
```

### 선택된 부모 항목과 자식 콘텐츠 가져오기

```js
export function buildRequest({ selectionContext, runtime }) {
  const parents = selectionContext.items.parents;

  for (const parent of parents) {
    const title = parent.item.getField("title");
    const attachments = parent.attachments;  // 이 부모 항목의 첨부파일
    const notes = parent.notes;              // 이 부모 항목의 노트
  }

  // ...
}
```

### 선택 타입 확인하여 동작 결정

```js
export function filterInputs({ selectionContext, runtime }) {
  const { selectionType } = selectionContext;

  if (selectionType === "none") {
    // 선택된 항목 없음, 건너뛰기
    return null;
  }

  if (selectionType === "attachment") {
    // 사용자가 첨부파일만 선택, 첨부파일 처리 로직 사용
  } else if (selectionType === "parent") {
    // 사용자가 부모 항목만 선택, 첫 번째 적절한 첨부파일 확장
  }

  return selectionContext;
}
```

### 첨부파일 필터링

`helpers.withFilteredAttachments`를 사용하여 처리 후 선택 컨텍스트를 업데이트합니다:

```js
export function filterInputs({ selectionContext, runtime }) {
  const { helpers } = runtime;

  // PDF 첨부파일만 유지
  const pdfs = selectionContext.items.attachments.filter(
    a => helpers.isPdfAttachment(a)
  );

  // 모든 항목 중 PDF 첨부파일이 있는 부모 항목만 유지
  const matched = selectionContext.items.parents.filter(parent => {
    return parent.attachments.some(
      a => helpers.isPdfAttachment(a)
    );
  });

  // 일치하는 항목이 없으면 실행 건너뛰기
  if (matched.length === 0) return null;

  // 필터링된 결과로 컨텍스트 업데이트
  return helpers.withFilteredAttachments(selectionContext, matched);
}
```

### 항목이 선택되지 않았을 때의 Workflow

`inputs.unit: "workflow"`이고 `trigger.requiresSelection: false`일 때, 항목이 선택되지 않아도 Workflow를 트리거할 수 있습니다. 이 경우 `selectionContext.selectionType`은 `"none"`이고, `items`의 모든 배열이 비어 있습니다. 이 모드는 전역 작업(예: "주제 종합 생성")을 만드는 데 적합합니다.

## 선언적 선택 검증

Workflow에서 **이미 결과가 있는 항목을 건너뛰기** 또는 **특정 타입의 입력 필터링**만 필요하면, `filterInputs` 훅을 작성하지 않고도 선언적 `validateSelection` 필드를 사용할 수 있습니다.

```json
{
  "validateSelection": {
    "select": { "policy": "literature-source" },
    "exclude": [
      { "kind": "generated-notes-all", "noteKinds": ["digest"] }
    ]
  }
}
```

전체 문서는 [매니페스트 작성하기](#doc/workflows%2Fcustom%2Fmanifest#selection-validation)를 참조하세요.

> **선택 가이드:** 가능할 때마다 선언적 `validateSelection`을 사용하세요 — JavaScript가 필요 없고 유지보수도 필요 없습니다. 복잡한 선택 로직은 `buildRequest` 훅에서 구현할 수 있습니다.

## 다음 단계

- [호스트 API 레퍼런스](#doc/workflows%2Fcustom%2Fhost-api) — 훅에서 Zotero 데이터를 조작하기 위한 완전한 API
- [매니페스트 작성하기](#doc/workflows%2Fcustom%2Fmanifest) — Workflow의 입력 유닛 타입 정의
