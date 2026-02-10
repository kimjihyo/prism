# Plan: Claude Code CLI provider 추가 (Claude Max/Pro 지원)

## Context

Claude Max/Pro 구독자는 Anthropic API 키(`sk-ant-...`)를 발급받을 수 없다. 하지만 Claude Code CLI는 Max/Pro 구독 인증을 지원한다. `claude --print` (비대화형 모드)를 서브프로세스로 호출하는 새 LLM provider를 추가하면 API 키 없이 Claude를 사용할 수 있다.

## 변경 파일 요약

| 파일 | 작업 |
|---|---|
| `src/llm/provider.ts` | **수정** — `apiKey`를 optional로 변경 |
| `src/llm/claude-code.ts` | **신규** — `ClaudeCodeProvider` 구현 |
| `src/config.ts` | **수정** — `LLM_PROVIDER` enum에 `"claude-code"` 추가 |
| `src/cli.ts` | **수정** — factory에 `claude-code` 분기 추가 |
| `.env.example` | **수정** — 새 provider 문서화 |
| `README.md` | **수정** — 아키텍처 다이어그램, 환경변수 테이블, Setup 섹션 업데이트 |

## 구현 상세

### `src/llm/claude-code.ts` — ClaudeCodeProvider

- `spawn("claude", ["--print", "--output-format", "text", "--model", model])` 로 CLI 호출
- 시스템 프롬프트 + 유저 프롬프트를 stdin으로 전달 (CLI 인자 파싱 문제 회피)
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`를 환경변수에서 제거하여 구독 인증(Max/Pro)을 사용하도록 강제
- 에러 처리: CLI 미설치(ENOENT), 타임아웃(5분), exit code 비정상 시 stderr+stdout 출력
- stdout/stderr를 Buffer로 수집하여 정확한 에러 메시지 제공

### `src/llm/provider.ts`

```diff
- apiKey: string;
+ apiKey?: string;
```

### `src/config.ts`

```diff
- LLM_PROVIDER: z.enum(["anthropic", "openai"]).default("anthropic"),
+ LLM_PROVIDER: z.enum(["anthropic", "openai", "claude-code"]).default("anthropic"),
```

### `src/cli.ts`

```diff
+ import { ClaudeCodeProvider } from "./llm/claude-code.js";

  function createLlmProvider(): LlmProvider {
    ...
+   if (config.LLM_PROVIDER === "claude-code") {
+     return new ClaudeCodeProvider({ model: config.LLM_MODEL });
+   }
    ...
  }
```

## 사용법

```env
LLM_PROVIDER=claude-code
# ANTHROPIC_API_KEY 불필요!
```

전제조건: `claude` CLI 설치 및 인증 완료 (`claude` 실행 후 로그인)

```bash
# Claude Code CLI 설치
npm install -g @anthropic-ai/claude-code

# 로그인 (최초 1회)
claude
```

## 구현 중 발견된 이슈 및 해결

1. **`--system-prompt` 인자 파싱 실패** — 긴 JSON 포함 시스템 프롬프트를 CLI 인자로 전달 시 파싱 오류. `<system-instructions>` 태그로 감싸 stdin에 합쳐 전달하여 해결.
2. **`Invalid API key` 오류** — `.env`의 더미 `ANTHROPIC_API_KEY`가 서브프로세스에 상속되어 구독 인증 대신 잘못된 API 키 사용. `spawn` 시 환경변수에서 `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`를 삭제하여 해결.
3. **에러 메시지 누락** — `execFile` 콜백에서 stderr가 비어있어 원인 파악 불가. `spawn`으로 교체하고 stdout/stderr를 Buffer로 수집하여 해결.

## 검증 방법

1. `LLM_PROVIDER=claude-code`로 설정 후 `pnpm prism generate-facts` 실행
2. FACT 카드가 정상 생성되는지 확인
3. `pnpm build` — TypeScript 컴파일 에러 없음 확인
