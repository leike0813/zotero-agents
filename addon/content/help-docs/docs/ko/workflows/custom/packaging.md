# 패키징 및 배포

Workflow는 **단일 Workflow**와 **다중 Workflow 패키지** 두 가지 형태를 지원합니다. 단일 Workflow는 간단한 상황에 적합하며, 다중 Workflow 패키지는 코드를 공유하는 Workflow 모음에 적합합니다.

## 단일 Workflow

가장 간단한 형태: `workflow.json`과 Hook 스크립트를 포함한 디렉토리:

```
my-workflow/
├── workflow.json
└── hooks/
    ├── filterInputs.mjs
    └── applyResult.mjs
```

단일 Workflow에는 `packageId`가 없으며, Hook 스크립트는 상대 임포트를 통해 코드를 공유할 수 없습니다.

## 다중 Workflow 패키지

여러 Workflow가 로직을 공유할 때, 패키지로 구성할 수 있습니다:

```
my-package/
├── workflow-package.json       # 패키지 매니페스트
├── lib/                        # 공유 코드
│   └── runtime.mjs
│   └── util.mjs
├── workflow-a/
│   ├── workflow.json
│   └── hooks/
│       ├── filterInputs.mjs
│       └── applyResult.mjs
├── workflow-b/
│   ├── workflow.json
│   └── hooks/
│       └── applyResult.mjs
└── locales/                    # 패키지 레벨 로컬라이제이션 파일
    ├── zh-CN.json
    └── ja-JP.json
```

### workflow-package.json

```json
{
  "id": "my-package",
  "version": "1.0.0",
  "workflows": [
    "workflow-a/workflow.json",
    "workflow-b/workflow.json"
  ],
  "i18n": {
    "defaultLocale": "en-US",
    "locales": {
      "zh-CN": "locales/zh-CN.json",
      "ja-JP": "locales/ja-JP.json"
    }
  }
}
```

### 패키지 내 공유 코드

패키지의 Hook 스크립트는 상대 경로를 통해 `lib/`에서 공유 모듈을 임포트할 수 있습니다:

```js
// workflow-a/hooks/applyResult.mjs
import { processResult } from "../../lib/util.mjs";

export async function applyResult({ parent, bundleReader, runtime }) {
  return processResult({ parent, bundleReader, runtime });
}
```

```js
// lib/util.mjs
export function processResult({ parent, bundleReader, runtime }) {
  // 공유 처리 로직
}
```

참고: Hook 스크립트는 ES Module로 실행되며 `import` 문을 지원하지만, 임포트 경로는 Hook 파일 자체 기준 상대 경로여야 합니다.

## 배포 방법

### 사용자 Workflow 디렉토리

Zotero 환경설정에서 구성된 **Workflow 디렉토리** 아래에 Workflow 디렉토리를 배치하세요. Workflow Manager가 이 디렉토리(하위 디렉토리 포함)를 자동으로 스캔하여 모든 `workflow.json` 파일을 발견합니다.

설정 위치: Zotero → 설정 → Zotero Agents → Workflow 디렉토리.

### 디렉토리 스캔 규칙

- Workflow Manager는 Workflow 디렉토리와 하위 디렉토리를 **재귀적으로 스캔**합니다
- `workflow.json`을 발견하면 Workflow로 등록합니다
- 패키지 디렉토리 내에서 `workflow-package.json`이 발견되면, 하위 Workflow가 패키지 모드로 로드됩니다
- Workflow 디렉토리가 존재하지 않거나 유효한 Workflow가 없으면, Workflow Manager가 경고를 보고하지만 플러그인 작동에는 영향을 주지 않습니다

### 다른 형식과의 호환성

| 저장 위치 | 표시 범위 | 설명 |
|-----------------|------------|-------------|
| 공식 Workflow 패키지 `content/official/workflows/` | 모든 사용자 | Content Feed를 통해 독립적으로 설치; 사용자가 직접 수정 불가 |
| 사용자 Workflow 디렉토리 | 현재 사용자 | 자유롭게 추가/수정/삭제 가능 |
| 공식 + 사용자 디렉토리 | 통합 표시 | 두 위치의 Workflow가 대시보드에 나란히 표시됨 |

## 검증

Workflow를 사용자 디렉토리에 배포한 후:

1. **대시보드를 다시 열면**, 새 Workflow가 홈 페이지의 Workflow 목록에 표시되어야 합니다
2. 일치하는 항목을 선택한 후 우클릭 → Zotero Agents; 새 Workflow가 표시되어야 합니다
3. Workflow를 실행하기 전에 설정 대화 상자의 파라미터가 올바른지 확인하세요

## 다음 단계

- [로컬라이제이션](#doc/workflows%2Fcustom%2Flocalization) — Workflow에 다국어 지원 추가
- [요청 종류](#doc/workflows%2Fcustom%2Frequest-kinds) — 적절한 실행 백엔드 및 요청 유형 선택
- [디버깅 및 테스트](#doc/workflows%2Fcustom%2Fdebugging) — Workflow 정확성 검증
