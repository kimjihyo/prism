# PRISM

**PR Insight & Story Maker** — GitHub PR 데이터를 수집하여 포트폴리오용 STAR/CARE 서술을 자동 생성하는 CLI 도구.

## Architecture

```
GitHub API ──→ Collectors ──→ Storage (JSONL/JSON/diff)
                                  │
                                  ▼
                         LLM (Claude/OpenAI)
                                  │
                          ┌───────┴───────┐
                          ▼               ▼
                     FACT Cards     STAR/CARE Narratives
```

### Data Flow

1. **collect-index** — GitHub Search API로 PR 메타데이터 수집 → `pr_index.jsonl`
2. **collect-detail** — GraphQL로 PR 상세 (body, commits, files, reviews) 수집 → `pr_detail/*.json`
3. **collect-diff** — REST API로 PR diff 수집 → `pr_diff/*.diff`
4. **generate-facts** — LLM으로 각 PR의 FACT 카드 생성 → `fact_cards/*.json`
5. **generate-narratives** — FACT 카드를 클러스터링하여 STAR/CARE 서술 생성 → `narratives/`

## Setup

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your tokens
```

### Required Environment Variables

| Variable | Description |
|---|---|
| `GITHUB_TOKEN` | GitHub Personal Access Token |
| `LLM_PROVIDER` | `anthropic` or `openai` (default: `anthropic`) |
| `ANTHROPIC_API_KEY` | Required if provider is `anthropic` |
| `OPENAI_API_KEY` | Required if provider is `openai` |

### Optional Variables

| Variable | Description |
|---|---|
| `LLM_MODEL` | Override default model |
| `DATA_DIR` | Output directory (default: `./data`) |

## Usage

### Individual Commands

```bash
# 1. Collect PR index
pnpm prism collect-index --owner <owner> --repo <repo> --author <username>

# 2. Collect PR details
pnpm prism collect-detail --owner <owner> --repo <repo>

# 3. Collect PR diffs
pnpm prism collect-diff --owner <owner> --repo <repo>

# 4. Generate FACT cards
pnpm prism generate-facts

# 5. Generate STAR/CARE narratives
pnpm prism generate-narratives
```

### Full Pipeline

```bash
pnpm prism run-all --owner <owner> --repo <repo> --author <username>
```

### Options

- `--state <state>` — PR state filter: `merged`, `open`, `closed` (default: `merged`)

## Output Structure

```
data/
├── pr_index.jsonl          # PR metadata (one JSON per line)
├── pr_detail/
│   └── {number}.json       # Full PR details
├── pr_diff/
│   └── {number}.diff       # PR diffs
├── fact_cards/
│   └── {number}.json       # FACT cards (structured PR summaries)
└── narratives/
    ├── star.json            # STAR narratives
    └── care.json            # CARE narratives
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
