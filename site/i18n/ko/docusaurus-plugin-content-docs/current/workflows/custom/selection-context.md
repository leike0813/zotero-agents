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
export function buildRequest({ selectionContext, runtime }) {
  const attachments = selectionContext.items.attachments;

  return {
    kind: "skillrunner.job.v1",
    create: { skill_id: "my-skill" },
    input: {
      files: attachments.map((attachment) => ({
        path: runtime.helpers.getAttachmentFilePath(attachment),
        name: runtime.helpers.getAttachmentFileName(attachment),
      })),
    },
  };
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
export function preflight({ selectionContext }) {
  const { selectionType } = selectionContext;

  if (selectionType === "none") {
    // 선택된 항목 없음, 건너뛰기
    return { kind: "skip", reason: "no selected items" };
  }

  if (selectionType === "attachment") {
    // 사용자가 첨부파일만 선택, 첨부파일 처리 로직 사용
  } else if (selectionType === "parent") {
    // 사용자가 부모 항목만 선택, 첫 번째 적절한 첨부파일 확장
  }

  return { kind: "continue", context: { selectionType } };
}
```

### Attachment Candidate Planning

```json
{
  "inputs": {
    "member": {
      "kind": "attachment",
      "accepts": { "mime": ["application/pdf"] }
    },
    "grouping": { "mode": "each" }
  },
  "validateSelection": {
    "require": {
      "selection": {
        "counts": { "attachments": { "min": 1 } },
        "allowMixed": false
      }
    },
    "select": { "policy": "input-member", "source": "selected" },
    "filters": [
      { "kind": "source-file-exists", "phase": "availability" }
    ]
  }
}
```

`require.selection` reads the original SelectionContext once. The selector
produces ordered candidates, attachment MIME compatibility runs before filters,
and `inputs.grouping` creates immutable top-level units.

### Workflows Without Selected Items

Use `member.kind: "selection"`, `grouping.mode: "all"`, the `selection`
selector, and `trigger.requiresSelection: false`. The selector then produces
the complete empty SelectionContext as the single member. Selection
requirements remain active and must not make the empty selection impossible.

## Declarative Candidate Filters

```json
{
  "validateSelection": {
    "select": { "policy": "generated-note-candidates" },
    "filters": [
      {
        "kind": "generated-note-kinds-absent",
        "phase": "availability",
        "noteKinds": ["digest"]
      }
    ]
  }
}
```

`validateSelection` owns candidate production and filtering. `inputs` owns
the execution member and grouping. Hooks consume the prepared unit and must not
reconstruct selection planning.
## 다음 단계

- [호스트 API 레퍼런스](host-api) — 훅에서 Zotero 데이터를 조작하기 위한 완전한 API
- [매니페스트 작성하기](manifest) — Workflow의 입력 유닛 타입 정의
