# 選択コンテキスト

ワークフローの起動時に選択を元の順序で取得し、Broker の全ページを読み終えてから固定します。ページ間で選択が変わった場合は取得に失敗します。設定プレビューと実行は同じ入力を使い、明示的入力と永続化された入力には完全な `{libraryId, key}` 参照を使います。

## 構造

`items` は `kind`、`ref`、`itemType` を持つ順序付き配列です。`title`、`parentRef` は任意です。添付ファイルには `filename`、`contentType`、`createdAt`、`fileState` が含まれる場合があります。ネイティブオブジェクト、数値アイテム ID、ローカルパスは含みません。空の選択は `items: []` です。

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

## Hook での読み取り

Hook は準備済みの入力単位を処理します。固定された参照を使い、`runtime.hostApi.library` から追加情報を読み取ります。`hasMore` が true の間は `nextCursor` を使って続け、現在の選択を再取得しないでください。

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

## ファイルと選択規則

ローカル入力の準備では `library.getItemDetail(ref)` を解決し、`file.state === "available"` の場合だけ `file.path` を使います。選択、タスク、永続化データには参照を保持します。ファイルを利用できない場合は準備に失敗します。

親への昇格、重複排除、Markdown/PDF の優先順位は `validateSelection` の名前付きセレクターが担当します。MinerU は直接選択した PDF のみを処理し、親を選択した場合に限り適切な PDF をすべて展開します。入力単位は `inputs.member` と `inputs.grouping` で定義します。

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

空の入力には `member.kind: "selection"`、`grouping.mode: "all"`、`selection` セレクター、`trigger.requiresSelection: false` を使い、選択条件でも空の入力を許可してください。

- [Host API](#doc/workflows%2Fcustom%2Fhost-api)
- [Manifest](#doc/workflows%2Fcustom%2Fmanifest#selection-validation)
