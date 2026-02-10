import type { LlmProvider } from "./provider.js";
import { FactCardSchema, type FactCard } from "../types/fact-card.js";
import { FACT_CARD_SYSTEM_PROMPT, buildFactCardUserPrompt } from "../prompts/fact-card.js";
import {
  readPrIndex,
  readPrDetail,
  readPrDiff,
  writeFactCard,
  factCardExists,
} from "../storage/storage.js";

export async function generateFactCards(
  provider: LlmProvider,
  onProgress?: (current: number, total: number, prNumber: number) => void,
): Promise<FactCard[]> {
  const index = readPrIndex();
  if (index.length === 0) {
    throw new Error("PR index is empty. Run collect-index first.");
  }

  const results: FactCard[] = [];

  for (let i = 0; i < index.length; i++) {
    const pr = index[i];

    if (factCardExists(pr.number)) {
      onProgress?.(i + 1, index.length, pr.number);
      continue;
    }

    const detail = readPrDetail(pr.number);
    if (!detail) {
      console.warn(`  Skipping PR #${pr.number}: no detail data found`);
      onProgress?.(i + 1, index.length, pr.number);
      continue;
    }

    const diff = readPrDiff(pr.number);

    const userPrompt = buildFactCardUserPrompt({
      prNumber: detail.number,
      title: detail.title,
      body: detail.body,
      files: detail.files,
      commits: detail.commits,
      reviews: detail.reviews,
      comments: detail.comments,
      diff,
      additions: detail.additions,
      deletions: detail.deletions,
    });

    const raw = await provider.generate([
      { role: "system", content: FACT_CARD_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ]);

    // Extract JSON from response (handle markdown code blocks)
    const jsonStr = raw.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();

    try {
      const parsed = JSON.parse(jsonStr);
      const card = FactCardSchema.parse(parsed);
      writeFactCard(pr.number, card);
      results.push(card);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`  Warning: Failed to parse FACT card for PR #${pr.number}: ${message}`);
    }

    onProgress?.(i + 1, index.length, pr.number);
  }

  return results;
}
