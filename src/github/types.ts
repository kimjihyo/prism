export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

export interface SearchNode {
  number: number;
  title: string;
  url: string;
  state: string;
  createdAt: string;
  mergedAt: string | null;
  additions: number;
  deletions: number;
  changedFiles: number;
  baseRefName: string;
  headRefName: string;
  labels: { nodes: { name: string }[] };
}

export interface SearchResponse {
  search: {
    issueCount: number;
    pageInfo: PageInfo;
    nodes: SearchNode[];
  };
}

export interface FileNode {
  path: string;
  additions: number;
  deletions: number;
  changeType: string;
}

export interface CommitNode {
  commit: {
    oid: string;
    message: string;
    authoredDate: string;
  };
}

export interface ReviewNode {
  author: { login: string } | null;
  state: string;
  body: string;
  submittedAt: string;
}

export interface CommentNode {
  author: { login: string } | null;
  body: string;
  createdAt: string;
}

export interface ReviewThreadCommentNode {
  author: { login: string } | null;
  body: string;
  createdAt: string;
  path: string;
  line: number | null;
}

export interface PullRequestDetailResponse {
  repository: {
    pullRequest: {
      number: number;
      title: string;
      body: string;
      url: string;
      state: string;
      createdAt: string;
      mergedAt: string | null;
      author: { login: string } | null;
      baseRefName: string;
      headRefName: string;
      additions: number;
      deletions: number;
      changedFiles: number;
      labels: { nodes: { name: string }[] };
      commits: { nodes: CommitNode[] };
      files: { nodes: FileNode[] };
      reviews: { nodes: ReviewNode[] };
      comments: { nodes: CommentNode[] };
      reviewThreads: {
        nodes: {
          comments: { nodes: ReviewThreadCommentNode[] };
        }[];
      };
    };
  };
}
