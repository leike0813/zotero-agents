# Workflow マニフェストの作成

`workflow.json` は Workflow のマニフェストファイルであり、すべてのメタデータと動作を定義する。Workflow Manager はこのファイルを通じて Workflow を検出し、読み込む。

## 基本構造

```json
{
  "id": "my-workflow",
  "label": "My Workflow",
  "version": "1.0.0",
  "provider": "pass-through",
  "display": {
    "core": false,
    "emoji": "🔧"
  },
  "inputs": { "unit": "parent" },
  "parameters": {},
  "execution": {},
  "request": { "kind": "pass-through.run.v1" },
  "hooks": {
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

## フィールドリファレンス

### 基本識別

| フィールド | 必須 | 型 | 説明 |
|-----------|------|-----|------|
| `id` | ✅ | string | 一意の識別子。重複してはならない。kebab-case を推奨 |
| `label` | ✅ | string | ユーザーに表示される名前 |
| `version` | | string | セマンティックバージョン番号。例：`"1.0.0"` |
| `provider` | ✅ | string | バックエンド種別。利用可能な値は以下を参照 |

### Provider の値

| 値 | 説明 |
|-----|------|
| `"pass-through"` | 純粋なローカル実行。バックエンド不要。ファイル操作、エクスポートなどに適する |
| `"skillrunner"` | Skill-Runner バックエンド経由で Skill を実行 |
| `"acp"` | ACP バックエンド経由で Skill を実行 |
| `"generic-http"` | Generic HTTP バックエンド経由で API を呼び出し |

`provider` は Workflow が対応するバックエンド種別を決定し、Dashboard で実行可能として表示されるバックエンドも決定する。

### 表示制御

```json
{
  "display": {
    "core": true,
    "emoji": "📊"
  },
  "taskNameTemplate": "Processing: {query}",
  "debug_only": false
}
```

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `display.core` | boolean | コア Workflow としてマークするかどうか（Dashboard で優先表示、コアバッジ付き） |
| `display.emoji` | string | 表示名のプレフィックスアイコン。例：`"📖"` |
| `taskNameTemplate` | string | `{パラメータ名}` プレースホルダーを使用するタスク名テンプレート。実行時に実際の値に置換される |
| `debug_only` | boolean | `true` の場合、デバッグモードでのみ表示 |

### 入力の定義

```json
{
  "inputs": {
    "unit": "attachment",
    "accepts": {
      "mime": ["text/markdown", "text/x-markdown", "application/pdf"]
    },
    "per_parent": {
      "min": 1,
      "max": 1
    }
  }
}
```

| フィールド | 説明 |
|-----------|------|
| `unit` | **入力ユニット種別**。`"attachment"`（添付ファイル）、`"parent"`（親アイテム）、`"note"`（ノート）、`"workflow"`（アイテム選択不要、Dashboard から直接トリガー） |
| `accepts.mime` | 受け付ける MIME タイプ（`unit: "attachment"` の場合のみ適用）。未指定の場合はすべての種別を受け付ける |
| `per_parent.min` | 親アイテムあたりの最小添付ファイル数 |
| `per_parent.max` | 親アイテムあたりの最大添付ファイル数 |

`unit: "workflow"` の場合、トリガーにユーザーのアイテム選択を必要としない（例：「トピック合成の作成」）。

### validateSelection — 選択の検証 {#selection-validation}

`validateSelection` は宣言的な選択検証である。「すでに結果を持つアイテムをスキップする」や「特定の種の選択のみを受け付ける」といった一般的なシナリオを、JavaScript を書かずにカバーする。

```json
{
  "validateSelection": {
    "select": {
      "policy": "literature-source"
    },
    "require": {
      "counts": {
        "parents": 1
      },
      "allowMixed": false
    },
    "exclude": [
      {
        "kind": "generated-notes-all",
        "noteKinds": ["digest", "references", "citation-analysis"]
      }
    ]
  }
}
```

### `select` — 選択ポリシー

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `select.policy` | string | 選択ポリシー。サポートされる値は以下 |
| `select.unit` | string | 選択検証のための入力ユニットを上書きする。`"attachment"` / `"parent"` / `"note"` / `"workflow"` |

**サポートされる `select.policy` の値：**

| ポリシー | 説明 |
|----------|------|
| `input-unit` | 入力ユニットに一致するアイテムを受け付ける |
| `literature-source` | 文献ソースを受け付ける（展開可能な添付ファイルを持つ添付ファイルまたは親アイテム） |
| `pdf-attachment` | PDF 添付ファイルのみを受け付ける |
| `selected-parent` | 選択から親アイテムを受け付ける |
| `generated-note-candidates` | 生成ノートの候補アイテムを受け付ける |
| `digest-representative-image` | 代表画像抽出の対象アイテム |

### `require` — 選択の要件

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `require.counts.parents` | number | 必要な最小親アイテム数 |
| `require.counts.attachments` | number | 必要な最小添付ファイル数 |
| `require.counts.notes` | number | 必要な最小ノート数 |
| `require.counts.children` | number | 必要な最小子アイテム数 |
| `require.counts.total` | number | 必要な最小合計アイテム数 |
| `require.allowMixed` | boolean | 選択内で異なるアイテム種別を混在させることを許可するかどうか |

### `exclude` — 除外ルール

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `exclude[]` | array | 除外ルールのリスト。いずれかのルールに一致した場合、現在のアイテムはスキップされる |

**サポートされる `exclude.kind` の値：**

| kind | 説明 | 追加パラメータ |
|------|------|---------------|
| `generated-notes-all` | アイテムがすでに指定種の生成ノートを持っている | `noteKinds`：ノート種のリスト。例：`["digest", "references", "citation-analysis"]` |
| `artifact-exists` | アイテムがすでに指定のアーティファクトを持っている（冗長な実行を避けるため） | `target`：`"deep-reading-html"` / `"translator-markdown"` / `"mineru-markdown"`。`parameter`：アーティファクト照合のためのオプションの言語パラメータ |

### `derive` — 派生選択

| フィールド | 型 | 説明 |
|-----------|-----|------|
| `derive[]` | array | 派生選択操作。`"exportCandidates"`：ノートエクスポートの候補を派生する。`"digestRepresentativeImageTarget"`：ダイジェストノートから代表画像対象を派生する |

**例：**

```json
{
  "validateSelection": {
    "select": { "policy": "literature-source" },
    "exclude": [
      { "kind": "artifact-exists", "target": "deep-reading-html" }
    ]
  }
}
```

> この例では、すでに deep reading HTML アーティファクトを持つアイテムは自動的にスキップされ、ユーザーによる手動フィルタリングは不要である。

### トリガー制御

```json
{
  "trigger": {
    "requiresSelection": false
  }
}
```

| フィールド | 説明 |
|-----------|------|
| `requiresSelection` | トリガーにユーザーのアイテム選択が必要かどうか。デフォルトは `true`。`false` に設定すると、Dashboard からアイテムを選択せずに Workflow を実行できる。通常 `inputs.unit: "workflow"` の場合に `false` を設定する |

### 実行制御

```json
{
  "execution": {
    "timeout_ms": 600000,
    "poll_interval_ms": 2000,
    "mcp": {
      "requiredTools": ["search_items", "get_item_detail"]
    },
    "zoteroHostAccess": {
      "required": false,
      "allowWriteApprovalBypass": false
    },
    "feedback": {
      "showNotifications": true
    }
  }
}
```

| フィールド | 説明 |
|-----------|------|
| `timeout_ms` | ミリ秒単位のタイムアウト（Generic HTTP バックエンドにのみ有効） |
| `poll_interval_ms` | ミリ秒単位のポーリング間隔。進行状況チェックの頻度を制御する |
| `mcp.requiredTools` | この Workflow に必要な MCP ツール（ツール名文字列の配列） |
| `zoteroHostAccess.required` | Zotero ホストアクセスが必要かどうか（ライブラリデータの読み書きのため） |
| `zoteroHostAccess.allowWriteApprovalBypass` | 書き込み操作の承認バイパスを許可するかどうか |
| `feedback.showNotifications` | 実行通知を表示するかどうか。デフォルトは `true`。`false` に設定するとサイレントに実行する |

> **実行モード**（`auto` / `interactive`）は `request.create.mode` に移動された — [リクエスト種別](request-kinds)を参照。

### 結果の取得

```json
{
  "result": {
    "fetch": { "type": "bundle" },
    "final_step_id": "finalize",
    "expects": {
      "result_json": "result/result.json",
      "artifacts": [
        "result/artifact1",
        "result/artifact2"
      ]
    }
  }
}
```

| フィールド | 説明 |
|-----------|------|
| `fetch.type` | 取得方法。`"bundle"`（zip バンドルをダウンロード）、`"result"`（結果 JSON のみ取得） |
| `final_step_id` | シーケンス Workflow の場合、最終ステップの ID を指定し、最終結果の判定に使用される |
| `expects.result_json` | 期待される結果 JSON ファイルパス（ランタイムワークスペースからの相対パス） |
| `expects.artifacts` | 期待されるアーティファクトファイルパスのリスト |

### リクエスト定義

宣言的なリクエスト定義。`hooks.buildRequest` とは**相互排他**である（両方存在する場合、`hooks.buildRequest` が優先される）。

```json
{
  "request": {
    "kind": "skillrunner.job.v1",
    "create": {
      "skill_id": "my-skill",
      "skill_source": "local-package"
    },
    "input": {
      "upload": {
        "files": [
          { "key": "source", "from": "selected.markdown" }
        ]
      }
    },
    "poll": {
      "interval_ms": 2000,
      "timeout_ms": 600000
    }
  }
}
```

各 `kind` の詳細については[リクエスト種別](request-kinds)を参照。

### Hook の宣言

```json
{
  "hooks": {
    "buildRequest": "hooks/buildRequest.mjs",
    "normalizeSettings": "hooks/normalizeSettings.mjs",
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `applyResult` | ✅ | **必須**。実行後の結果処理用スクリプトパス |
| `buildRequest` | | オプション。バックエンドに送信するリクエストを構築する。`request` フィールドと相互排他 |
| `normalizeSettings` | | オプション。ユーザーが設定したパラメータを正規化する |

> **入力のフィルタリング**は宣言的な `validateSelection` メカニズムに置き換えられた — 以下の[選択の検証](#selection-validation)を参照。

パスは `workflow.json` を含むディレクトリからの相対パスである。

### 多言語化

```json
{
  "i18n": {
    "defaultLocale": "en-US",
    "messages": {
      "zh-CN": {
        "label": "My Workflow",
        "parameters.language.title": "Language"
      }
    }
  }
}
```

詳細については[多言語化](localization)のページを参照。

### 完全な例：パラメータ付き文献分析 Workflow

```json
{
  "id": "my-literature-analysis",
  "label": "My Literature Analysis",
  "version": "1.0.0",
  "provider": "skillrunner",
  "display": { "emoji": "📄" },
  "inputs": {
    "unit": "attachment",
    "accepts": { "mime": ["application/pdf"] },
    "per_parent": { "min": 1, "max": 1 }
  },
  "parameters": {
    "language": {
      "type": "string",
      "title": "Output Language",
      "default": "en-US",
      "enum": ["en-US", "zh-CN", "ja-JP"],
      "allowCustom": true
    }
  },
  "execution": {
    "mode": "auto",
    "skillrunner_mode": "auto",
    "timeout_ms": 600000
  },
  "request": {
    "kind": "skillrunner.job.v1",
    "create": { "skill_id": "literature-analysis" }
  },
  "result": {
    "fetch": { "type": "bundle" },
    "expects": {
      "result_json": "result/result.json"
    }
  },
  "hooks": {
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

## 次のステップ

- [フックシステム](hooks) — 各 Hook の API シグネチャと書き方を学ぶ
- [パラメータシステム](parameters) — パラメータ種別、enum 値、動的オプションソース
- [選択とコンテキスト](selection-context) — ユーザーが選択したアイテムの情報を取得する方法
