# Workflow 매니페스트 작성하기

`workflow.json`은 Workflow의 매니페스트 파일로, 모든 메타데이터와 동작을 정의합니다. Workflow Manager는 이 파일을 통해 Workflow를 발견하고 로드합니다.

## 기본 구조

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

## 필드 레퍼런스

### 기본 식별

| 필드 | 필수 | 타입 | 설명 |
|------|------|------|------|
| `id` | ✅ | string | 고유 식별자; 중복될 수 없습니다. kebab-case 권장 |
| `label` | ✅ | string | 사용자에게 표시되는 이름 |
| `version` | | string | 시맨틱 버전 번호, 예: `"1.0.0"` |
| `provider` | ✅ | string | 백엔드 타입. 사용 가능한 값은 아래 참조 |

### Provider 값

| 값 | 설명 |
|----|------|
| `"pass-through"` | 순수 로컬 실행, 백엔드 불필요. 파일 작업, 내보내기 등에 적합 |
| `"skillrunner"` | Skill-Runner 백엔드를 통해 Skill 실행 |
| `"acp"` | ACP 백엔드를 통해 Skill 실행 |
| `"generic-http"` | Generic HTTP 백엔드를 통해 API 호출 |

`provider`는 Workflow가 호환되는 백엔드 타입을 결정하며, Dashboard에서 실행 가능하게 표시되는 백엔드도 결정합니다.

### 표시 제어

```json
{
  "display": {
    "core": true,
    "emoji": "📊"
  },
  "taskNameTemplate": "처리 중: {query}",
  "debug_only": false
}
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `display.core` | boolean | 핵심 Workflow로 표시할지 여부 (Dashboard에서 우선 표시, core 배지 포함) |
| `display.emoji` | string | 표시 이름 접두사 아이콘, 예: `"📖"` |
| `taskNameTemplate` | string | `{파라미터 이름}` 자리표시자를 사용하는 작업 이름 템플릿, 실행 시 실제 값으로 대체 |
| `debug_only` | boolean | `true`이면 디버그 모드에서만 표시 |

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
### 실행 제어

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

| 필드 | 설명 |
|------|------|
| `timeout_ms` | 밀리초 단위 타임아웃 (Generic HTTP 백엔드에 대해서만 유효) |
| `poll_interval_ms` | 밀리초 단위 폴링 간격, 진행 상태 확인 빈도 제어 |
| `mcp.requiredTools` | 이 Workflow에 필요한 MCP 도구 (도구 이름 문자열 배열) |
| `zoteroHostAccess.required` | Zotero 호스트 접근이 필요한지 여부 (라이브러리 데이터 읽기/쓰기) |
| `zoteroHostAccess.allowWriteApprovalBypass` | 쓰기 작업 승인 우회 허용 여부 |
| `feedback.showNotifications` | 실행 알림 표시 여부. 기본값은 `true`; `false`로 설정하면 자동으로 실행 |

> **실행 모드** (`auto` / `interactive`)는 `request.create.mode`로 이동되었습니다 — [요청 종류](#doc/workflows%2Fcustom%2Frequest-kinds) 참조.

### 결과 검색

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

| 필드 | 설명 |
|------|------|
| `fetch.type` | 검색 방법. `"bundle"` (zip 번들 다운로드), `"result"` (결과 JSON만 검색) |
| `final_step_id` | 시퀀스 Workflow의 경우, 최종 단계의 id를 지정하여 최종 결과를 판별하는 데 사용 |
| `expects.result_json` | 예상 결과 JSON 파일 경로 (런타임 작업 공간 기준 상대 경로) |
| `expects.artifacts` | 예상 아티팩트 파일 경로 목록 |

### 요청 정의

선언적 요청 정의로, `hooks.buildRequest`와 **상호 배타적**입니다 (둘 다 존재하면 `hooks.buildRequest`가 우선).

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

각 `kind`에 대한 자세한 정보는 [요청 종류](#doc/workflows%2Fcustom%2Frequest-kinds)를 참조하세요.

### 훅 선언

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

| 필드 | 필수 | 설명 |
|------|------|------|
| `applyResult` | ✅ | **필수**. 실행 후 결과 처리를 위한 스크립트 경로 |
| `preflight` | | 선택. 선택 해석 후, 요청 구축 전에 실행됩니다. 계속 진행, 건너뛰기, `applyResult`로 단축, 또는 하나의 입력 유닛을 가상 요청 유닛으로 교체할 수 있습니다 |
| `buildRequest` | | 선택. 백엔드로 전송할 요청을 구축. `request` 필드와 상호 배타적 |
| `normalizeSettings` | | 선택. 사용자가 설정한 파라미터를 정규화 |

> **입력 필터링**은 선언적 `validateSelection` 메커니즘으로 대체되었습니다 — 아래 [선택 검증](#selection-validation) 참조.

`preflight`는 메뉴 활성화, debug-probe 선택 분류, 또는 Host Bridge 준비 확인에 관여하지 않습니다. 선택 제약은 `validateSelection`에, provider 요청 구성은 `buildRequest` 또는 `request`에, Zotero 쓰기는 `applyResult`에 유지하세요.

경로는 `workflow.json`이 포함된 디렉터리 기준 상대 경로입니다.

### 지역화

```json
{
  "i18n": {
    "defaultLocale": "en-US",
    "messages": {
      "zh-CN": {
        "label": "내 Workflow",
        "parameters.language.title": "언어"
      }
    }
  }
}
```

자세한 정보는 [지역화](#doc/workflows%2Fcustom%2Flocalization) 페이지를 참조하세요.

### 완전한 예시: 파라미터가 포함된 문헌 분석 Workflow

```json
{
  "schemaVersion": 2,
  "id": "my-literature-analysis",
  "label": "내 문헌 분석",
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
      "title": "출력 언어",
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

## 다음 단계

- [훅 시스템](#doc/workflows%2Fcustom%2Fhooks) — 각 훅의 API 시그니처와 작성 방법 알아보기
- [파라미터 시스템](#doc/workflows%2Fcustom%2Fparameters) — 파라미터 타입, enum 값, 동적 옵션 소스
- [선택 및 컨텍스트](#doc/workflows%2Fcustom%2Fselection-context) — 사용자가 선택한 항목의 정보를 가져오는 방법
