# ローカライズ

Workflow システムは多言語ローカライズに対応しており、同じ Workflow を異なる言語の Zotero インターフェースで適切な名前や説明で表示できる。

## ローカライズの優先順位

Workflow のローカライズは以下の優先順位でフォールバックする。

```
Inline messages (manifest.i18n.messages)  ← Highest priority
        ↓
Package-level locale files (workflow-package's locales/)
        ↓
Raw manifest fields (label / description etc. English defaults)
        ↓
Key fallback (e.g., "workflows.my-id.label")
```

## インラインローカライズ（単一の Workflow）

`workflow.json` に直接定義する。

```json
{
  "id": "my-workflow",
  "label": "My Workflow",
  "i18n": {
    "defaultLocale": "en-US",
    "messages": {
      "zh-CN": {
        "label": "我的 Workflow",
        "taskNameTemplate": "处理中: {query}",
        "parameters.language.title": "语言",
        "parameters.language.description": "选择输出内容的语言"
      },
      "ja-JP": {
        "label": "マイワークフロー",
        "taskNameTemplate": "処理中: {query}"
      }
    }
  }
}
```

マニフェストの `label` や `taskNameTemplate` などの生フィールドはデフォルト値（通常は英語）として機能し、`i18n.messages` の翻訳が対応する言語の表示テキストを上書きする。

### キーの命名規則

```
label                                    — Workflow name
taskNameTemplate                         — Task name template
parameters.<paramKey>.title              — Parameter title
parameters.<paramKey>.description         — Parameter description
skills.<skillId>.name                    — 現在の workflow での skill 表示名
```

`skills.<skillId>.name` は UI 上の表示名にのみ影響する。Skill パッケージの `runner.json.name` は skill のデフォルト名のままであり、workflow に対応する翻訳が宣言されていない場合、インターフェースは `runner.json.name` をフォールバックとして表示する。

## パッケージレベルのローカライズ（マルチ Workflow パッケージ）

`workflow-package.json` でロケールファイルを宣言する。

```json
{
  "id": "my-package",
  "i18n": {
    "defaultLocale": "en-US",
    "locales": {
      "zh-CN": "locales/zh-CN.json",
      "ja-JP": "locales/ja-JP.json"
    }
  }
}
```

`locales/zh-CN.json` の内容例:

```json
{
  "workflows.my-workflow.label": "我的工作流",
  "workflows.my-workflow.taskNameTemplate": "处理中: {query}",
  "workflows.my-workflow.skills.my-skill.name": "我的技能",
  "workflows.my-workflow.parameters.language.title": "语言",
  "workflows.another-workflow.label": "另一个工作流"
}
```

パッケージレベルのロケールファイルのキーは完全修飾形式を使用する: `workflows.<workflowId>.<field>`。

### 併用

パッケージレベルと Workflow インラインのメッセージは併用可能であり、インラインメッセージの方が優先される。ベストプラクティス:

- デフォルト言語（例: 英語）は workflow.json のフィールドに保持する
- 翻訳はパッケージレベルのロケールファイルにまとめて管理する
- 特定の Workflow に固有の翻訳は、その Workflow のインラインメッセージに配置することもできる

## 言語マッチングのロジック

システムは以下の順序でユーザーの言語設定にマッチングを試みる。

1. **完全一致**: ユーザーのロケールが `"zh-CN"` の場合、`"zh-CN"` のメッセージを検索する
2. **言語サブタグ一致**: ユーザーのロケールが `"zh-Hans-CN"` の場合、完全一致が見つからなければ `"zh"` でのマッチングを試みる
3. **defaultLocale へのフォールバック**: `i18n.defaultLocale` で指定された言語を使用する
4. **生フィールド値へのフォールバック**: `workflow.json` の生フィールド値（例: `label`）を使用する
5. **キーへのフォールバック**: キー名自体を表示する

## パラメータ値の列挙子のローカライズ

パラメータが列挙値を持つ場合、列挙値の表示テキストは現在のところパラメータの `title` と `description` フィールドが使用される。列挙値自体のローカライズが必要な複雑なシナリオでは、Workflow の `label` または説明文で対応することを推奨する。

## Workflow に新しい言語を追加する

1. パッケージの `locales/` ディレクトリに新しい `<locale>.json` ファイルを作成する
2. 既存のロケールファイル（例: `zh-CN.json`）を参照してすべてのキーを翻訳する
3. `workflow-package.json` の `i18n.locales` に新しい言語エントリを追加する
4. プラグインをリロードして反映する

## リファレンス

- 公式ロケールファイル例: `content/official/workflows/literature-workbench-package/locales/zh-CN.json`
- パッケージレベル i18n 宣言例: `content/official/workflows/literature-workbench-package/workflow-package.json`

## 次のステップ

- [リクエスト種別](#doc/workflows%2Fcustom%2Frequest-kinds) — 実行バックエンドとリクエストタイプを選択する
- [パッケージングとデプロイ](#doc/workflows%2Fcustom%2Fpackaging) — ローカライズ付き Workflow パッケージを公開する
