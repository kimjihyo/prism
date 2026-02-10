import { fetchPrDiff } from "../github/rest-client.js";
import { readPrIndex, writePrDiff, prDiffExists } from "../storage/storage.js";

const MAX_DIFF_SIZE = 1_000_000; // 1MB limit per diff

export async function collectPrDiffs(
  owner: string,
  repo: string,
  onProgress?: (current: number, total: number, prNumber: number) => void,
): Promise<number> {
  const index = readPrIndex();
  if (index.length === 0) {
    throw new Error("PR index is empty. Run collect-index first.");
  }

  let collected = 0;

  for (let i = 0; i < index.length; i++) {
    const pr = index[i];

    if (prDiffExists(pr.number)) {
      onProgress?.(i + 1, index.length, pr.number);
      continue;
    }

    try {
      const diff = await fetchPrDiff(owner, repo, pr.number);

      if (diff.length > MAX_DIFF_SIZE) {
        // Truncate very large diffs with a marker
        const truncated = diff.slice(0, MAX_DIFF_SIZE) + "\n\n--- TRUNCATED (exceeded 1MB) ---\n";
        writePrDiff(pr.number, truncated);
      } else {
        writePrDiff(pr.number, diff);
      }

      collected++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`  Warning: Failed to fetch diff for PR #${pr.number}: ${message}`);
    }

    onProgress?.(i + 1, index.length, pr.number);
  }

  return collected;
}
