import type { FactCard } from "../types/fact-card.js";

export const CLUSTER_SYSTEM_PROMPT = `You are a portfolio strategist. Given a list of FACT cards (structured summaries of GitHub Pull Requests), group them into 3-7 thematic clusters that would make compelling portfolio narratives.

Each cluster should have:
- A clear theme (e.g., "Performance Optimization", "API Design & Integration", "Developer Experience")
- A list of PR numbers that belong to that cluster
- A brief rationale for why these PRs form a coherent story

Output ONLY valid JSON as an array:
[
  {
    "theme": "Theme Name",
    "prNumbers": [1, 2, 3],
    "rationale": "Why these PRs form a coherent narrative"
  }
]

Guidelines:
- A PR can appear in multiple clusters if relevant
- Prioritize clusters that show depth, progression, or impact
- Avoid clusters with only 1 PR unless it's highly significant`;

export function buildClusterUserPrompt(cards: FactCard[]): string {
  const summaries = cards
    .map(
      (c) =>
        `PR #${c.prNumber} [${c.category}/${c.complexity}]: ${c.title}\n  Summary: ${c.summary}\n  Keywords: ${c.keywords.join(", ")}`,
    )
    .join("\n\n");

  return `Here are ${cards.length} FACT cards:\n\n${summaries}\n\nGroup these into thematic clusters.`;
}

export function buildStarNarrativeSystemPrompt(): string {
  return `You are a technical portfolio writer. Given a cluster of FACT cards, write a STAR narrative (Situation, Task, Action, Result) that weaves them into a compelling portfolio story.

Output ONLY valid JSON:
{
  "theme": "Narrative Title",
  "prNumbers": [1, 2, 3],
  "situation": "Context and background (2-3 sentences)",
  "task": "Specific responsibility or goal (2-3 sentences)",
  "action": "What was done and how — be specific about technical decisions (3-5 sentences)",
  "result": "Outcome and impact — quantify where possible (2-3 sentences)"
}

Guidelines:
- Write in first person
- Be specific about technologies and technical decisions
- Quantify impact where data is available
- Show engineering judgment, not just task completion
- The narrative should read naturally as a portfolio bullet or interview answer`;
}

export function buildCareNarrativeSystemPrompt(): string {
  return `You are a technical portfolio writer. Given a cluster of FACT cards, write a CARE narrative (Context, Action, Result, Evolution) that weaves them into a compelling portfolio story.

Output ONLY valid JSON:
{
  "theme": "Narrative Title",
  "prNumbers": [1, 2, 3],
  "context": "Project context and constraints (2-3 sentences)",
  "action": "Technical actions taken — be specific about decisions and tradeoffs (3-5 sentences)",
  "result": "Measurable outcomes (2-3 sentences)",
  "evolution": "Growth, lessons learned, or ongoing impact (2-3 sentences)"
}

Guidelines:
- Write in first person
- Be specific about technologies and technical decisions
- Quantify impact where data is available
- "Evolution" should show growth mindset or long-term thinking
- The narrative should read naturally as a portfolio entry`;
}

export function buildNarrativeUserPrompt(
  cluster: { theme: string; prNumbers: number[]; rationale: string },
  cards: FactCard[],
): string {
  const relevantCards = cards.filter((c) => cluster.prNumbers.includes(c.prNumber));

  const details = relevantCards
    .map(
      (c) =>
        `PR #${c.prNumber}: ${c.title}
  Problem: ${c.problem}
  Approach: ${c.approach}
  Impact: ${c.impact}
  Technologies: ${c.technologies.join(", ")}`,
    )
    .join("\n\n");

  return `## Theme: ${cluster.theme}
Rationale: ${cluster.rationale}

## FACT Cards:
${details}

Write the narrative for this cluster.`;
}
