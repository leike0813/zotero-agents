# 시작하기

## 1. 공식 Workflow 패키지 설치

플러그인 자체에는 비즈니스 로직이 포함되어 있지 않습니다. 플러그인 설치 후 먼저 공식 Workflow 패키지를 설치해야 합니다.

1. Zotero 항목을 우클릭 → **Zotero Agents** → **📦 공식 Workflow 패키지 설치**
2. 다운로드 및 설치가 완료될 때까지 대기
3. 설치 성공 후, 모든 공식 Workflow가 대시보드에 표시됩니다

**Zotero → 설정 → Zotero Agents**에서 언제든지 공식 패키지를 설치하거나 업데이트할 수 있습니다.

## 2. 백엔드 구성

### ACP 백엔드 (권장)

가장 권장되는 방식입니다. 머신에 ACP 호환 에이전트 도구가 설치되어 있다면 추가 설정이 전혀 필요하지 않습니다.

1. **도구 → [백엔드 매니저](#doc/backends%2Fbackend-manager)** 열기
2. **ACP** 탭으로 전환
3. **프리셋에서 추가** 드롭다운에서 에이전트 도구 선택 (Codex / OpenCode / Claude Code 등)
4. 프리셋이 명령어를 자동으로 채웁니다. 오른쪽 하단의 **저장** 클릭

**에이전트 도구를 처음 사용하나요?** 각 도구의 공식 문서를 참조하여 설치하세요.

| 에이전트 | 설치 가이드 |
|---------|------------|
| **OpenCode** | [opencode.ai 문서](https://opencode.ai/docs) |
| **Codex** | [OpenAI Codex 문서](https://platform.openai.com/docs) |
| **Claude Code** | [Anthropic 문서](https://docs.anthropic.com/en/docs/claude-code) |
| **Gemini CLI** | [Google 문서](https://github.com/google-gemini/gemini-cli) |
| **Qwen Code** | [Alibaba Cloud 문서](https://help.aliyun.com/zh/model-studio/qwen-code) |

→ 자세한 내용은 [ACP 백엔드 구성](#doc/backends%2Facp)을 참조하세요

### MinerU 백엔드 (PDF 파싱용)

MinerU Workflow는 PDF를 Markdown으로 변환할 수 있으며, 이후 모든 문헌 분석을 위한 이상적인 전처리 단계입니다. 구성은 간단합니다.

1. [mineru.net](https://mineru.net)에 접속하여 계정을 등록하고, **API → API 관리**에서 API 토큰을 발급받습니다
2. **도구 → [백엔드 매니저](#doc/backends%2Fbackend-manager)** 열기
3. **Generic HTTP** 탭으로 전환, **Generic HTTP 추가** 클릭
4. 입력: 표시 이름 `MinerU Official` · Base URL `https://mineru.net` · 인증 `bearer` · 인증 토큰: API 토큰 붙여넣기 · 타임아웃 `600000`
5. 오른쪽 하단의 **저장** 클릭

→ 자세한 내용은 [MinerU 사용 가이드](#doc/workflows%2Fmineru)를 참조하세요

### 대안: Docker로 배포된 Skill-Runner

지속적인 백그라운드 실행이나 LAN 공유가 필요한 경우, [Docker로 Skill-Runner를 배포](#doc/backends%2Fskill-runner#recommended-docker-persistent-deployment)할 수 있습니다. 배포 후 SkillRunner 탭에서 백엔드 인스턴스를 추가하세요.

> 자세한 운영 지침은 [백엔드 매니저](#doc/backends%2Fbackend-manager)를 참조하세요.

## 3. 전체 Workflow

아래는 완전한 엔드투엔드 Workflow입니다. 각 단계를 순서대로 시도해 보는 것을 권장합니다. 먼저 라이브러리에서 PDF 첨부가 있는 논문을 선택하세요.

### 1단계: PDF → Markdown (MinerU)

이 논문(또는 PDF 첨부 파일 직접)을 우클릭하고 **Zotero Agents → MinerU**를 선택하세요. 잠시 후 논문 내용의 `.md` 파일이 PDF와 같은 디렉토리에 생성됩니다.

### 2단계: 내장 마크다운 리더 사용

Zotero 첨부 파일 목록에서 새로 생성된 `.md` 파일을 찾아 **더블클릭하여 내장 리더에서 엽니다** — 아웃라인 탐색, 검색, 수학 공식 렌더링 및 코드 구문 하이라이팅을 제공합니다. 내장 리더를 사용하고 싶지 않다면 환경설정에서 비활성화하고 시스템 기본 열림 프로그램으로 되돌릴 수 있습니다.

→ 자세한 내용은 [내장 마크다운 리더](#doc/markdown-reader)를 참조하세요

### 3단계: 문헌 분석 실행

이 논문(또는 `.md` 첨부 파일 직접)을 우클릭하고 **Zotero Agents → 문헌 분석**을 선택하세요. 에이전트가 자동으로 세 개의 아티팩트를 생성합니다. 완료되면 항목 아래에 세 개의 노트 첨부가 표시됩니다.

| 노트 | 내용 |
|------|------|
| **다이제스트** | 논문 다이제스트 — 연구 배경, 방법, 결과 및 결론 |
| **참고문헌** | 구조화된 참고문헌 — 표 형식의 인용 목록 |
| **인용 분석** | 인용 분석 보고서 — 인용 컨텍스트 및 인용 의도 분류 |

→ 자세한 내용은 [문헌 분석](#doc/workflows%2Fliterature-analysis)을 참조하세요

### 4단계: 대화형 문헌 해설

이 논문에 대해 질문이 있으면 우클릭하고 **Zotero Agents → 문헌 해설**을 선택하세요. 사이드바가 자동으로 채팅 패널을 열며, 논문 내용에 대해 에이전트와 자유롭게 대화할 수 있습니다. 에이전트의 답변은 검증 게이트웨이를 거치므로 허위 답변을 걱정할 필요가 없습니다. 대화 후 Q&A 기록이 학습 노트로 생성됩니다.

→ 자세한 내용은 [문헌 해설](#doc/workflows%2Fliterature-explainer)을 참조하세요

### 5단계: 심층 독서

중요한 논문을 철저하고 체계적으로 읽어야 할 때, 우클릭하고 **Zotero Agents → 심층 독서**를 선택하세요. 에이전트가 세련된 독립형 HTML 문서를 생성합니다 — 섹션 분석, 핵심 개념, 참고문헌 및 이중 언어 번역을 포함합니다. 라이브러리 정보로 보강되며(가능한 경우), 이 문서는 더 넓은 연구 컨텍스트, 관련 개념 및 핵심 질문도 담게 됩니다.

→ 자세한 내용은 [심층 독서](#doc/workflows%2Fliterature-deep-reading)를 참조하세요

### 6단계: 토픽 통합 — 개별 논문에서 큰 그림으로

라이브러리가 일정 규모에 도달하고 관련 논문이 모두 문헌 분석 및 태그 정규화를 거친 후, 토픽 통합을 생성할 수 있습니다.

대시보드에서 **토픽 통합 생성**을 실행하고 연구 방향에 대한 설명을 입력하면, 에이전트가 자동으로 라이브러리에서 관련 논문을 식별하고 매우 엄격하고 정확하며 포괄적인 통합 보고서를 생성합니다. 이 보고서는 전적으로 라이브러리 콘텐츠를 기반으로 작성되므로 일반적인 AI 응답보다 훨씬 정확하고 신뢰할 수 있습니다.

→ 자세한 내용은 [토픽 통합](#doc/workflows%2Ftopic-synthesis)을 참조하세요

## 다음 단계

- **일괄 처리**: 라이브러리의 논문에 대해 [문헌 분석](#doc/workflows%2Fliterature-analysis)을 일괄 실행하여 통합의 기반을 구축하세요
- **태그 시스템**: [Tag Bootstrapper](#doc/workflows%2Ftag-bootstrapper)를 사용하여 제어된 어휘를 만들고 메타데이터를 표준화하세요
- **그래프 탐색**: [Synthesis Workbench](#doc/synthesis%2Findex)에서 인용 네트워크를 시각화하세요
- **커스텀 개발**: [커스텀 Workflow](#doc/workflows%2Fcustom%2Findex)를 참조하여 자체 Workflow를 생성하세요
- **문제 보고**: [GitHub](https://github.com/leike0813/zotero-agents/issues) 또는 [Gitee](https://gitee.com/leike0813/zotero-agents/issues)에 문제를 보고하세요
