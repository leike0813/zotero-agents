# パラメータシステム

Workflow は設定可能なパラメータを定義でき、実行前にユーザーが入力するための設定ダイアログが表示される。パラメータシステムは複数の型と動的データソースをサポートする。

## パラメータの定義

パラメータは `workflow.json` の `parameters` フィールドで定義される。

```json
{
  "parameters": {
    "language": {
      "type": "string",
      "title": "Output Language",
      "description": "Select the language for output content",
      "default": "en-US",
      "enum": ["en-US", "zh-CN", "ja-JP"],
      "allowCustom": true
    },
    "maxResults": {
      "type": "number",
      "title": "Maximum Results",
      "description": "Upper limit on the number of results returned",
      "default": 10,
      "min": 1,
      "max": 100
    },
    "enableFilter": {
      "type": "boolean",
      "title": "Enable Filtering",
      "description": "Whether to enable result filtering",
      "default": true,
      "visible_if": { "parameter": "language", "equals": false }
    }
  }
}
```

## パラメータの型

| 型 | 説明 | 適用されるコントロール |
|-----|------|---------------------|
| `string` | テキスト文字列 | テキストボックス / ドロップダウン / 動的セレクタ |
| `number` | 数値 | 数値入力（min/max 制約をサポート） |
| `boolean` | ブール値 | トグル / チェックボックス |

## Enum 値とカスタム値

```json
{
  "language": {
    "type": "string",
    "enum": ["en-US", "zh-CN", "ja-JP"],
    "allowCustom": true,
    "default": "en-US"
  }
}
```

- `enum`：提案されるプリセット値リスト。ドロップダウンメニューで選択可能なオプションとして表示される
- `allowCustom`（string 型のみ）：`true` に設定すると、`enum` の値は推奨のみとなり、ユーザーは自由に他の値を入力できる。`false` に設定するか省略すると、ユーザーは `enum` からのみ選択可能

## 条件付き表示

```json
{
  "advancedMode": {
    "type": "boolean",
    "title": "Advanced Mode",
    "default": false
  },
  "customEndpoint": {
    "type": "string",
    "title": "Custom Endpoint",
    "visible_if": { "parameter": "advancedMode", "equals": true }
  }
}
```

`visible_if` は設定ダイアログでのパラメータの表示/非表示を制御する。

- `equals: true` — 対象パラメータの値が truthy の場合のみ表示
- `equals: false` — 対象パラメータの値が falsy の場合のみ表示

**例：連動する表示/非表示**

```json
{
  "auto_tag_regulator": {
    "type": "boolean",
    "title": "Auto Tag Regulator",
    "default": true
  },
  "auto_tag_infer_tag": {
    "type": "boolean",
    "title": "Infer tags",
    "default": true,
    "visible_if": { "parameter": "auto_tag_regulator", "equals": true }
  }
}
```

`auto_tag_regulator` のチェックを外すと、`auto_tag_infer_tag` パラメータは自動的に非表示になる。

## 動的オプションソース

パラメータ値のオプションは Zotero のライブデータから取得できる。

```json
{
  "targetCollection": {
    "type": "string",
    "title": "Target Collection",
    "default": "",
    "optionsSource": {
      "kind": "zotero.collections",
      "library": "current",
      "includeEmpty": true,
      "valueFormat": "collectionRef",
      "labelFormat": "path"
    }
  },
  "relatedTopic": {
    "type": "string",
    "title": "Related Topic",
    "optionsSource": {
      "kind": "synthesis.topics",
      "filter": "updatable"
    }
  }
}
```

### サポートされるオプションソース

| `kind` | 説明 | 利用可能なパラメータ |
|--------|------|-------------------|
| `zotero.collections` | 現在の Zotero ライブラリのコレクションリスト | `library`（current/user/number）、`includeEmpty`、`valueFormat`（collectionRef）、`labelFormat`（path/title） |
| `synthesis.topics` | Synthesis Workbench のトピックリスト | `filter`（all/updatable）、`valueFormat`（topicId）、`labelFormat`（title） |

### 共通の optionsSource パラメータ

| パラメータ | 説明 |
|-----------|------|
| `library` | ライブラリのスコープ。`"current"`（現在のライブラリ）、`"user"`（ユーザーライブラリ）、数値（特定のライブラリ ID） |
| `includeEmpty` | 空のオプション（「選択なし」用）を含めるかどうか |
| `valueFormat` | オプション値のフォーマット。`"collectionRef"` / `"topicId"` |
| `labelFormat` | オプションラベルの表示フォーマット。`"path"` / `"title"` |
| `allowStale` | キャッシュされたデータの使用を許可する（設定を開くたびに再リクエストするのを避ける） |
| `filter` | フィルタ条件（kind により異なる） |

## 数値パラメータの制約

```json
{
  "confidence": {
    "type": "number",
    "title": "Confidence Threshold",
    "default": 0.8,
    "min": 0,
    "max": 1
  }
}
```

`min` と `max` は入力値の範囲を制約する。

## フックでのパラメータの読み取り

`buildRequest`、`filterInputs`、`applyResult` では、`executionOptions.workflowParams` を通じてユーザーが設定したパラメータ値を読み取れる。

```js
export function buildRequest({ executionOptions, runtime }) {
  const params = executionOptions?.workflowParams || {};
  const language = params.language || "en-US";
  const maxResults = params.maxResults || 10;

  return {
    kind: "skillrunner.job.v1",
    create: { skill_id: "my-skill" },
    parameter: { language, max_results: maxResults },
  };
}
```

## パラメータの多言語化

パラメータの `title` と `description` は多言語化をサポートする。

```json
{
  "i18n": {
    "messages": {
      "zh-CN": {
        "parameters.language.title": "Language",
        "parameters.language.description": "Select the language for output content"
      }
    }
  }
}
```

多言語化の完全な仕組みについては[多言語化](localization)のページを参照。

## 次のステップ

- [選択コンテキスト](selection-context) — ユーザーのアイテム選択が Workflow にどのように渡されるかを理解する
- [リクエスト種別](request-kinds) — 異なるリクエスト種別でのパラメータの受け渡し方法
