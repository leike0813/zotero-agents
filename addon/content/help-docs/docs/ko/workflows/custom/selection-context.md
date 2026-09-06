# 선택 컨텍스트

워크플로 시작 시 정확한 선택 순서를 읽고 Broker의 모든 페이지를 완료한 뒤 입력을 고정합니다. 페이지 사이에 선택이 바뀌면 획득이 실패합니다. 설정 미리보기와 실행은 같은 입력을 사용하며 명시적 입력과 저장된 입력에는 완전한 `{libraryId, key}` 참조를 사용합니다.

## 구조

`items`는 `kind`, `ref`, `itemType`을 갖는 순서 있는 배열입니다. `title`과 `parentRef`는 선택 사항이며 첨부파일에는 `filename`, `contentType`, `createdAt`, `fileState`가 포함될 수 있습니다. 네이티브 객체, 숫자 항목 ID, 로컬 경로는 포함하지 않습니다. 빈 선택은 `items: []`입니다.

```ts
const selectionContext = {
  items: [
    {
      kind: "attachment",
      ref: { libraryId: 1, key: "ATTACH01" },
      itemType: "attachment",
      title: "Paper.pdf",
      parentRef: { libraryId: 1, key: "PARENT01" },
    },
  ],
  sampledAt: "2026-09-06T00:00:00.000Z",
};
```

## Hook에서 읽기

Hook은 준비된 입력 단위를 처리합니다. 고정된 참조로 `runtime.hostApi.library`에서 추가 정보를 읽습니다. `hasMore`가 true이면 `nextCursor`로 계속 읽고 현재 선택을 다시 획득하지 마세요.

```js
export async function buildRequest({ selectionContext, runtime }) {
  const refs = selectionContext.items.map((item) => item.ref);
  const details = [];
  for (const ref of refs) {
    details.push(await runtime.hostApi.library.getItemDetail(ref));
  }
  return {
    kind: "pass-through.run.v1",
    selectionContext,
    parameter: { titles: details.map((detail) => detail.item.title || "") },
  };
}
```

## 파일과 선택 정책

로컬 입력 준비는 `library.getItemDetail(ref)`를 확인하고 `file.state === "available"`일 때만 `file.path`를 사용합니다. 선택, 작업 및 저장 데이터에는 참조를 유지합니다. 파일을 사용할 수 없으면 준비가 실패합니다.

부모 항목 승격, 중복 제거, Markdown/PDF 우선순위는 `validateSelection`의 이름 있는 선택기가 담당합니다. MinerU는 직접 선택된 PDF만 처리하며 부모를 선택했을 때만 적합한 PDF를 모두 확장합니다. `inputs.member`와 `inputs.grouping`이 입력 단위를 정의합니다.

```json
{
  "inputs": {
    "member": { "kind": "attachment", "accepts": { "mime": ["application/pdf"] } },
    "grouping": { "mode": "each" }
  },
  "validateSelection": {
    "select": { "policy": "input-member", "source": "selected" },
    "filters": [{ "kind": "source-file-exists", "phase": "availability" }]
  }
}
```

빈 입력에는 `member.kind: "selection"`, `grouping.mode: "all"`, `selection` 선택기 및 `trigger.requiresSelection: false`를 사용하고 선택 조건에서도 빈 입력을 허용하세요.

- [Host API](#doc/workflows%2Fcustom%2Fhost-api)
- [Manifest](#doc/workflows%2Fcustom%2Fmanifest#selection-validation)
