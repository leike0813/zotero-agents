# 호스트 API 레퍼런스

`runtime.hostApi`는 Workflow 훅이 Zotero와 상호작용하기 위한 주요 인터페이스입니다. Zotero 라이브러리, 항목, 파일 시스템, 환경설정 등에 대한 완전한 운영 기능을 캡슐화합니다.

## 항목 연산 (hostApi.items)

```ts
hostApi.items = {
  get: (ref) => Zotero.Item | null,          // 참조로 항목 가져오기
  resolve: (ref) => Zotero.Item,             // get과 동일하지만, 항목이 없으면 예외 발생
  getByLibraryAndKey: (libraryID, key) => Zotero.Item | null,  // 라이브러리 ID + Key로 가져오기
  getAll: () => Promise<Zotero.Item[]>,      // 모든 항목 가져오기
}
```

`ref`는 `Zotero.Item` 객체, 숫자 ID 또는 문자열 Key일 수 있습니다.

**예시:**

```js
// ID로 항목 가져오기
const item = hostApi.items.get(12345);

// 라이브러리 Key로 항목 가져오기
const item = hostApi.items.getByLibraryAndKey(1, "ABCD1234");
```

## 컨텍스트 (hostApi.context)

```ts
hostApi.context = {
  getCurrentView: () => ZoteroHostCurrentViewDto,  // 현재 활성 뷰 정보
  getSelectedItems: () => ZoteroHostItemSummaryDto[],  // 현재 선택된 항목 목록
}
```

**예시:**

```js
const view = hostApi.context.getCurrentView();
// { libraryID: 1, selectedItems: [...], ... }

const selected = hostApi.context.getSelectedItems();
// [{ id, key, libraryID, title, ... }, ...]
```

## 라이브러리 연산 (hostApi.library)

```ts
hostApi.library = {
  listItems: (args) => Promise<LibraryListResponse>,       // 페이지네이션 항목 목록
  searchItems: (args) => Promise<ItemSummaryDto[]>,        // 항목 검색
  getItemDetail: (ref) => Promise<ItemDetailDto | null>,   // 항목 상세 정보 가져오기
  getItemNotes: (ref, args?) => Promise<NoteDto[]>,        // 항목의 노트 목록 가져오기
  getNoteDetail: (ref, args?) => Promise<NoteDetailChunkDto>, // 노트 본문 가져오기
  listNotePayloads: (ref) => Promise<NotePayloadDto[]>,    // 노트 임베디드 페이로드 목록
  getNotePayload: (ref, args?) => Promise<NotePayloadDto>, // 특정 페이로드 가져오기
  getItemAttachments: (ref) => Promise<AttachmentDto[]>,   // 항목의 첨부파일 목록 가져오기
}
```

**예시:**

```js
// 항목 검색
const results = await hostApi.library.searchItems({
  query: "transformer",
  limit: 10,
});

// 항목의 노트 가져오기
const notes = await hostApi.library.getItemNotes(ref);

// 항목의 첨부파일 가져오기
const attachments = await hostApi.library.getItemAttachments(ref);
```

## 변경 연산 (hostApi.mutations)

Zotero에서 데이터를 생성, 업데이트, 삭제하는 데 사용됩니다. 쓰기 작업은 사용자 승인이 필요합니다(Zotero UI에서 확인).

```ts
hostApi.mutations = {
  preview: (request) => Promise<MutationPreviewResponse>,   // 변경 효과 미리보기
  execute: (request) => Promise<MutationExecuteResponse>,   // 변경 실행
}
```

### 지원되는 변경 연산

| `operation` | 목적 | 설명 |
|-------------|------|------|
| `item.updateFields` | 항목 필드 업데이트 | 제목, 저자, 날짜 및 기타 필드 수정 |
| `item.addTags` | 태그 추가 | 항목에 하나 이상의 태그 추가 |
| `item.removeTags` | 태그 제거 | 항목에서 지정된 태그 제거 |
| `note.createChild` | 자식 노트 생성 | 부모 항목 아래에 새 노트 생성 |
| `note.update` | 노트 업데이트 | 기존 노트의 내용 수정 |
| `note.upsertPayload` | 임베디드 페이로드 업데이트 | 노트의 Workflow 페이로드 첨부파일 업데이트 |
| `literature.ingest` | 문헌 수집 | 논문을 Zotero로 가져오기 |
| `collection.addItems` | 컬렉션에 추가 | 컬렉션에 항목 추가 |
| `collection.removeItems` | 컬렉션에서 제거 | 컬렉션에서 항목 제거 |

**예시: 노트 생성**

```js
const result = await hostApi.mutations.execute({
  operation: "note.createChild",
  parentItem: parentItem.getField("id"),
  data: {
    content: htmlContent,
    tags: ["generated"],
  },
});
```

**예시: 태그 추가**

```js
await hostApi.mutations.execute({
  operation: "item.addTags",
  item: itemId,
  data: { tags: ["field:computer_science", "method:deep_learning"] },
});
```

## 노트 연산 (hostApi.notes)

```ts
hostApi.notes = {
  // ... 저수준 노트 핸들러의 모든 메서드
  importEmbeddedImage: (noteRef, image) => Promise<{
    attachmentKey: string;
    attachmentItem: Zotero.Item;
    mimeType: string;
    bytes: number;
  }>,
}
```

### 이미지 처리 (hostApi.images)

```ts
hostApi.images = {
  prepareForNoteEmbedding: (source, options?) => Promise<PreparedNoteImage>,
}
```

노트에 임베딩하기에 적합한 형식으로 이미지를 처리하는 데 사용됩니다:

```js
const prepared = await hostApi.images.prepareForNoteEmbedding(filePath, {
  maxLongEdge: 720,
  targetBytes: 180 * 1024,
});

const result = await hostApi.notes.importEmbeddedImage(noteRef, prepared);
```

## 첨부파일 연산 (hostApi.attachments)

```ts
hostApi.attachments = {
  // 저수준 첨부파일 핸들러의 모든 메서드
  // 포함: 첨부파일 목록, 첨부파일 경로 가져오기, 첨부파일 생성 등
}
```

## 태그 연산 (hostApi.tags)

```ts
hostApi.tags = {
  // 저수준 태그 핸들러의 모든 메서드
  // 포함: 태그 목록, 태그 가져오기, 태그 생성 등
}
```

## 컬렉션 연산 (hostApi.collections)

```ts
hostApi.collections = {
  // 저수준 컬렉션 핸들러의 모든 메서드
  // 포함: 컬렉션 목록, 하위 컬렉션 가져오기 등
}
```

## 파일 연산 (hostApi.file)

```ts
hostApi.file = {
  readText: (path) => Promise<string>,                    // 텍스트 파일 읽기
  writeText: (path, content) => Promise<void>,            // 텍스트 파일 쓰기
  readBytes: (path) => Promise<Uint8Array>,               // 이진 파일 읽기
  writeBytes: (path, bytes) => Promise<void>,             // 이진 파일 쓰기
  copy: (source, target) => Promise<void>,                // 파일 복사
  exists: (path) => Promise<boolean>,                     // 파일 존재 확인
  makeDirectory: (path) => Promise<void>,                 // 디렉터리 생성 (부모 디렉터리 포함)
  pathToFile: (path) => nsIFile,                          // 경로를 Zotero 파일 객체로 변환
  getTempDirectoryPath: () => string,                     // 임시 디렉터리 경로 가져오기
  pickDirectory: (args?) => Promise<string | null>,       // 디렉터리 선택기 열기
  pickFile: (args?) => Promise<string | null>,            // 파일 선택기 열기
  pickFiles: (args?) => Promise<string[] | null>,         // 다중 파일 선택기 열기
}
```

**예시:**

```js
// 파일 읽기
const content = await hostApi.file.readText("/path/to/file.md");

// 파일 쓰기
await hostApi.file.writeText("/path/to/output.md", newContent);

// 디렉터리 선택기를 열어 사용자가 내보내기 디렉터리를 선택하도록 함
const dir = await hostApi.file.pickDirectory({
  title: "내보내기 디렉터리 선택",
});
if (dir) {
  // 사용자가 디렉터리를 선택함
  await hostApi.file.writeText(`${dir}/result.md`, content);
}
```

## 환경설정 (hostApi.prefs)

```ts
hostApi.prefs = {
  get: (key, global?) => unknown,      // 환경설정 읽기
  set: (key, value, global?) => void,  // 환경설정 쓰기
  clear: (key, global?) => void,       // 환경설정 지우기
}
```

접두사는 플러그인이 자동으로 처리하므로 키 이름만 전달하면 됩니다.

**예시:**

```js
// 설정 읽기
const vocab = hostApi.prefs.get("tagVocabularyJson");

// 설정 쓰기
hostApi.prefs.set("mySetting", "myValue");
```

## UI 알림 (hostApi.notifications)

```ts
hostApi.notifications = {
  toast: ({ text, type? }) => void,
}
// type: "default" | "success" | "error"
```

**예시:**

```js
hostApi.notifications.toast({
  text: "처리 완료!",
  type: "success",
});
```

## 런타임 로깅 (hostApi.logging)

```ts
hostApi.logging = {
  appendRuntimeLog: (input) => void,
}
```

런타임 로거에 진단 정보를 추가하는 데 사용됩니다.

## 플러그인 설정 (hostApi.addon)

```ts
hostApi.addon = {
  getConfig: () => ({ addonName, addonRef, prefsPrefix }),
}
```

## API 버전 (hostApi.version)

```ts
hostApi.version: number
```

현재 호스트 API 버전 번호. 플러그인 버전 간 호환성이 필요한 훅을 작성할 때 파괴적 변경으로부터 보호하는 데 사용합니다.

## 부모 연산 (hostApi.parents)

```ts
hostApi.parents = {
  // 저수준 부모 항목 핸들러 연산
}
```

부모 항목 관리에 대한 저수준 접근을 제공합니다. 저수준 핸들러 인터페이스가 필요하지 않은 경우 `hostApi.library`와 `hostApi.mutations` 사용을 권장합니다.

## 명령 연산 (hostApi.command)

```ts
hostApi.command = {
  // 저수준 명령 핸들러 연산
}
```

명령 실행을 위한 저수준 인터페이스. 일반적으로 Workflow 훅에서 필요하지 않습니다.

## 에디터 연산 (hostApi.editor)

```ts
hostApi.editor = {
  openSession: (args) => ReturnType<typeof openWorkflowEditorSession>,
  registerRenderer: (rendererId, renderer) => void,
  unregisterRenderer: (rendererId) => void,
}
```

Workflow 에디터 세션을 관리합니다. `registerRenderer`와 `unregisterRenderer`는 Workflow별 출력 형식에 대한 사용자 정의 렌더러를 허용합니다.

## 종합 연산 (hostApi.synthesis)

```ts
hostApi.synthesis?: SynthesisService
```

Synthesis Workbench 서비스(주제, 개념, 태그, 인용 그래프 등)에 대한 접근을 제공합니다. Synthesis 시스템이 초기화된 경우에만 사용 가능합니다.

## 완전한 예시

```js
export async function applyResult({ parent, bundleReader, runtime }) {
  const { hostApi, helpers } = runtime;

  // 1. 부모 항목 해석
  const parentItem = helpers.resolveItemRef(parent);

  // 2. 번들에서 아티팩트 읽기
  const markdownContent = await bundleReader.readText("result/output.md");

  // 3. HTML 노트로 변환
  const htmlContent = helpers.toHtmlNote("처리 결과", markdownContent);

  // 4. 노트 생성
  const noteResult = await hostApi.mutations.execute({
    operation: "note.createChild",
    parentItem: parentItem.getField("id"),
    data: { content: htmlContent },
  });

  // 5. 태그 추가
  await hostApi.mutations.execute({
    operation: "item.addTags",
    item: parentItem.getField("id"),
    data: { tags: ["processed"] },
  });

  // 6. 사용자에게 알림
  hostApi.notifications.toast({
    text: `처리 완료: ${parentItem.getField("title")}`,
    type: "success",
  });

  return { applied: true, noteId: noteResult.id };
}
```

## 다음 단계

- [패키징 및 배포](#doc/workflows%2Fcustom%2Fpackaging) — 사용자 정의 Workflow 배포
- [디버깅 및 테스트](#doc/workflows%2Fcustom%2Fdebugging) — Workflow 정확성 검증
