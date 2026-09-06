# 디버깅 및 테스트

커스텀 워크플로우를 작성한 후, 다음 방법을 사용하여 검증하고 디버깅할 수 있습니다.

## 디버그 모드 활성화

환경 설정에서 디버그 모드를 활성화하면 추가 디버깅 도구와 정보 표시가 잠금 해제됩니다:

Zotero → 설정 → Zotero Agents → 디버그 모드 활성화

디버그 모드가 활성화된 경우:

- 디버그 관련 워크플로우가 대시보드에 표시됩니다
- 런타임 로그가 더 상세해집니다
- 일부 진단 도구를 사용할 수 있게 됩니다

## Debug Probe 툴킷 사용하기

플러그인에는 여러 진단 워크플로우가 포함된 내장 `workflow-debug-probe` 디버깅 툴킷이 포함되어 있습니다:

| 워크플로우 | 목적 |
|------------|------|
| **Workflow Debug Probe** | 워크플로우 실행 전 상태를 검사하고 진단 패널을 엽니다 |
| **Debug Sequence Linear Probe** | 순차 실행 및 기본 핸드오프 전달을 검증합니다 |
| **Debug Sequence Workspace Reuse Probe** | 단계 간 워크스페이스 재사용을 검증합니다 |
| **Debug Sequence Context Isolation Probe** | 명시적 핸드오프 필터링 및 격리된 워크스페이스를 검증합니다 |

이러한 워크플로우는 대시보드의 워크플로우 목록에 표시되며(디버그 모드에서), 직접 실행하여 시퀀스 실행 메커니즘을 검증할 수 있습니다.

## 로그 보기

### 런타임 로그

워크플로우는 실행 중에 런타임 로그를 생성하며, 대시보드에서 확인할 수 있습니다:

1. 대시보드를 엽니다
2. 실행 중이거나 완료된 작업을 찾습니다
3. "View Logs"를 클릭하여 로그 패널을 확장합니다

### 훅에서 로그 작성하기

```js
export function applyResult({ parent, bundleReader, runtime }) {
  // 런타임 로그에 작성
  runtime.hostApi.logging.appendRuntimeLog({
    level: "info",
    message: `parent 처리 중: ${parent}`,
    workflowId: runtime.workflowId,
  });

  // 복잡한 디버그 정보에는 console을 사용할 수 있습니다
  console.log("Debug:", { parent, workflowId: runtime.workflowId });
}
```

## 일반적인 문제 해결

### 워크플로우가 대시보드에 나타나지 않음

1. `workflow.json`이 올바른 디렉토리에 있는지 확인합니다
2. `workflow.json`이 올바르게 포맷되었는지 확인합니다 (JSON 구문)
3. `id`가 고유하며 공식 워크플로우와 충돌하지 않는지 확인합니다
4. `applyResult` 스크립트 경로가 올바른지 확인합니다
5. 플러그인 오류 로그를 확인합니다 (Zotero → 도움말 → 문제 해결 → 로그 파일 보기)

### 선택 유효성 검사가 모든 단위를 건너뜀

선언적 `validateSelection` 또는 `preflight`가 모든 입력 단위를 건너뛰면 워크플로우는 프로바이더 요청을 제출하지 않습니다. 선택 정책, 제외 규칙 및 `kind: "skip"`을 반환하는 `preflight` 결과를 확인하세요.

### buildRequest와 선언적 요청 간의 충돌

`buildRequest` 훅과 `workflow.json`의 `request` 필드는 **상호 배타적**입니다. 둘 다 존재하는 경우 `buildRequest`가 우선합니다. 요청 동작이 예상과 다른 경우 둘 다 실수로 동시에 정의되었는지 확인하세요.

### 훅 스크립트 실행 실패

- 훅 스크립트가 `.mjs` (ES Module) 형식인지 확인합니다
- 올바른 함수 이름이 내보내졌는지 확인합니다: `preflight`, `buildRequest`, `normalizeSettings`, `applyResult`
- 함수 시그니처가 `{ parent, bundleReader, runtime }`과 같은 매개변수를 올바르게 받는지 확인합니다
- 상대 import 경로가 올바른지 확인합니다

### 결과가 Zotero에 기록되지 않음

`applyResult`가 `hostApi.mutations.execute()`를 사용하지만 적용되지 않는 경우, 가능한 원인:

- 쓰기 작업에는 사용자 승인이 필요하지만 승인 팝업이 무시되었거나 시간 초과되었습니다
- `execution.zoteroHostAccess.required`가 `true`로 설정되지 않은 상태에서 쓰기 작업을 시도했습니다
- `allowWriteApprovalBypass`는 플러그인 권한 구성과 함께 사용해야 합니다

## 개발 제안

### 간단하게 시작하기

1. 먼저 `pass-through` 프로바이더와 최소한의 `applyResult`를 사용하여 워크플로우가 성공적으로 로드되는지 확인합니다
2. 먼저 `validateSelection`을 추가하고, 필요한 경우에만 `preflight` 또는 `buildRequest`를 추가합니다
3. 마지막으로 실제 백엔드에 연결합니다

### notifications.toast로 빠른 피드백 받기

```js
hostApi.notifications.toast({
  text: `buildRequest가 ${selectionContext.items.filter((item) => item.kind === "parent").length}개의 상위 항목을 수신했습니다`,
  type: "default",
});
```

이것은 로그를 확인하지 않고도 실행 결과를 볼 수 있는 빠른 디버깅 기술입니다.

### 공식 워크플로우 참조하기

공식 워크플로우는 최고의 학습 참고 자료입니다. 공식 패키지를 설치한 후 `<Zotero Data>/zotero-agents/content/official/workflows/` 디렉토리에서 소스 코드를 확인할 수 있습니다:

- `literature-workbench-package/literature-analysis/` — 완전한 skillrunner.job.v1 예제
- `content/official/workflows/literature-workbench-package/export-notes/` — 간단한 pass-through 예제
- `content/official/workflows/mineru/` — buildRequest + 파일 처리 예제
- `content/official/workflows/literature-workbench-package/literature-search-ingest/` — 대화형 모드 예제

## 다음 단계

- [전체 워크플로우 매니페스트 참조](manifest) — workflow.json의 모든 필드
- [Host API 참조](host-api) — 훅에서 사용 가능한 모든 API
