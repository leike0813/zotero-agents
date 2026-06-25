# Workflow 매니페스트 작성하기

`workflow.json`은 Workflow의 매니페스트 파일로, 모든 메타데이터와 동작을 정의합니다. Workflow Manager는 이 파일을 통해 Workflow를 발견하고 로드합니다.

## 기본 구조

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

### 입력 정의

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

| 필드 | 설명 |
|------|------|
| `unit` | **입력 유닛 타입**. `"attachment"` (첨부파일), `"parent"` (부모 항목), `"note"` (노트), `"workflow"` (항목 선택 불필요, Dashboard에서 직접 트리거) |
| `accepts.mime` | 허용되는 MIME 타입 (`unit: "attachment"`일 때만 적용). 지정되지 않으면 모든 타입 허용 |
| `per_parent.min` | 부모 항목당 최소 첨부파일 수 |
| `per_parent.max` | 부모 항목당 최대 첨부파일 수 |

`unit: "workflow"`일 때, 트리거에 사용자 선택 항목이 필요하지 않습니다 (예: "주제 종합 생성").

### <a id="selection-validation"></a>validateSelection — 선택 검증

`validateSelection`은 선언적 선택 검증입니다. "이미 결과가 있는 항목 건너뛰기" 또는 "특정 타입의 선택만 허용"과 같은 일반적인 시나리오를 다룹니다 — JavaScript를 작성할 필요 없이.

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

### `select` — 선택 정책

| 필드 | 타입 | 설명 |
|------|------|------|
| `select.policy` | string | 선택 정책. 지원 값은 아래 참조 |
| `select.unit` | string | 선택 검증을 위한 입력 유닛 재정의. `"attachment"` / `"parent"` / `"note"` / `"workflow"` |

**지원되는 `select.policy` 값:**

| 정책 | 설명 |
|------|------|
| `input-unit` | 입력 유닛에 일치하는 항목 허용 |
| `literature-source` | 문헌 출처 허용 (첨부파일 또는 확장 가능한 첨부파일이 있는 부모 항목) |
| `pdf-attachment` | PDF 첨부파일만 허용 |
| `selected-parent` | 선택 항목의 부모 항목 허용 |
| `generated-note-candidates` | 생성된 노트의 후보 항목 허용 |
| `digest-representative-image` | 대표 이미지 추출 대상 항목 |

### `require` — 선택 요구사항

| 필드 | 타입 | 설명 |
|------|------|------|
| `require.counts.parents` | number | 최소 필요 부모 항목 수 |
| `require.counts.attachments` | number | 최소 필요 첨부파일 항목 수 |
| `require.counts.notes` | number | 최소 필요 노트 항목 수 |
| `require.counts.children` | number | 최소 필요 자식 항목 수 |
| `require.counts.total` | number | 최소 필요 전체 항목 수 |
| `require.allowMixed` | boolean | 선택에서 다양한 항목 타입을 혼합할 수 있는지 여부 |

### `exclude` — 제외 규칙

| 필드 | 타입 | 설명 |
|------|------|------|
| `exclude[]` | array | 제외 규칙 목록. 어떤 규칙이라도 일치하면 현재 항목이 건너져집니다 |

**지원되는 `exclude.kind` 값:**

| kind | 설명 | 추가 파라미터 |
|------|------|--------------|
| `generated-notes-all` | 항목에 이미 지정된 타입의 생성된 노트가 있음 | `noteKinds`: 노트 타입 목록, 예: `["digest", "references", "citation-analysis"]` |
| `artifact-exists` | 항목에 이미 지정된 아티팩트가 있음 (중복 실행 방지) | `target`: `"deep-reading-html"` / `"translator-markdown"` / `"mineru-markdown"`; `parameter`: 아티팩트 매칭을 위한 선택적 언어 파라미터 |

### `derive` — 파생 선택

| 필드 | 타입 | 설명 |
|------|------|------|
| `derive[]` | array | 파생 선택 작업. `"exportCandidates"` — 노트 내보내기를 위한 후보 파생; `"digestRepresentativeImageTarget"` — digest 노트에서 대표 이미지 대상 파생 |

**예시:**

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

> 이 예시에서는 심층 읽기 HTML 아티팩트가 이미 있는 항목이 자동으로 건너져되며, 사용자가 수동으로 필터링할 필요가 없습니다.

### 트리거 제어

```json
{
  "trigger": {
    "requiresSelection": false
  }
}
```

| 필드 | 설명 |
|------|------|
| `requiresSelection` | 트리거에 사용자 선택 항목이 필요한지 여부. 기본값은 `true`. `false`로 설정하면 항목을 선택하지 않고도 Dashboard에서 Workflow를 실행할 수 있습니다. 일반적으로 `inputs.unit: "workflow"`일 때 `false`로 설정 |

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

> **실행 모드** (`auto` / `interactive`)는 `request.create.mode`로 이동되었습니다 — [요청 종류](request-kinds) 참조.

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

각 `kind`에 대한 자세한 정보는 [요청 종류](request-kinds)를 참조하세요.

### 훅 선언

```json
{
  "hooks": {
    "buildRequest": "hooks/buildRequest.mjs",
    "normalizeSettings": "hooks/normalizeSettings.mjs",
    "applyResult": "hooks/applyResult.mjs"
  }
}
```

| 필드 | 필수 | 설명 |
|------|------|------|
| `applyResult` | ✅ | **필수**. 실행 후 결과 처리를 위한 스크립트 경로 |
| `buildRequest` | | 선택. 백엔드로 전송할 요청을 구축. `request` 필드와 상호 배타적 |
| `normalizeSettings` | | 선택. 사용자가 설정한 파라미터를 정규화 |

> **입력 필터링**은 선언적 `validateSelection` 메커니즘으로 대체되었습니다 — 아래 [선택 검증](#selection-validation) 참조.

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

자세한 정보는 [지역화](localization) 페이지를 참조하세요.

### 완전한 예시: 파라미터가 포함된 문헌 분석 Workflow

```json
{
  "id": "my-literature-analysis",
  "label": "내 문헌 분석",
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

- [훅 시스템](hooks) — 각 훅의 API 시그니처와 작성 방법 알아보기
- [파라미터 시스템](parameters) — 파라미터 타입, enum 값, 동적 옵션 소스
- [선택 및 컨텍스트](selection-context) — 사용자가 선택한 항목의 정보를 가져오는 방법
