import { gql } from "../github/graphql-client.js";
import { PR_SEARCH_QUERY } from "../github/queries.js";
import type { SearchResponse } from "../github/types.js";
import type { PrIndex } from "../types/pr.js";
import { writePrIndex } from "../storage/storage.js";

interface CollectIndexOptions {
  owner: string;
  repo: string;
  author: string;
  state?: string;
  maxPages?: number;
}

export async function collectPrIndex(
  options: CollectIndexOptions,
  onProgress?: (count: number, total: number) => void,
): Promise<PrIndex[]> {
  const { owner, repo, author, state = "merged", maxPages = 20 } = options;

  const searchQuery = `repo:${owner}/${repo} type:pr author:${author} is:${state}`;
  const allEntries: PrIndex[] = [];
  let cursor: string | null = null;
  let page = 0;

  while (page < maxPages) {
    const response: SearchResponse = await gql<SearchResponse>(PR_SEARCH_QUERY, {
      searchQuery,
      first: 50,
      after: cursor,
    });

    const { nodes, pageInfo, issueCount } = response.search;

    for (const node of nodes) {
      const entry: PrIndex = {
        number: node.number,
        title: node.title,
        url: node.url,
        state: node.state,
        createdAt: node.createdAt,
        mergedAt: node.mergedAt,
        additions: node.additions,
        deletions: node.deletions,
        changedFiles: node.changedFiles,
        baseRefName: node.baseRefName,
        headRefName: node.headRefName,
        labels: node.labels.nodes.map((l) => l.name),
      };
      allEntries.push(entry);
    }

    onProgress?.(allEntries.length, issueCount);

    if (!pageInfo.hasNextPage) break;
    cursor = pageInfo.endCursor;
    page++;
  }

  writePrIndex(allEntries);
  return allEntries;
}
