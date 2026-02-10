import { gql } from "../github/graphql-client.js";
import { PR_DETAIL_QUERY } from "../github/queries.js";
import type { PullRequestDetailResponse } from "../github/types.js";
import type { PrDetail, PrComment } from "../types/pr.js";
import { readPrIndex, writePrDetail, prDetailExists } from "../storage/storage.js";

export async function collectPrDetails(
  owner: string,
  repo: string,
  onProgress?: (current: number, total: number, prNumber: number) => void,
): Promise<PrDetail[]> {
  const index = readPrIndex();
  if (index.length === 0) {
    throw new Error("PR index is empty. Run collect-index first.");
  }

  const results: PrDetail[] = [];

  for (let i = 0; i < index.length; i++) {
    const pr = index[i];

    if (prDetailExists(pr.number)) {
      onProgress?.(i + 1, index.length, pr.number);
      continue;
    }

    const response = await gql<PullRequestDetailResponse>(PR_DETAIL_QUERY, {
      owner,
      repo,
      number: pr.number,
    });

    const raw = response.repository.pullRequest;

    // Flatten review thread comments into the comments array
    const reviewComments: PrComment[] = raw.reviewThreads.nodes.flatMap((thread) =>
      thread.comments.nodes.map((c) => ({
        author: c.author?.login ?? "unknown",
        body: c.body,
        createdAt: c.createdAt,
        path: c.path,
        line: c.line ?? undefined,
      })),
    );

    const detail: PrDetail = {
      number: raw.number,
      title: raw.title,
      body: raw.body,
      url: raw.url,
      state: raw.state,
      createdAt: raw.createdAt,
      mergedAt: raw.mergedAt,
      author: raw.author?.login ?? "unknown",
      baseRefName: raw.baseRefName,
      headRefName: raw.headRefName,
      additions: raw.additions,
      deletions: raw.deletions,
      changedFiles: raw.changedFiles,
      labels: raw.labels.nodes.map((l) => l.name),
      commits: raw.commits.nodes.map((c) => ({
        oid: c.commit.oid,
        message: c.commit.message,
        authoredDate: c.commit.authoredDate,
      })),
      files: raw.files.nodes.map((f) => ({
        path: f.path,
        additions: f.additions,
        deletions: f.deletions,
        changeType: f.changeType,
      })),
      reviews: raw.reviews.nodes.map((r) => ({
        author: r.author?.login ?? "unknown",
        state: r.state,
        body: r.body,
        submittedAt: r.submittedAt,
      })),
      comments: [
        ...raw.comments.nodes.map((c) => ({
          author: c.author?.login ?? "unknown",
          body: c.body,
          createdAt: c.createdAt,
        })),
        ...reviewComments,
      ],
    };

    writePrDetail(detail);
    results.push(detail);
    onProgress?.(i + 1, index.length, pr.number);
  }

  return results;
}
