import { graphql } from "@octokit/graphql";
import { getConfig } from "../config.js";

let _client: typeof graphql | null = null;

export function getGraphQLClient(): typeof graphql {
  if (!_client) {
    _client = graphql.defaults({
      headers: {
        authorization: `token ${getConfig().GITHUB_TOKEN}`,
      },
    });
  }
  return _client;
}

export async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const client = getGraphQLClient();
  return client<T>(query, variables);
}
