# 대시보드

## 개요

대시보드는 Zotero Agents의 중앙 모니터링 및 제어 패널입니다. 여기서 작업 상태를 확인하고, Workflow를 관리하고, 기록을 탐색하고, 런타임 로그를 검사할 수 있습니다.

## 열기 방법

- **도구모음 버튼**: Zotero 도구모음에서 Zotero Agents 아이콘 클릭
- **메뉴**: **도구 → 대시보드 열기**
- **Zotero 탭**: 메뉴를 통해 열리며, 독립적인 Zotero 탭으로 표시됩니다

![Zotero Agents Toolbar Dashboard Button](/img/icon_workbench.png)

## 페이지

### 홈

대시보드의 기본 페이지로, 다음을 표시합니다.

- **Workflow 목록**: 실행 및 설정 버튼이 있는 사용 가능한 모든 Workflow
- **ACP 채팅 영역**: ACP 대화 빠른 접근
- **ACP 스킬 실행**: ACP 백엔드의 스킬 실행 상태
- **스킬 피드백**: 최근 스킬 실행 피드백 평점 및 댓글 확인
- **작업 요약**: 현재 실행 중인 작업의 개요

![Dashboard Home](/img/docs/dashboard_home.png)

### Workflow 옵션

Workflow 파라미터 설정 페이지.

- 각 Workflow의 구성 보기 및 수정
- 기본 파라미터 설정
- 기본 백엔드 선택

![Dashboard Workflow Options Page](/img/docs/dashboard_workflow-settings.png)

### 백엔드

백엔드 관리 페이지.

- 구성된 모든 백엔드 목록
- 각 백엔드의 작업 기록
- 백엔드 상세 보기(유형에 따라 다름)

백엔드 상세 보기:

| 백엔드 유형 | 표시 |
|------------|------|
| Generic HTTP | 작업 테이블 + 런타임 로그 |
| SkillRunner | 실행 테이블 + 상태 영역 + 대화 영역 + 응답/취소 작업 |
| ACP | 스킬 실행 보기 |

![Dashboard ACP Backend Task List](/img/docs/dashboard_acp-backend.png)

![Dashboard SkillRunner Backend Task List](/img/docs/dashboard_skillrunner-backend.png)

### 결과물

Workflow 결과물을 탐색하고 관리합니다.

- Workflow 실행의 출력 아티팩트 보기
- 결과물 폴더 열기
- 결과물 미리보기 및 제거

![Dashboard Product Storage](/img/docs/dashboard_products.png)

## 스킬 피드백

스킬 피드백 패널은 최근 스킬 실행 피드백을 표시합니다.

| 열 | 설명 |
|----|------|
| Workflow | 실행된 Workflow의 이름 |
| 백엔드 | 실행한 백엔드 |
| 평점 | 사용자 평점 (1–5) |
| 댓글 | 피드백 댓글 |
| 타임스탬프 | 피드백이 제출된 시점 |

작업:
- **필터**: 평점, Workflow 또는 시간 범위별 필터링
- **내보내기**: 분석을 위해 피드백 데이터 내보내기

![Dashboard Skill Feedback Storage](/img/docs/dashboard_skill-feedback.png)

## 작업 상태

| 상태 | 설명 |
|------|------|
| `queued` | 실행 대기 중 |
| `running` | 현재 실행 중 |
| `waiting_user` | 사용자 입력 대기 중 |
| `waiting_auth` | 승인 대기 중 |
| `succeeded` | 실행 성공 |
| `failed` | 실행 실패 |
| `canceled` | 취소됨 |

## 런타임 로그 뷰어

대시보드에는 내장 로그 뷰어가 포함되어 있습니다.

- 백엔드별 필터링
- Workflow별 필터링
- 로그 레벨별 필터링
- 시간 범위별 필터링
- 진단 내보내기
- 이슈 요약 복사

![Dashboard Runtime Logs Viewer](/img/docs/dashboard_logs.png)

## 도구모음 버튼

Zotero 도구모음의 Zotero Agents 아이콘 버튼은 다음을 지원합니다.

- 왼쪽 클릭: 대시보드 열기/전환
- 실행 중인 작업의 수 표시
- 실행 중인 작업 목록이 있는 팝업 표시
