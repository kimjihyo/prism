export const FACT_CARD_SYSTEM_PROMPT = `You are a technical portfolio analyst. Given a GitHub Pull Request's metadata, description, code changes, and review discussions, you produce a structured "FACT card" — a concise factual summary that captures the engineering contribution.

Output ONLY valid JSON matching this schema:
{
  "prNumber": number,
  "title": string,
  "summary": "1-2 sentence summary of the PR's purpose",
  "problem": "What problem or need this PR addresses",
  "approach": "Technical approach taken",
  "impact": "Measurable or qualitative impact",
  "technologies": ["key technologies, frameworks, patterns used"],
  "complexity": "low" | "medium" | "high",
  "category": "feature" | "bugfix" | "refactor" | "infra" | "docs" | "perf" | "test",
  "keywords": ["searchable keywords for clustering"]
}

Guidelines:
- Be specific and factual. Avoid vague statements.
- For "impact", quantify where possible (e.g., "reduced load time by 30%", "affects 5 API endpoints").
- "approach" should highlight the engineering decisions, not just describe what changed.
- "technologies" should include specific libraries, patterns (e.g., "React hooks", "GraphQL", "memoization").
- "keywords" should be useful for grouping related PRs into portfolio narratives.`;

export function buildFactCardUserPrompt(data: {
  prNumber: number;
  title: string;
  body: string;
  files: { path: string; additions: number; deletions: number; changeType: string }[];
  commits: { message: string }[];
  reviews: { author: string; state: string; body: string }[];
  comments: { author: string; body: string }[];
  diff: string | null;
  additions: number;
  deletions: number;
}): string {
  const fileSummary = data.files
    .map((f) => `  ${f.changeType} ${f.path} (+${f.additions}/-${f.deletions})`)
    .join("\n");

  const commitMessages = data.commits.map((c) => `  - ${c.message}`).join("\n");

  const reviewSummary = data.reviews
    .filter((r) => r.body.trim())
    .map((r) => `  [${r.state}] ${r.author}: ${r.body.slice(0, 300)}`)
    .join("\n");

  const commentSummary = data.comments
    .filter((c) => c.body.trim())
    .map((c) => `  ${c.author}: ${c.body.slice(0, 300)}`)
    .join("\n");

  // Truncate diff to avoid token limits
  const diffSection = data.diff
    ? `\n## Diff (truncated)\n\`\`\`\n${data.diff.slice(0, 8000)}\n\`\`\``
    : "";

  return `# PR #${data.prNumber}: ${data.title}

## Description
${data.body || "(no description)"}

## Stats
+${data.additions} / -${data.deletions} across ${data.files.length} files

## Files Changed
${fileSummary || "(none)"}

## Commits
${commitMessages || "(none)"}

## Reviews
${reviewSummary || "(none)"}

## Comments
${commentSummary || "(none)"}
${diffSection}

Produce the FACT card JSON for this PR.`;
}
