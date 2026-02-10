import { Octokit } from "@octokit/rest";
import { getConfig } from "../config.js";

let _client: Octokit | null = null;

export function getRestClient(): Octokit {
  if (!_client) {
    _client = new Octokit({ auth: getConfig().GITHUB_TOKEN });
  }
  return _client;
}

export async function fetchPrDiff(owner: string, repo: string, prNumber: number): Promise<string> {
  const client = getRestClient();
  const response = await client.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
    mediaType: { format: "diff" },
  });
  // When requesting diff format, response.data is a string
  return response.data as unknown as string;
}
