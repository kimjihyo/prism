# CLAUDE.md

## Project Overview

PRISM (PR Insight & Story Maker) — GitHub PR 데이터를 수집하여 포트폴리오용 STAR/CARE 내러티브를 자동 생성하는 TypeScript CLI 도구.

## Commands

```bash
pnpm build          # TypeScript 컴파일 (tsc → dist/)
pnpm prism <cmd>    # CLI 실행 (tsx로 직접 실행)
```

테스트 프레임워크는 아직 없음. 변경 후 `pnpm build`로 타입 체크.

## Architecture

```
src/
├── cli.ts                          # CLI 진입점 (commander)
├── config.ts                       # 환경 변수 검증 (zod)
├── collector/                      # GitHub 데이터 수집
│   ├── index-collector.ts          # PR 목록 수집 (Search API)
│   ├── detail-collector.ts         # PR 상세 수집 (GraphQL)
│   └── diff-collector.ts           # PR diff 수집 (REST)
├── github/                         # GitHub API 클라이언트
│   ├── graphql-client.ts
│   ├── rest-client.ts
│   ├── queries.ts                  # GraphQL 쿼리 정의
│   └── types.ts                    # API 응답 타입
├── llm/                            # LLM 연동
│   ├── provider.ts                 # 추상 인터페이스
│   ├── anthropic.ts
│   ├── openai.ts
│   ├── fact-generator.ts           # FACT 카드 생성
│   └── narrative-generator.ts      # STAR/CARE 내러티브 생성
├── prompts/                        # LLM 프롬프트 빌더
│   ├── fact-card.ts
│   └── narrative.ts
├── storage/                        # 파일 I/O
│   └── storage.ts
├── export/                         # 내보내기
│   └── markdown.ts
└── types/                          # 데이터 타입 (Zod 스키마 포함)
    ├── pr.ts
    ├── fact-card.ts
    └── narrative.ts
```

### Data Flow

`collect-index` → `collect-detail` → `collect-diff` → `generate-facts` → `generate-narratives` → `export-markdown`

`run-all` 커맨드가 이 전체 파이프라인을 순서대로 실행.

### Storage Layout

```
data/
├── pr_index.jsonl                    # 통합 인덱스 (owner/repo 필드 포함)
├── {owner}/{repo}/pr_detail/*.json   # repo별 PR 상세
├── {owner}/{repo}/pr_diff/*.diff     # repo별 diff
├── {owner}/{repo}/fact_cards/*.json  # repo별 FACT 카드
├── narratives/star.json              # STAR 내러티브
├── narratives/care.json              # CARE 내러티브
└── portfolio.md                      # 마크다운 포트폴리오
```

`collect-detail`, `collect-diff`, `generate-facts`는 `pr_index.jsonl`에서 owner/repo를 읽어 사용. CLI에서 별도 인자 불필요.

## Key Conventions

- **ESM only**: `"type": "module"`, 임포트에 `.js` 확장자 필수 (예: `import { foo } from "./bar.js"`)
- **Strict TypeScript**: `strict: true`, target ES2022, module Node16
- **Zod v4**: `import { z } from "zod/v4"` (v4 서브패스 임포트)
- **패키지 매니저**: pnpm (v10)
- **CLI 프레임워크**: commander, ora (스피너), chalk (색상), @inquirer/prompts (대화형 선택)
- **Multi-repo**: `--repo owner/repo` 형식으로 반복 가능. 모든 데이터는 owner/repo로 네임스페이스됨
- **LLM 응답 파싱**: JSON 응답에서 마크다운 코드블록 제거 후 파싱 (````json ... ````)
- **진행 표시**: 모든 수집/생성 함수에 `onProgress` 콜백 패턴 사용
- **환경 변수**: `.env` 파일 사용, `config.ts`에서 zod로 검증. `.env` 파일은 절대 커밋하지 않음
- **커밋 메시지**: `feat:`, `fix:` 등 conventional commits 스타일
