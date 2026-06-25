# 환경설정

Zotero Agents 설정은 **Zotero → 설정 → Zotero Agents**(Windows/Linux) 또는 **Zotero → 기본설정 → Zotero Agents**(macOS)에 위치합니다.

## Workflow 설정

### Workflow 디렉토리

- **경로**: Workflow를 저장할 사용자 정의 디렉토리
- **기본 위치**: `<Zotero Data>/zotero-agents/data/workflows`
- **Workflow 스캔**: 버튼을 클릭하여 디렉토리를 다시 스캔하고 모든 Workflow를 로드합니다

### 스킬 디렉토리

- **경로**: 스킬 패키지를 저장할 사용자 정의 디렉토리
- **스캔**: 버튼을 클릭하여 디렉토리를 스캔하고 스킬을 로드합니다

### 공식 Workflow 패키지

공식 Workflow는 별도의 콘텐츠 패키지를 통해 배포되며, 플러그인 자체와 분리되어 있습니다.

![Workflow Settings Page](/img/docs/preferences_workflow.png)

| 설정 | 유형 | 설명 |
|------|------|------|
| **공식 Workflow 패키지 설치** | 버튼 | GitHub / Gitee에서 최신 공식 패키지를 다운로드하여 설치 |
| **업데이트 확인** | 버튼 | 원격에서 새 버전 사용 가능 여부 확인 |
| **상태** | 텍스트 | 현재 설치된 패키지 버전 및 채널 정보 표시 |

![Official Workflow Package Contents](/img/docs/preferences_official-workflow-contents.png)

#### 업데이트 채널

세 가지 업데이트 채널 중 하나를 선택할 수 있습니다.

| 채널 | 설명 |
|------|------|
| **stable** | 안정 릴리스 (권장) |
| **beta** | 베타 릴리스, 향후 기능 포함 |
| **dev** | 개발 릴리스, 최신 실험적 변경 포함 |

채널 전환 후 **업데이트 확인**을 클릭하여 해당 채널의 최신 패키지를 가져옵니다.

### 런타임 설정

- **스킬 실행 피드백 사용**: 활성화하면 스킬 실행이 마크다운 피드백 사이드카를 기록할 수 있으며, 이는 대시보드 스킬 피드백 패널에서 수집됩니다

## Host Bridge

외부 AI 도구 및 CLI가 Zotero 라이브러리에 접근하기 위한 내장 HTTP 서비스입니다. 자세한 내용은 [Host Bridge](backends/host-bridge)를 참조하세요.

| 설정 | 유형 | 설명 |
|------|------|------|
| **MCP 서버 사용** | 부울 | MCP 프로토콜 인터페이스도 노출 |
| **쓰기 승인 비활성화** | 부울 | 위험: 모든 쓰기 승인 우회 |
| **LAN 접근 사용** | 부울 | LAN 접근 허용 |
| **고정 포트** | 부울 | 랜덤 포트 대신 고정 포트 사용 |
| **포트 번호** | 숫자 | 고정 포트 값 (기본값 26570) |
| **LAN IP** | 문자열 | 광고할 IP를 수동으로 지정 (비워두면 자동 감지) |

![Host Bridge Settings Page](/img/docs/preferences_host-bridge.png)

작업 버튼:

- **시작/엔드포인트 표시**: 서비스를 시작하고 엔드포인트 URL 표시
- **토큰 순환**: 세션 토큰 순환
- **마스터 토큰 생성/순환**: 영구 토큰 생성
- **마스터 토큰 복사**: 클립보드에 복사
- **원격 CLI 프로필 복사**: 원격 연결 구성 가져오기
- **CLI 설치**: `zotero-bridge` 원클릭 설치

![Host Bridge Dangerous Actions Area Expanded](/img/docs/preferences_host-bridge_expand.png)

## SkillRunner 로컬 백엔드

> ⚠️ 이 모드는 에이전트 도구 설치에 완전히 익숙하지 않고 Docker를 사용할 수 없는 사용자에게만 적합합니다. ACP 에이전트가 이미 있거나 Docker를 사용할 수 있다면 [ACP 백엔드](backends/acp) 또는 [Docker 배포 Skill-Runner](backends/skill-runner#recommended-docker-persistent-deployment)를 선호하세요.

로컬 Skill-Runner는 플러그인과 함께 시작 및 중지됩니다 — Zotero를 닫으면 모든 작업이 종료됩니다. 런타임 관리 기능:

| 기능 | 설명 |
|------|------|
| **원클릭 배포** | 최신 버전의 Skill-Runner 런타임을 다운로드하여 설치 |
| **시작** | 로컬 Skill-Runner 프로세스 시작 |
| **중지** | 실행 중인 로컬 Skill-Runner 중지 |
| **제거** | 설치된 런타임 파일 제거 |
| **관리 UI 열기** | 플러그인에서 백엔드 관리 인터페이스 열기 |
| **스킬 폴더 열기** | 스킬 파일이 저장된 디렉토리 열기 |
| **모델 캐시 새로고침** | 백엔드의 모델 목록 캐시 업데이트 |
| **디버그 콘솔 열기** | 백엔드 로그 출력 보기 |

![SkillRunner Local Backend Settings Page](/img/docs/preferences_skillrunner-local-backend.png)

## 백엔드 매니저

모든 백엔드 프로필을 관리합니다.

- 제공자별 그룹화(SkillRunner, ACP, Generic HTTP)
- 백엔드 추가/편집/삭제
- 각 백엔드는 다음을 구성할 수 있습니다: ID, Base URL, Bearer Token, Timeout

## WebDAV 동기화

Synthesis Workbench를 위한 교차 디바이스 동기화 솔루션으로, 더 이상 사용되지 않는 Git Sync를 대체합니다. 자세한 내용은 [WebDAV 동기화](synthesis/webdav-sync)를 참조하세요.

| 설정 | 유형 | 기본값 | 설명 |
|------|------|--------|------|
| **WebDAV 동기화 사용** | 부울 | `false` | 메인 스위치 |
| **Base URL** | 문자열 | `""` | WebDAV 서버 주소 |
| **원격 경로** | 문자열 | `"zotero-agents"` | 원격 디렉토리 경로 |
| **사용자 이름** | 문자열 | `""` | WebDAV 사용자 이름 |
| **비밀번호/토큰** | 암호화됨 | `""` | 비밀번호 또는 앱 토큰 (AES-256-GCM 암호화) |
| **자동 동기화** | 부울 | `false` | 각 변경 후 자동으로 동기화 트리거 |
| **자동 재시도** | 부울 | `false` | 실패 시 자동으로 재시도 |

작업 버튼: 설정 저장, 자격 증명 저장, 연결 테스트.

![WebDAV Sync Settings Page](/img/docs/preferences_WebDAV-sync.png)

## 런타임 데이터

지속성 루트 디렉토리, 런타임 사용량 및 무결성 진단을 표시합니다.

- **지속성 루트**: `<Zotero Data>/zotero-agents/data/`
- **Synthesis 표준 저장소**: 로컬 SQLite + 영구 패키지
- **디렉토리 크기**: data/, cache/, logs/, tmp/ 등
- **진단 패널**: 파일시스템 문제 감지 (예: WAL 파일이 정리되지 않음)

참고: Synthesis 표준 저장소 및 상태 데이터베이스는 진단 전용이며 여기에서 정리할 수 없습니다.

![Runtime Data and Persistence Management Page](/img/docs/preferences_storage-and-persistence.png)

## 일반 옵션

- **기본 백엔드**: 사용할 기본 백엔드 인스턴스 선택
- **로컬 백엔드 자동 시작**: Zotero 시작 시 Skill-Runner를 자동으로 시작
- **로그 레벨**: 로깅 레벨 설정
- **내장 마크다운 리더 사용**: 체크하면 `.md` 첨부를 더블클릭하여 내장 리더에서 열립니다. 체크를 해제하면 시스템 기본 열림 프로그램이 복원됩니다 (기본적으로 활성화됨)

## 설정 탐색 경로

```
Zotero → 설정 → Zotero Agents
├── Workflow 설정
│   ├── Workflow 디렉토리
│   ├── 스킬 디렉토리
│   ├── 공식 Workflow 패키지
│   └── 런타임 설정
├── Host Bridge
│   ├── 서비스 시작/중지
│   ├── 네트워크 및 포트
│   └── 토큰 관리
├── SkillRunner 로컬 백엔드
├── 백엔드 매니저
├── WebDAV 동기화
├── 런타임 데이터
└── 일반 옵션
```
