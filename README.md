# PRISM

**PR Insight & Story Maker** — GitHub PR 데이터를 수집하여 포트폴리오용 STAR/CARE 서술을 자동 생성하는 CLI 도구.

## Architecture

```
GitHub API ──→ Collectors ──→ Storage (JSONL/JSON/diff)
                                  │
                                  ▼
                         LLM (Claude Code/Claude API/OpenAI)
                                  │
                          ┌───────┴───────┐
                          ▼               ▼
                     FACT Cards     STAR/CARE Narratives
                                          │
                                          ▼
                                   Markdown Export
```

### Data Flow

1. **collect-index** — GitHub Search API로 PR 메타데이터 수집 → `pr_index.jsonl`
2. **collect-detail** — GraphQL로 PR 상세 (body, commits, files, reviews) 수집 → `{owner}/{repo}/pr_detail/*.json`
3. **collect-diff** — REST API로 PR diff 수집 → `{owner}/{repo}/pr_diff/*.diff`
4. **generate-facts** — LLM으로 각 PR의 FACT 카드 생성 → `{owner}/{repo}/fact_cards/*.json`
5. **generate-narratives** — FACT 카드를 클러스터링하여 STAR/CARE 서술 생성 → `narratives/`
6. **export-markdown** — STAR/CARE 서술을 마크다운 포트폴리오 문서로 내보내기 → `portfolio.md`

## Setup

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your tokens
```

### Using Claude Code CLI (Claude Max/Pro)

If you have a Claude Max/Pro subscription (no API key), you can use the Claude Code CLI as the LLM provider:

```bash
# Install Claude Code CLI
npm install -g @anthropic-ai/claude-code

# Login (run once)
claude

# Set provider in .env
LLM_PROVIDER=claude-code
# No ANTHROPIC_API_KEY needed!
```

### Required Environment Variables

| Variable | Description |
|---|---|
| `GITHUB_TOKEN` | GitHub Personal Access Token |
| `LLM_PROVIDER` | `anthropic`, `openai`, or `claude-code` (default: `anthropic`) |
| `ANTHROPIC_API_KEY` | Required if provider is `anthropic` (not needed for `claude-code`) |
| `OPENAI_API_KEY` | Required if provider is `openai` (not needed for `claude-code`) |

### Optional Variables

| Variable | Description |
|---|---|
| `LLM_MODEL` | Override default model |
| `DATA_DIR` | Output directory (default: `./data`) |

## Usage

### Individual Commands

```bash
# 1. Collect PR index (여러 repo 지원)
pnpm prism collect-index --repo owner/repo1 --repo owner/repo2 --author <username>

# 2. Collect PR details (owner/repo는 pr_index.jsonl에서 자동 참조)
pnpm prism collect-detail

# 3. Collect PR diffs
pnpm prism collect-diff

# 4. Generate FACT cards
pnpm prism generate-facts --lang Korean

# 5. Generate STAR/CARE narratives
pnpm prism generate-narratives --lang Korean

# 6. Export markdown portfolio
pnpm prism export-markdown --output ./my-portfolio.md
```

### Full Pipeline

```bash
# 단일 repo
pnpm prism run-all --repo owner/repo --author <username> --lang Korean

# 여러 repo를 하나의 포트폴리오로
pnpm prism run-all --repo owner/repo1 --repo owner/repo2 --author <username> --lang Korean
```

### Options

- `--repo <owner/repo>` — Repository in `owner/repo` format (반복 가능)
- `--state <state>` — PR state filter: `merged`, `open`, `closed` (default: `merged`)
- `--lang <language>` — Output language for FACT cards and narratives (e.g., `Korean`, `Japanese`, `English`). Omit for English.
- `--output <path>` — Markdown export output path (default: `data/portfolio.md`)

## Output Structure

```
data/
├── pr_index.jsonl                    # 통합 PR 인덱스 (owner/repo 포함)
├── {owner}/{repo}/
│   ├── pr_detail/{number}.json       # Full PR details
│   ├── pr_diff/{number}.diff         # PR diffs
│   └── fact_cards/{number}.json      # FACT cards
├── narratives/
│   ├── star.json                     # STAR narratives
│   └── care.json                     # CARE narratives
└── portfolio.md                      # Exported markdown portfolio
```

## FACT Card Schema

Each PR is summarized into a structured FACT card:

```json
{
  "prNumber": 123,
  "title": "Add caching layer for API responses",
  "summary": "...",
  "problem": "...",
  "approach": "...",
  "impact": "...",
  "technologies": ["Redis", "Express middleware"],
  "complexity": "medium",
  "category": "feature",
  "keywords": ["caching", "performance", "api"]
}
```

## STAR/CARE Narratives

FACT cards are clustered by theme and transformed into portfolio narratives:

- **STAR**: Situation → Task → Action → Result
- **CARE**: Context → Action → Result → Evolution

## Development

```bash
# TypeScript 컴파일 (dist/ 생성, 사용 시 필수 아님)
pnpm build
```
