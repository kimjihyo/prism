import type { LlmProvider } from "./provider.js";
import type { FactCard } from "../types/fact-card.js";
import {
  StarNarrativeSchema,
  CareNarrativeSchema,
  type StarNarrative,
  type CareNarrative,
  type NarrativeOutput,
} from "../types/narrative.js";
import {
  buildClusterSystemPrompt,
  buildClusterUserPrompt,
  buildStarNarrativeSystemPrompt,
  buildCareNarrativeSystemPrompt,
  buildNarrativeUserPrompt,
} from "../prompts/narrative.js";
import { readAllFactCards, writeNarrative } from "../storage/storage.js";

interface Cluster {
  theme: string;
  prNumbers: number[];
  rationale: string;
}

function parseJson<T>(raw: string): T {
  let jsonStr = raw.replace(/```json?\n?/g, "").replace(/```\n?/g, "").trim();
  // Handle cases where model wraps JSON in surrounding text
  const firstBracket = jsonStr.search(/[\[{]/);
  const lastBracket = Math.max(jsonStr.lastIndexOf("}"), jsonStr.lastIndexOf("]"));
  if (firstBracket !== -1 && lastBracket !== -1) {
    jsonStr = jsonStr.slice(firstBracket, lastBracket + 1);
  }
  return JSON.parse(jsonStr) as T;
}

async function clusterFactCards(provider: LlmProvider, cards: FactCard[], lang?: string): Promise<Cluster[]> {
  const raw = await provider.generate([
    { role: "system", content: buildClusterSystemPrompt(lang) },
    { role: "user", content: buildClusterUserPrompt(cards) },
  ]);
  return parseJson<Cluster[]>(raw);
}

export async function generateNarratives(
  provider: LlmProvider,
  onProgress?: (step: string, current: number, total: number) => void,
  lang?: string,
): Promise<{ star: NarrativeOutput; care: NarrativeOutput }> {
  const allCards = readAllFactCards();
  if (allCards.length === 0) {
    throw new Error("No FACT cards found. Run generate-facts first.");
  }

  const cards = allCards.map((c) => c.card as FactCard);

  // Step 1: Cluster
  onProgress?.("clustering", 0, 1);
  const clusters = await clusterFactCards(provider, cards, lang);
  onProgress?.("clustering", 1, 1);

  // Step 2: Generate STAR narratives
  const starNarratives: StarNarrative[] = [];
  for (let i = 0; i < clusters.length; i++) {
    onProgress?.("star", i + 1, clusters.length);
    const raw = await provider.generate([
      { role: "system", content: buildStarNarrativeSystemPrompt(lang) },
      { role: "user", content: buildNarrativeUserPrompt(clusters[i], cards) },
    ]);
    try {
      const narrative = StarNarrativeSchema.parse(parseJson(raw));
      starNarratives.push(narrative);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`  Warning: Failed to parse STAR for "${clusters[i].theme}": ${message}`);
    }
  }

  // Step 3: Generate CARE narratives
  const careNarratives: CareNarrative[] = [];
  for (let i = 0; i < clusters.length; i++) {
    onProgress?.("care", i + 1, clusters.length);
    const raw = await provider.generate([
      { role: "system", content: buildCareNarrativeSystemPrompt(lang) },
      { role: "user", content: buildNarrativeUserPrompt(clusters[i], cards) },
    ]);
    try {
      const narrative = CareNarrativeSchema.parse(parseJson(raw));
      careNarratives.push(narrative);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`  Warning: Failed to parse CARE for "${clusters[i].theme}": ${message}`);
    }
  }

  const starOutput: NarrativeOutput = {
    generatedAt: new Date().toISOString(),
    narratives: starNarratives,
  };
  const careOutput: NarrativeOutput = {
    generatedAt: new Date().toISOString(),
    narratives: careNarratives,
  };

  writeNarrative("star", starOutput);
  writeNarrative("care", careOutput);

  return { star: starOutput, care: careOutput };
}
