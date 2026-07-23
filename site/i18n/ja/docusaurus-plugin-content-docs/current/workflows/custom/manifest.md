# Workflow マニフェストの作成

`workflow.json` は Workflow のマニフェストファイルであり、すべてのメタデータと動作を定義する。Workflow Manager はこのファイルを通じて Workflow を検出し、読み込む。

## 基本構造

```json
{
  "schemaVersion": 2,
  "id": "my-workflow",
  "label": "My Workflow",
  "version": "1.0.0",
  "provider": "pass-through",
  "display": {
    "core": false,
    "emoji": "🔧"
  },
  "trigger": { "requiresSelection": true },
  "inputs": {
    "member": { "kind": "parent" },
    "grouping": { "mode": "each" }
  },
  "validateSelection": {
    "select": { "policy": "input-member", "source": "selected" },
    "filters": []
  },
  "parameters": {},
  "execution": {},
  "request": { "kind": "pass-through.run.v1" },
  "hooks": {
    "preflight": "hooks/preflight.mjs",
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

### Input Planning Contracts

`inputs` and `validateSelection` have separate, non-interchangeable roles.
`inputs` is the consumer contract for prepared execution members and grouping;
`validateSelection` is the producer contract for raw-selection validation,
candidate selection, ordered filtering, and candidate cardinality.

#### `inputs` — Execution Input Contract

```json
{
  "inputs": {
    "member": {
      "kind": "attachment",
      "accepts": {
        "mime": ["text/markdown", "text/x-markdown", "application/pdf"]
      }
    },
    "grouping": { "mode": "parent" }
  }
}
```

- `member.kind`: `selection`, `parent`, `child`, `attachment`,
  `note`, `generated-note`, or `digest-image-target`.
- `member.accepts.mime` applies only to attachment execution members.
- `grouping.mode: "each"` creates one unit per candidate.
- `grouping.mode: "all"` creates one unit containing all candidates.
- `grouping.mode: "parent"` creates stable parent groups. Candidates without
  parent identity are skipped as `missing-parent`.

#### `validateSelection` — Candidate Production Contract {#selection-validation}

```json
{
  "validateSelection": {
    "require": {
      "selection": {
        "counts": {
          "parents": { "min": 1 },
          "total": { "min": 1 }
        },
        "allowMixed": false
      },
      "candidates": { "min": 1 }
    },
    "select": {
      "policy": "input-member",
      "source": "related"
    },
    "filters": [
      {
        "kind": "source-file-exists",
        "phase": "availability"
      }
    ]
  }
}
```

`require.selection` checks the raw SelectionContext exactly once.
`select` then produces ordered atomic candidates. MIME compatibility and
`filters` run before `require.candidates`. Count rules use either
`{ "exact": n }` or non-negative `min`/`max` values.

Supported selectors are `input-member` (`source: selected|related`),
`selection`, `literature-source`, `generated-note-candidates`, and
`digest-representative-image`. Supported filters are
`source-file-exists`, `candidates-per-parent`,
`generated-note-kinds-absent`, and `artifact-absent`. Parameter-dependent
artifact checks require `phase: "execute"`; availability filters run during
preview and are reapplied during confirmed planning.

#### `trigger` — Empty-selection Gate

```json
{
  "trigger": {
    "requiresSelection": true
  }
}
```

`trigger.requiresSelection` is required in schema v2. It controls only whether
an empty selection may enter planning; it does not replace
`require.selection`.
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
    "preflight": "hooks/preflight.mjs",
    "buildRequest": "hooks/buildRequest.mjs",
    "normalizeSettings": "hooks/normalizeSettings.mjs",
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

| フィールド | 必須 | 説明 |
|-----------|------|------|
| `applyResult` | ✅ | **必須**。実行後の結果処理用スクリプトパス |
| `preflight` | | オプション。選択解決の後、リクエスト構築の前に実行される。continue、skip、`applyResult` へのショートサーキット、または1つの入力ユニットを仮想リクエストユニットに置き換えることができる |
| `buildRequest` | | オプション。バックエンドに送信するリクエストを構築する。`request` フィールドと相互排他 |
| `normalizeSettings` | | オプション。ユーザーが設定したパラメータを正規化する |

> **入力のフィルタリング**は宣言的な `validateSelection` メカニズムに置き換えられた — 以下の[選択の検証](#selection-validation)を参照。

`preflight` はメニュー有効化判断、デバッグプローブの選択分類、Host Bridge の準備状態チェックには関与しません。選択制約は `validateSelection` に、プロバイダーリクエスト構築は `buildRequest` または `request` に、Zotero 書き込みは `applyResult` に保持してください。

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
  "schemaVersion": 2,
  "id": "my-literature-analysis",
  "label": "My Literature Analysis",
  "version": "1.0.0",
  "provider": "skillrunner",
  "display": { "emoji": "📄" },
  "trigger": { "requiresSelection": true },
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
