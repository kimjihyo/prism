export interface PrIndex {
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
  labels: string[];
}

export interface PrFile {
  path: string;
  additions: number;
  deletions: number;
  changeType: string;
}

export interface PrCommit {
  oid: string;
  message: string;
  authoredDate: string;
}

export interface PrReview {
  author: string;
  state: string;
  body: string;
  submittedAt: string;
}

export interface PrComment {
  author: string;
  body: string;
  createdAt: string;
  path?: string;
  line?: number;
}

export interface PrDetail {
  number: number;
  title: string;
  body: string;
  url: string;
  state: string;
  createdAt: string;
  mergedAt: string | null;
  author: string;
  baseRefName: string;
  headRefName: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  labels: string[];
  commits: PrCommit[];
  files: PrFile[];
  reviews: PrReview[];
  comments: PrComment[];
}
