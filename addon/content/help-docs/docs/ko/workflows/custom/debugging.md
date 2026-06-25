# 디버깅 및 테스트

커스텀 Workflow를 작성한 후, 다음 방법을 사용하여 검증하고 디버깅할 수 있습니다.

## 디버그 모드 활성화

환경설정에서 디버그 모드를 활성화하면 추가 디버깅 도구와 정보 표시가 잠금 해제됩니다:

Zotero → 설정 → Zotero Agents → 디버그 모드 활성화

디버그 모드가 활성화되면:

- 디버그 관련 Workflow가 대시보드에 표시됩니다
- 런타임 로그가 더 상세해집니다
- 일부 진단 도구를 사용할 수 있게 됩니다

## 디버그 프로브 툴킷 사용

플러그인에는 내장 `workflow-debug-probe` 디버깅 툴킷이 포함되어 있으며, 여러 진단 Workflow를 포함합니다:

| Workflow | 목적 |
|----------|---------|
| **Workflow Debug Probe** | Workflow 실행 전 상태 검사, 진단 패널 열기 |
| **Debug Sequence Linear Probe** | 순차 실행 및 기본 handoff 전달 검증 |
| **Debug Sequence Workspace Reuse Probe** | 단계 간 워크스페이스 재사용 검증 |
| **Debug Sequence Context Isolation Probe** | 명시적 handoff 필터링 및 격리 워크스페이스 검증 |

이 Workflow는 대시보드의 Workflow 목록에서 (디버그 모드에서) 볼 수 있으며, 시퀀스 실행 메커니즘을 검증하기 위해 직접 실행할 수 있습니다.

## 로그 확인

### 런타임 로그

Workflow는 실행 중 런타임 로그를 생성하며, 대시보드에서 확인할 수 있습니다:

1. 대시보드를 엽니다
2. 실행 중이거나 완료된 작업을 찾습니다
3. "로그 보기"를 클릭하여 로그 패널을 펼칩니다

### Hook에서 로그 작성

```js
export function applyResult({ parent, bundleReader, runtime }) {
  // 런타임 로그에 쓰기
  runtime.hostApi.logging.appendRuntimeLog({
    level: "info",
    message: `부모 항목 처리 중: ${parent}`,
    workflowId: runtime.workflowId,
  });

  // 복잡한 디버그 정보에는 console을 사용할 수 있습니다
  console.log("Debug:", { parent, workflowId: runtime.workflowId });
}
```

## 일반적인 문제 해결

### Workflow가 대시보드에 표시되지 않음

1. `workflow.json`이 올바른 디렉토리에 배치되었는지 확인
2. `workflow.json`이 올바른 형식(JSON 구문)인지 확인
3. `id`가 고유하며 공식 Workflow와 충돌하지 않는지 확인
4. `applyResult` 스크립트 경로가 올바른지 확인
5. 플러그인 오류 로그를 확인 (Zotero → 도움말 → 문제 해결 → 로그 파일 보기)

### filterInputs가 null을 반환

`filterInputs`가 `null`을 반환하면, 조건에 맞는 선택이 발견되지 않아 Workflow가 실행되지 않습니다. 필터링 로직이 올바른지 확인하세요.

### buildRequest와 선언적 요청의 충돌

`buildRequest` Hook과 `workflow.json`의 `request` 필드는 **상호 배타적**입니다. 둘 다 존재하면 `buildRequest`가 우선합니다. 요청 동작이 예상과 다르면 실수로 둘 다 정의하지 않았는지 확인하세요.

### Hook 스크립트 실행 실패

- Hook 스크립트가 `.mjs` (ES Module) 형식인지 확인
- 올바른 함수 이름을 export하고 있는지 확인: `filterInputs`, `buildRequest`, `applyResult`
- 함수 시그니처가 `{ parent, bundleReader, runtime }` 등의 파라미터를 올바르게 받는지 확인
- 상대 임포트 경로가 올바른지 확인

### 결과가 Zotero에 기록되지 않음

`applyResult`에서 `hostApi.mutations.execute()`를 사용했지만 적용되지 않으면, 가능한 원인:

- 쓰기 작업에는 사용자 승인이 필요하지만, 승인 팝업이 무시되거나 타임아웃됨
- `execution.zoteroHostAccess.required`가 `true`로 설정되지 않은 상태에서 쓰기 작업을 시도
- `allowWriteApprovalBypass`는 플러그인 권한 설정과 함께 사용해야 함

## 개발 제안

### 간단하게 시작

1. 먼저 `pass-through` Provider와 최소한의 `applyResult`로 Workflow가 성공적으로 로드되는지 검증
2. 점차적으로 `filterInputs`와 `buildRequest`를 추가
3. 마지막으로 실제 백엔드에 연결

### notifications.toast로 빠른 피드백

```js
hostApi.notifications.toast({
  text: `filterInputs가 ${selectionContext.items.parents.length}개의 부모 항목을 받았습니다`,
  type: "default",
});
```

이것은 로그를 확인하지 않고도 실행 결과를 확인할 수 있는 빠른 디버깅 기법입니다.

### 공식 Workflow 참고

공식 Workflow는 최고의 학습 레퍼런스입니다. 공식 패키지를 설치한 후 `<Zotero Data>/zotero-agents/content/official/workflows/` 디렉토리에서 소스 코드를 확인할 수 있습니다:

- `literature-workbench-package/literature-analysis/` — 완전한 skillrunner.job.v1 예시
- `content/official/workflows/literature-workbench-package/export-notes/` — 간단한 pass-through 예시
- `content/official/workflows/mineru/` — buildRequest + 파일 처리 예시
- `content/official/workflows/literature-workbench-package/literature-search-ingest/` — 대화형 모드 예시

## 다음 단계

- [Workflow 매니페스트 전체 레퍼런스](#doc/workflows%2Fcustom%2Fmanifest) — workflow.json의 모든 필드
- [Host API 레퍼런스](#doc/workflows%2Fcustom%2Fhost-api) — Hook에서 사용 가능한 모든 API
