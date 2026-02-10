export const PR_SEARCH_QUERY = `
  query ($searchQuery: String!, $first: Int!, $after: String) {
    search(query: $searchQuery, type: ISSUE, first: $first, after: $after) {
      issueCount
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        ... on PullRequest {
          number
          title
          url
          state
          createdAt
          mergedAt
          additions
          deletions
          changedFiles
          baseRefName
          headRefName
          labels(first: 10) {
            nodes { name }
          }
        }
      }
    }
  }
`;

export const PR_DETAIL_QUERY = `
  query ($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        number
        title
        body
        url
        state
        createdAt
        mergedAt
        author { login }
        baseRefName
        headRefName
        additions
        deletions
        changedFiles
        labels(first: 10) {
          nodes { name }
        }
        commits(first: 100) {
          nodes {
            commit {
              oid
              message
              authoredDate
            }
          }
        }
        files(first: 100) {
          nodes {
            path
            additions
            deletions
            changeType
          }
        }
        reviews(first: 50) {
          nodes {
            author { login }
            state
            body
            submittedAt
          }
        }
        comments(first: 50) {
          nodes {
            author { login }
            body
            createdAt
          }
        }
        reviewThreads(first: 50) {
          nodes {
            comments(first: 20) {
              nodes {
                author { login }
                body
                createdAt
                path
                line
              }
            }
          }
        }
      }
    }
  }
`;
